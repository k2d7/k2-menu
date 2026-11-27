"""Duroob (دروب) — local desktop server.

Runs on 127.0.0.1 only, serves the web UI from ./web and a small JSON API that
talks to the price sources in providers.py. On Windows it opens the UI in an
Edge app window; it exits by itself a little while after the window is closed.
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import mimetypes
import os
import re
import socket
import sqlite3
import statistics
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import providers as P

APP = "Duroob"
PORT = 8642
FROZEN = getattr(sys, "frozen", False)
BASE = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(BASE, "web")

if os.name == "nt":
    DATA = os.path.join(os.environ.get("APPDATA") or os.path.expanduser("~"), APP)
else:
    DATA = os.path.join(os.path.expanduser("~"), ".duroob")
os.makedirs(DATA, exist_ok=True)
CONFIG = os.path.join(DATA, "config.json")
STORE_NAMES = {"favorites", "watches", "history", "groups", "prefs", "seasons", "baggage", "trips", "holidays"}

with open(os.path.join(WEB, "data", "cities.json"), encoding="utf-8") as f:
    CITIES = {c["id"]: c for c in json.load(f)}
with open(os.path.join(WEB, "data", "airports.json"), encoding="utf-8") as f:
    AIRPORTS = json.load(f)
BACKGROUND = "--background" in sys.argv
# Website mode: the same app served to browsers on the internet (keys come from env vars,
# each visitor's data stays in their own browser).
# Website mode: asked for with --web, or detected on Render (it sets RENDER=true), so a missing flag can't hang a deploy.
WEBSITE = "--web" in sys.argv or os.environ.get("DUROOB_WEB") == "1" or os.environ.get("RENDER") == "true"

_lock = threading.Lock()
_last_ping = time.time()


# ---------------------------------------------------------------- config + store
def load_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        cfg = {}
    if WEBSITE:
        env = lambda k: os.environ.get(k, "").strip()  # pasted keys often carry a stray space or newline
        cfg.update({"tp_token": env("TP_TOKEN"), "serp_key": env("SERP_KEY"), "tp_marker": env("TP_MARKER")})
    return cfg


def save_config(cfg):
    with _lock:
        tmp = CONFIG + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=1)
        os.replace(tmp, CONFIG)


def store_path(name):
    return os.path.join(DATA, f"{name}.json")


def store_get(name, default=None):
    try:
        with open(store_path(name), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def store_put(name, value):
    with _lock:
        tmp = store_path(name) + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False)
        os.replace(tmp, store_path(name))


# ---------------------------------------------------------------- price history
DB = os.path.join(DATA, "prices.sqlite3")


def db():
    con = sqlite3.connect(DB, timeout=10)
    con.execute("CREATE TABLE IF NOT EXISTS obs(kind TEXT, key TEXT, day TEXT, price INTEGER, at INTEGER)")
    con.execute("CREATE INDEX IF NOT EXISTS obs_k ON obs(kind, key, day)")
    return con


def record(kind, key, day, price):
    if not price:
        return
    now = int(time.time())
    with _lock, db() as con:
        last = con.execute(
            "SELECT price, at FROM obs WHERE kind=? AND key=? AND day=? ORDER BY at DESC LIMIT 1",
            (kind, key, day)).fetchone()
        # one observation per hour per item is plenty
        if last and last[0] == int(price) and now - last[1] < 3600:
            return
        con.execute("INSERT INTO obs VALUES(?,?,?,?,?)", (kind, key, day, int(price), now))


def history(kind, key, day=None):
    with db() as con:
        if day:
            rows = con.execute("SELECT at, price FROM obs WHERE kind=? AND key=? AND day=? ORDER BY at",
                               (kind, key, day)).fetchall()
        else:
            rows = con.execute("SELECT at, price FROM obs WHERE kind=? AND key=? ORDER BY at",
                               (kind, key)).fetchall()
    return verdict([{"at": a, "price": p} for a, p in rows])


def verdict(points):
    prices = [p["price"] for p in points]
    if not prices:
        return {"points": [], "verdict": None}
    cur = prices[-1]
    med = statistics.median(prices)
    res = {"points": points[-200:], "min": min(prices), "max": max(prices), "median": round(med), "current": cur}
    if len(prices) < 3:
        res["verdict"] = "few"
    elif cur <= min(prices) * 1.02:
        res["verdict"] = "lowest"
    elif cur < med * 0.95:
        res["verdict"] = "good"
    elif cur > med * 1.08:
        res["verdict"] = "high"
    else:
        res["verdict"] = "normal"
    return res


# ---------------------------------------------------------------- helpers
def months_ahead(n=12):
    today = dt.date.today()
    out = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def add_days(day, n):
    return (dt.date.fromisoformat(day) + dt.timedelta(days=n)).isoformat()


def nights_between(a, b):
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days


def ages(v):
    return [int(x) for x in str(v or "").split(",") if x.strip().isdigit()]


def room_query(adults, child_ages, rooms):
    """Occupants per room to ask the hotel source for (infants under 2 don't need a bed)."""
    beds = adults + len([a for a in child_ages if a >= 2])
    rooms = max(1, rooms or 1)
    return max(1, min(4, -(-beds // rooms))), rooms


def city(cid):
    c = CITIES.get(cid)
    if not c:
        raise P.SourceError("المدينة هذي مو موجودة في قائمة الفنادق.")
    return c


# ---------------------------------------------------------------- API handlers
def api_settings(q, body):
    cfg = load_config()
    if body is not None and not WEBSITE:
        for k in ("tp_token", "tp_marker", "serp_key"):
            if k in body:
                cfg[k] = str(body[k] or "").strip()
        for k in ("home", "use_serp_hotels", "use_serp_flights", "alerts_on", "ntfy_topic"):
            if k in body:
                cfg[k] = body[k]
        save_config(cfg)
    return {
        "has_tp": bool(cfg.get("tp_token")),
        "has_serp": bool(cfg.get("serp_key")),
        "tp_marker": cfg.get("tp_marker", ""),
        "home": cfg.get("home") or "RUH",
        "use_serp_hotels": cfg.get("use_serp_hotels", True),
        "use_serp_flights": cfg.get("use_serp_flights", False),
        "data_dir": None if WEBSITE else DATA,
        "alerts_on": bool(cfg.get("alerts_on")),
        "ntfy_topic": cfg.get("ntfy_topic", ""),
        "autostart": autostart_status(),
        "can_autostart": os.name == "nt" and FROZEN and not WEBSITE,
        "web": WEBSITE,
    }


def _marker(link, cfg):
    if link and cfg.get("tp_marker") and "marker=" not in link:
        link += ("&" if "?" in link else "?") + "marker=" + urllib.parse.quote(cfg["tp_marker"])
    return link


def api_places(q, body):
    return P.places(q.get("term", ""), "en" if q.get("locale") == "en" else "ar")


def api_fx(q, body):
    """Units of each currency per 1 SAR, refreshed twice a day (pegged Gulf rates if offline)."""
    want = ["SAR", "AED", "KWD", "QAR", "BHD", "OMR", "USD", "EUR", "GBP", "EGP", "TRY", "MYR"]
    try:
        d = P.http_json("https://open.er-api.com/v6/latest/USD", ttl=43200, timeout=15)
        usd = d.get("rates") or {}
        if usd.get("SAR"):
            return {"rates": {c: usd[c] / usd["SAR"] for c in want if usd.get(c)}, "live": True}
    except P.SourceError:
        pass
    return {"rates": None, "live": False}


def _avia_link(o, d, dep, ret, adults=1):
    dm = lambda x: x[8:10] + x[5:7] if x else ""
    return f"https://www.aviasales.com/search/{o}{dm(dep)}{d}{dm(ret)}{adults}"


def _nearby_dates(cfg, o, d, depart, ret, direct):
    """No cached ticket for the exact dates: pair two one-ways, or show the closest cached days (±3)."""
    tok = cfg.get("tp_token")
    out = []
    if ret:
        outs = P.tp_search(tok, o, d, depart, None, direct, limit=30)[:5]
        backs = P.tp_search(tok, d, o, ret, None, direct, limit=30)[:3]
        for a in outs:
            for b in backs:
                out.append(dict(a, price=a["price"] + b["price"], return_at=b["departure_at"], return_transfers=b.get("transfers"),
                                duration_back=b.get("duration_to"), combo=True,
                                link=_marker(_avia_link(o, d, depart, ret), cfg), back_link=_marker(b["link"], cfg)))
    if not out:
        month = P.tp_search(tok, o, d, depart[:7], ret[:7] if ret else None, direct, limit=1000)
        day0 = dt.date.fromisoformat(depart)
        for t in month:
            try:
                gap = abs((dt.date.fromisoformat((t["departure_at"] or "")[:10]) - day0).days)
            except ValueError:
                continue
            if gap <= 3:
                out.append(dict(t, near_date=True, link=_marker(t["link"], cfg)))
    return sorted(out, key=lambda t: t["price"])[:20]


def api_flights_search(q, body):
    cfg = load_config()
    o, d = q["origin"].upper(), q["destination"].upper()
    depart, ret = q["depart"], q.get("return") or None
    direct = q.get("direct") == "1"
    adults, children, infants = int(q.get("adults", 1)), int(q.get("children", 0)), int(q.get("infants", 0))
    insights = None
    use_serp = cfg.get("serp_key") and cfg.get("use_serp_flights") and len(depart) == 10
    if use_serp:
        tickets, insights = P.serp_flights(cfg["serp_key"], o, d, depart, ret, adults, children, infants,
                                           int(q.get("cls", 1)), 1 if direct else 0)
    else:
        tickets = P.tp_search(cfg.get("tp_token"), o, d, depart, ret, direct)
        for t in tickets:
            t["link"] = _marker(t["link"], cfg)
        if not tickets and len(depart) == 10:
            tickets = _nearby_dates(cfg, o, d, depart, ret, direct)
        # The free cache has no prices for some routes (Riyadh, for one): use live Google results if a key exists.
        if not tickets and cfg.get("serp_key") and len(depart) == 10:
            try:
                tickets, insights = P.serp_flights(cfg["serp_key"], o, d, depart, ret, adults, children, infants,
                                                   int(q.get("cls", 1)), 1 if direct else 0)
            except P.SourceError:
                tickets = []
    if tickets:
        best = min(tickets, key=lambda t: t["price"])
        day = (best["departure_at"] or depart)[:10] if len(depart) == 10 else depart
        record("flight", f"{o}-{d}{'-RT' if ret else ''}", day, best["price"])
    return {"tickets": tickets, "insights": insights, "no_cache": not tickets}


def api_flights_calendar(q, body):
    cfg = load_config()
    o, d = q["origin"].upper(), q["destination"].upper()
    one_way = q.get("one_way", "1") == "1"
    direct = q.get("direct") == "1"
    key = f"{o}-{d}{'' if one_way else '-RT'}"
    if q.get("year") == "1":
        res = P.tp_year_calendar(cfg.get("tp_token"), o, d, months_ahead(12), one_way, direct)
        out = {}
        for m, t in res.items():
            if t:
                t["link"] = _marker(t["link"], cfg)
                record("flight-month", key, m, t["price"])
            out[m] = t
        return {"months": out}
    nights = int(q["nights"]) if q.get("nights") else None
    days = P.tp_month_calendar(cfg.get("tp_token"), o, d, q["month"], one_way, direct, nights)
    for day, t in days.items():
        t["link"] = _marker(t["link"], cfg)
        record("flight", key, day, t["price"])
    return {"days": days}


def api_flights_anywhere(q, body):
    cfg = load_config()
    o = q["origin"].upper()
    cands = sorted({c["iata"] for c in CITIES.values() if c.get("iata")})
    tickets = P.tp_anywhere(cfg.get("tp_token"), o, q["month"], cands, q.get("one_way", "1") == "1")
    for t in tickets:
        t["link"] = _marker(t["link"], cfg)
    return {"tickets": tickets}


def api_hotels_search(q, body):
    cfg = load_config()
    c = city(q["city"])
    chk_in, chk_out = q["checkin"], q["checkout"]
    adults = int(q.get("adults", 2))
    kids = ages(q.get("children"))
    rooms = int(q.get("rooms", 1))
    per_room, rooms = room_query(adults, kids, rooms)
    hotels = None
    if cfg.get("serp_key") and cfg.get("use_serp_hotels", True):
        query = q.get("near") or f"hotels in {c['en']}"
        try:
            hotels = P.serp_hotels(cfg["serp_key"], query, chk_in, chk_out, adults, kids,
                                   free_cancel=q.get("free_cancel") == "1")
        except P.SourceError:
            hotels = None  # monthly Google quota used up or Google busy: fall back to the free source
    if not hotels:
        hotels = P.xo_search(c["id"], chk_in, chk_out, per_room, rooms)
    google = bool(hotels) and hotels[0].get("source") == "Google Hotels"
    if not google:  # Google's list shows "from" prices; its real price is recorded when the hotel is opened
        for h in hotels:
            record("hotel", h["id"], chk_in, h["night"])
        if hotels:
            record("hotel-city", c["id"], chk_in, min(h["night"] for h in hotels))
    return {"hotels": hotels, "nights": nights_between(chk_in, chk_out), "per_room": per_room, "rooms": rooms,
            "source": hotels[0]["source"] if hotels else None}


def api_hotels_rates(q, body):
    cfg = load_config()
    adults = int(q.get("adults", 2))
    kids = ages(q.get("children"))
    rates = None
    if q.get("token") and cfg.get("serp_key"):
        try:
            rates = P.serp_hotel_detail(cfg["serp_key"], q["token"], q.get("query") or q.get("name", ""),
                                        q["checkin"], q["checkout"], adults, kids)
        except P.SourceError:
            rates = []
        if not rates:
            return {"rates": []}
    else:
        per_room, rooms = room_query(adults, kids, int(q.get("rooms", 1)))
        rates = P.xo_rates(q["id"], q["checkin"], q["checkout"], per_room, 1)
    if rates:
        record("hotel", q["id"], q["checkin"], rates[0]["night"])
    return {"rates": rates}


def _top_hotels(cid, n):
    return P.xo_list(cid, limit=n, sort="popularity")[:n]


def api_hotels_calendar(q, body):
    c = city(q["city"])
    hotels = _top_hotels(c["id"], 6)
    if not hotels:
        return {"days": {}, "months": {}}

    def night_price(day):
        prices = []
        for h in hotels[:4]:
            try:
                r = P.xo_rates(h["id"], day, add_days(day, 1), 2, 1)
                if r:
                    prices.append(r[0]["night"])
            except P.SourceError:
                pass
            if len(prices) >= 3:
                break
        return day, (round(statistics.median(prices)) if prices else None)

    if q.get("year") == "1":
        samples = []
        today = dt.date.today()
        for m in months_ahead(12):
            y, mo = map(int, m.split("-"))
            day = dt.date(y, mo, 15)
            if day <= today:
                day = today + dt.timedelta(days=3)
            samples.append(day.isoformat())
        with ThreadPoolExecutor(6) as ex:
            res = dict(ex.map(night_price, samples))
        months = {}
        for day, price in res.items():
            months[day[:7]] = {"price": price, "sample": day}
            if price:
                record("hotel-city-month", c["id"], day[:7], price)
        return {"months": months, "hotels": [h["name"] for h in hotels[:4]]}

    y, mo = map(int, q["month"].split("-"))
    last = calendar.monthrange(y, mo)[1]
    today = dt.date.today()
    all_days = [dt.date(y, mo, d) for d in range(1, last + 1)]
    days_future = [d for d in all_days if d >= today]
    levels: dict[str, list[str]] = {}
    for h in hotels[:3]:
        try:
            for d, lv in P.xo_heatmap(h["id"], dt.date(y, mo, last).isoformat()).items():
                levels.setdefault(d, []).append(lv)
        except P.SourceError:
            pass
    sample_days = [d.isoformat() for d in days_future[::3]]
    with ThreadPoolExecutor(6) as ex:
        prices = dict(ex.map(night_price, sample_days))
    out = {}
    for d in days_future:
        k = d.isoformat()
        lv = levels.get(k)
        level = max(set(lv), key=lv.count) if lv else None
        out[k] = {"price": prices.get(k), "level": level}
        if prices.get(k):
            record("hotel-city", c["id"], k, prices[k])
    return {"days": out, "hotels": [h["name"] for h in hotels[:3]]}


def api_trip(q, body):
    """Cheapest flight + hotel windows for a destination over some months."""
    cfg = load_config()
    c = city(q["city"])
    o = q["origin"].upper()
    d = (q.get("destination") or c["iata"]).upper()
    nights = max(1, int(q.get("nights", 5)))
    months = [m for m in q.get("months", "").split(",") if re.fullmatch(r"\d{4}-\d{2}", m)] or months_ahead(1)
    adults = int(q.get("adults", 2))
    kids = ages(q.get("children"))
    per_room, rooms = room_query(adults, kids, int(q.get("rooms", 1)))

    cands = []
    for m in months[:6]:
        try:
            days = P.tp_month_calendar(cfg.get("tp_token"), o, d, m, one_way=False, nights=nights)
        except P.SourceError as e:
            if "مفتاح" in str(e) or "NO_TP" in str(e):
                raise
            days = {}
        for day, t in days.items():
            if dt.date.fromisoformat(day) > dt.date.today():
                t["link"] = _marker(t["link"], cfg)
                cands.append((day, t))
    cands.sort(key=lambda x: x[1]["price"])
    cands = cands[:6]
    hotels = _top_hotels(c["id"], 10)

    def window(item):
        day, t = item
        ret = (t.get("return_at") or "")[:10] or add_days(day, nights)
        n = max(1, nights_between(day, ret))
        best = None
        for h in hotels:
            try:
                r = P.xo_rates(h["id"], day, ret, per_room, 1)
            except P.SourceError:
                continue
            if r and (best is None or r[0]["night"] < best["night"]):
                best = {"id": h["id"], "name": h["name"], "rating": h["rating"], "night": r[0]["night"],
                        "site": r[0]["site"], "lat": h["lat"], "lng": h["lng"]}
        return {"depart": day, "return": ret, "nights": n, "flight": t, "hotel": best, "rooms": rooms}

    with ThreadPoolExecutor(3) as ex:
        res = [w for w in ex.map(window, cands) if w["hotel"]]
    return {"windows": res}


# ---------------------------------------------------------------- smarter flights
HUBS = ["DXB", "SHJ", "AUH", "DOH", "BAH", "KWI", "MCT", "IST", "CAI", "AMM", "RUH", "JED", "DMM"]


def _km(a, b):
    A, B = AIRPORTS.get(a), AIRPORTS.get(b)
    if not A or not B:
        return None
    r = 3.141592653589793 / 180
    import math
    x = math.sin((B["lat"] - A["lat"]) * r / 2) ** 2 + math.cos(A["lat"] * r) * math.cos(B["lat"] * r) * math.sin((B["lng"] - A["lng"]) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def nearby(code, radius):
    out = []
    for k in AIRPORTS:
        if k != code:
            d = _km(code, k)
            if d is not None and d <= radius:
                out.append((d, k))
    return [k for _, k in sorted(out)][:4]


def _cheapest(token, o, d, day, ret=None, direct=False):
    try:
        t = P.tp_search(token, o, d, day, ret, direct, limit=30)
    except P.SourceError as e:
        if "مفتاح" in str(e) or "NO_TP" in str(e):
            raise
        return []
    return sorted(t, key=lambda x: x["price"])


def _arrival(t):
    try:
        dep = dt.datetime.fromisoformat(t["departure_at"])
        return dep + dt.timedelta(minutes=int(t.get("duration_to") or t.get("duration") or 0))
    except (TypeError, ValueError):
        return None


def api_flights_smart(q, body):
    """Cheaper ways to make the same trip: two one-ways, self-transfer via a hub, nearby airports."""
    cfg = load_config()
    tok = cfg.get("tp_token")
    o, d, dep = q["origin"].upper(), q["destination"].upper(), q["depart"]
    ret = q.get("return") or None
    out = {"base": None, "mixed": None, "split": [], "nearby": []}
    jobs = {"base": (o, d, dep, ret), "out": (o, d, dep, None)}
    if ret:
        jobs["back"] = (d, o, ret, None)
    for h in HUBS:
        if h in (o, d):
            continue
        jobs[f"h1:{h}"] = (o, h, dep, None)
        jobs[f"h2:{h}"] = (h, d, dep, None)
        jobs[f"h2n:{h}"] = (h, d, add_days(dep, 1), None)
    alt_o = nearby(o, 450)
    alt_d = nearby(d, 260)
    for a in alt_o:
        jobs[f"no:{a}"] = (a, d, dep, None)
        if ret:
            jobs[f"nob:{a}"] = (d, a, ret, None)
    for a in alt_d:
        jobs[f"nd:{a}"] = (o, a, dep, None)
        if ret:
            jobs[f"ndb:{a}"] = (a, o, ret, None)
    with ThreadPoolExecutor(8) as ex:
        res = dict(zip(jobs, ex.map(lambda a: _cheapest(tok, *a), jobs.values())))
    first = lambda k: (res.get(k) or [None])[0]
    base = first("base")
    out["base"] = base
    if ret and first("out") and first("back"):
        a, b = first("out"), first("back")
        out["mixed"] = {"out": a, "back": b, "total": a["price"] + b["price"]}
    one_way_ref = first("out")
    for h in HUBS:
        legs1 = res.get(f"h1:{h}") or []
        legs2 = (res.get(f"h2:{h}") or []) + (res.get(f"h2n:{h}") or [])
        best = None
        for l1 in legs1[:8]:
            arr = _arrival(l1)
            for l2 in legs2[:10]:
                try:
                    dep2 = dt.datetime.fromisoformat(l2["departure_at"])
                except (TypeError, ValueError):
                    continue
                if arr is None:
                    continue
                gap = (dep2 - arr).total_seconds() / 3600
                if 3 <= gap <= 24 and (best is None or l1["price"] + l2["price"] < best["total"]):
                    best = {"hub": h, "leg1": l1, "leg2": l2, "total": l1["price"] + l2["price"], "gap_hours": round(gap, 1)}
        if best and (one_way_ref is None or best["total"] < one_way_ref["price"]):
            out["split"].append(best)
    out["split"].sort(key=lambda x: x["total"])
    out["split"] = out["split"][:4]
    for a in alt_o:
        go, back = first(f"no:{a}"), first(f"nob:{a}") if ret else None
        if go and (back or not ret):
            out["nearby"].append({"kind": "origin", "airport": a, "km": round(_km(o, a) or 0), "out": go, "back": back,
                                  "total": go["price"] + (back["price"] if back else 0)})
    for a in alt_d:
        go, back = first(f"nd:{a}"), first(f"ndb:{a}") if ret else None
        if go and (back or not ret):
            out["nearby"].append({"kind": "destination", "airport": a, "km": round(_km(d, a) or 0), "out": go, "back": back,
                                  "total": go["price"] + (back["price"] if back else 0)})
    out["nearby"].sort(key=lambda x: x["total"])
    for x in [out["base"], out["mixed"] and out["mixed"]["out"], out["mixed"] and out["mixed"]["back"]]:
        if x:
            x["link"] = _marker(x["link"], cfg)
    return out


def api_flights_matrix(q, body):
    """Round-trip price grid: departure ±3 days × return ±3 days."""
    cfg = load_config()
    o, d, dep, ret = q["origin"].upper(), q["destination"].upper(), q["depart"], q["return"]
    deps = [add_days(dep, i) for i in range(-3, 4)]
    rets = [add_days(ret, i) for i in range(-3, 4)]
    pairs = sorted({(a[:7], b[:7]) for a in deps for b in rets})
    grid = {}
    for dm, rm in pairs:
        try:
            tickets = P.tp_search(cfg.get("tp_token"), o, d, dm, rm, False, limit=1000)
        except P.SourceError as e:
            if "مفتاح" in str(e) or "NO_TP" in str(e):
                raise
            continue
        for t in tickets:
            k = f"{(t['departure_at'] or '')[:10]}|{(t['return_at'] or '')[:10]}"
            if k not in grid or t["price"] < grid[k]["price"]:
                grid[k] = {"price": t["price"], "airline": t["airline"], "link": _marker(t["link"], cfg)}
    cells = {f"{a}|{b}": grid.get(f"{a}|{b}") for a in deps for b in rets if b > a}
    return {"deps": deps, "rets": rets, "cells": cells}


def api_multicity(q, body):
    """Multi-city trip. With optimize=1 the middle cities are reordered to the cheapest order."""
    import itertools
    cfg = load_config()
    tok = cfg.get("tp_token")
    origin = q["origin"].upper()
    cities = [c.upper() for c in q["cities"].split(",") if c.strip()][:5]
    nights = [max(1, int(n)) for n in (q.get("nights") or "").split(",") if n.strip().isdigit()]
    nights += [3] * (len(cities) - len(nights))
    start = q["start"]
    back_home = q.get("return", "1") == "1"
    orders = [tuple(cities)]
    estimates = []
    if q.get("optimize") == "1" and 2 <= len(cities) <= 4:
        month = start[:7]
        pts = [origin] + cities
        pairs = {(a, b) for a in pts for b in pts if a != b}

        def est(p):
            t = _cheapest(tok, p[0], p[1], month)
            return p, (t[0]["price"] if t else None)
        with ThreadPoolExecutor(8) as ex:
            price = dict(ex.map(est, pairs))
        for perm in itertools.permutations(cities):
            seq = [origin, *perm] + ([origin] if back_home else [])
            legs = [price.get((seq[i], seq[i + 1])) for i in range(len(seq) - 1)]
            if all(legs):
                estimates.append({"order": list(perm), "estimate": sum(legs)})
        estimates.sort(key=lambda x: x["estimate"])
        if estimates:
            orders = [tuple(estimates[0]["order"])]
    seq = [origin, *orders[0]] + ([origin] if back_home else [])
    stay = dict(zip(cities, nights))
    legs, day = [], start
    for i in range(len(seq) - 1):
        legs.append({"from": seq[i], "to": seq[i + 1], "date": day})
        if i < len(seq) - 2 or not back_home:
            day = add_days(day, stay.get(seq[i + 1], 3))

    def price_leg(leg):
        t = _cheapest(tok, leg["from"], leg["to"], leg["date"])
        if not t:  # nothing cached that day: show the cheapest that month as a guide
            t = _cheapest(tok, leg["from"], leg["to"], leg["date"][:7])
            leg["month_guide"] = bool(t)
        leg["ticket"] = t[0] if t else None
        if leg["ticket"]:
            leg["ticket"]["link"] = _marker(leg["ticket"]["link"], cfg)
        return leg
    with ThreadPoolExecutor(6) as ex:
        legs = list(ex.map(price_leg, legs))
    total = sum(l["ticket"]["price"] for l in legs if l["ticket"])
    return {"legs": legs, "total": total, "complete": all(l["ticket"] for l in legs),
            "orders": estimates[:6], "optimized": bool(estimates)}


# ---------------------------------------------------------------- umrah planner
MAKKAH, MADINAH = "g293993", "g298551"
HARAM = (21.4225, 39.8262)
NABAWI = (24.4672, 39.6111)
TRAIN_SAR = 160  # Haramain train, economy, one way (approximate)


def _near_hotels(cid, center, n=8):
    import math
    hs = P.xo_list(cid, limit=60, sort="popularity") or []
    def dist(h):
        if h["lat"] is None:
            return 99
        r = math.pi / 180
        x = math.sin((h["lat"] - center[0]) * r / 2) ** 2 + math.cos(center[0] * r) * math.cos(h["lat"] * r) * math.sin((h["lng"] - center[1]) * r / 2) ** 2
        return 12742 * math.asin(math.sqrt(x))
    for h in hs:
        h["km"] = round(dist(h), 2)
    return sorted([h for h in hs if h["km"] <= 1.5], key=lambda h: -(h["rating"] or 0))[:n]


def api_umrah(q, body):
    cfg = load_config()
    tok = cfg.get("tp_token")
    origin = q["origin"].upper()
    month = q["month"]
    nm, nd = max(1, int(q.get("makkah", 4))), max(0, int(q.get("madinah", 3)))
    adults = int(q.get("adults", 2))
    kids = ages(q.get("children"))
    per_room, rooms = room_query(adults, kids, int(q.get("rooms", 1)))
    first = q.get("first", "makkah")
    total_n = nm + nd
    starts = [d for d in _month_days(month) if dt.date.fromisoformat(d) > dt.date.today()]
    if not starts:
        return {"windows": []}
    # inbound/outbound airports depend on the order of the visit
    in_ap, out_ap = ("JED", "MED") if first == "makkah" else ("MED", "JED")
    if nd == 0:
        in_ap = out_ap = "JED"
    domestic = AIRPORTS.get(origin, {}).get("cc") == "SA"
    cal, no_tp = {}, False
    for key, (a, b, m) in {"in": (origin, in_ap, month), "out": (out_ap, origin, month),
                           "out2": (out_ap, origin, add_days(starts[-1], total_n)[:7])}.items():
        try:
            cal[key] = P.tp_month_calendar(tok, a, b, m, True) if a != b else {}
        except P.SourceError as e:
            if "مفتاح" in str(e):
                raise
            no_tp = no_tp or "NO_TP" in str(e)
            cal[key] = {}
    outs = {**cal.get("out", {}), **cal.get("out2", {})}
    cands = []
    for s in starts:
        e = add_days(s, total_n)
        fi, fo = cal["in"].get(s), outs.get(e)
        price = (fi["price"] if fi else None), (fo["price"] if fo else None)
        cands.append({"start": s, "end": e, "in": fi, "out": fo, "flights": sum(p for p in price if p) if all(price) else None,
                      "crowd": crowd(s, e)})
    ranked = sorted([c for c in cands if c["flights"]], key=lambda c: (c["flights"] * (1 + 0.15 * c["crowd"]["level"])))[:3]
    if not ranked:
        ranked = sorted(cands, key=lambda c: c["crowd"]["level"])[:3]
    mk = _near_hotels(MAKKAH, HARAM)
    md = _near_hotels(MADINAH, NABAWI) if nd else []

    def best_hotel(hotels, ci, co):
        def rate(h):
            try:
                r = P.xo_rates(h["id"], ci, co, per_room, 1)
            except P.SourceError:
                return None
            return {"id": h["id"], "name": h["name"], "km": h["km"], "rating": h["rating"], "night": r[0]["night"],
                    "site": r[0]["site"], "lat": h["lat"], "lng": h["lng"]} if r else None
        with ThreadPoolExecutor(8) as ex:
            found = [x for x in ex.map(rate, hotels) if x]
        return min(found, key=lambda x: x["night"]) if found else None

    def plan(c):
        s = c["start"]
        if first == "makkah":
            mk_in, mk_out, md_in, md_out = s, add_days(s, nm), add_days(s, nm), add_days(s, nm + nd)
        else:
            md_in, md_out, mk_in, mk_out = s, add_days(s, nd), add_days(s, nd), add_days(s, nd + nm)
        c["makkah"] = best_hotel(mk, mk_in, mk_out)
        c["madinah"] = best_hotel(md, md_in, md_out) if nd else None
        c["train"] = TRAIN_SAR if nd else 0
        c["in_airport"], c["out_airport"] = in_ap, out_ap
        return c
    with ThreadPoolExecutor(3) as ex:
        windows = list(ex.map(plan, ranked))
    return {"windows": windows, "nights": {"makkah": nm, "madinah": nd}, "rooms": rooms, "per_room": per_room,
            "domestic": domestic, "no_flights": no_tp, "crowd_days": {c["start"]: c["crowd"] for c in cands}}


def _month_days(month):
    y, m = map(int, month.split("-"))
    return [dt.date(y, m, d).isoformat() for d in range(1, calendar.monthrange(y, m)[1] + 1)]


def crowd(start, end):
    """Rough crowd level at the Haram for a stay: 0 light .. 3 very heavy (seasons are editable in the UI)."""
    seasons = store_get("seasons") or DEFAULT_SEASONS
    level, why = 0, []
    d = dt.date.fromisoformat(start)
    while d.isoformat() < end:
        k = d.isoformat()
        for s in seasons:
            if s["from"] <= k <= s["to"]:
                if s["kind"] == "ramadan":
                    last10 = k >= (dt.date.fromisoformat(s["to"]) - dt.timedelta(days=9)).isoformat()
                    lv = 3 if last10 else 2
                    level = max(level, lv)
                    why.append("العشر الأواخر" if last10 else "رمضان")
                elif s["kind"] == "hajj":
                    level = max(level, 3); why.append("موسم الحج")
                elif s["kind"] == "holiday":
                    level = max(level, 2); why.append(s["name"])
                elif s["kind"] == "high":
                    level = max(level, 1); why.append(s["name"])
        if d.weekday() in (3, 4):  # Thursday, Friday
            level = max(level, 1)
        d += dt.timedelta(days=1)
    return {"level": level, "why": sorted(set(why))}


DEFAULT_SEASONS = [
    {"name": "رمضان", "from": "2027-02-08", "to": "2027-03-09", "kind": "ramadan"},
    {"name": "عيد الفطر", "from": "2027-03-10", "to": "2027-03-16", "kind": "holiday"},
    {"name": "موسم الحج", "from": "2027-05-08", "to": "2027-05-21", "kind": "hajj"},
    {"name": "إجازة الصيف", "from": "2027-06-24", "to": "2027-08-28", "kind": "high"},
]


# ---------------------------------------------------------------- alerts + background
def api_notify_test(q, body):
    cfg = load_config()
    topic = (body or {}).get("topic") or cfg.get("ntfy_topic")
    P.ntfy_send(topic, "دروب", "تمام! التنبيهات واصلة لجوالك. بنعلمك إذا نزل سعر شي تراقبه.", tags=["camel", "star"])
    return {"ok": True}


AUTOSTART_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"


def autostart_status():
    if os.name != "nt":
        return False
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY) as k:
            winreg.QueryValueEx(k, "Duroob")
            return True
    except OSError:
        return False


def api_autostart(q, body):
    if os.name != "nt" or not FROZEN:
        raise P.SourceError("التشغيل مع ويندوز يشتغل في نسخة الويندوز بس.")
    import winreg
    on = bool((body or {}).get("on"))
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, AUTOSTART_KEY, 0, winreg.KEY_SET_VALUE) as k:
        if on:
            winreg.SetValueEx(k, "Duroob", 0, winreg.REG_SZ, f'"{sys.executable}" --background')
        else:
            try:
                winreg.DeleteValue(k, "Duroob")
            except OSError:
                pass
    return {"autostart": autostart_status()}


def alert_for(w, r):
    """Decide whether a watch result deserves a phone alert, and say why."""
    price, prev = r.get("price"), r.get("prev")
    if not price:
        return None
    if w.get("booked") and price < w["booked"] * 0.97:
        if not w.get("cancel_by") or dt.date.today().isoformat() <= w["cancel_by"]:
            return f"نزل عن سعر حجزك بـ {w['booked'] - price:,} ر.س. تقدر تلغي وتحجز من جديد."
    if w.get("target") and price <= w["target"]:
        return f"وصل للسعر اللي تبيه: {price:,} ر.س"
    if prev and price < prev * 0.97:
        return f"نزل من {prev:,} إلى {price:,} ر.س"
    return None


def background_loop():
    time.sleep(60)
    while True:
        cfg = load_config()
        last = cfg.get("last_bg_check", 0)
        if cfg.get("alerts_on") and cfg.get("ntfy_topic") and time.time() - last > 3 * 3600:
            try:
                api_watch_check({}, {})
            except Exception:  # never let the background checker die
                pass
            cfg = load_config()
            cfg["last_bg_check"] = int(time.time())
            save_config(cfg)
        try:
            check_reminders()
        except Exception:
            pass
        time.sleep(600)


def api_budget(q, body):
    """Whole trips (flight + hotel) to the cheapest destinations; the page adds spending and filters by budget."""
    cfg = load_config()
    tok = cfg.get("tp_token")
    o = q["origin"].upper()
    month = q["month"]
    nights = max(1, int(q.get("nights", 5)))
    adults = int(q.get("adults", 2))
    kids = ages(q.get("children"))
    per_room, rooms = room_query(adults, kids, int(q.get("rooms", 1)))
    by_iata = {}
    for c in CITIES.values():
        if c.get("iata") and c["id"] != "g293993" and c["iata"] not in by_iata:
            by_iata[c["iata"]] = c
    cands = sorted({c["iata"] for c in CITIES.values() if c.get("iata")})
    tickets = P.tp_anywhere(tok, o, month, cands, one_way=False)
    picks = [t for t in tickets if t["destination"] in by_iata][:10]

    def plan(t):
        c = by_iata[t["destination"]]
        dep = (t.get("departure_at") or "")[:10] or f"{month}-15"
        if dep <= dt.date.today().isoformat():
            dep = add_days(dt.date.today().isoformat(), 7)
        ret = add_days(dep, nights)
        best = None
        for h in P.xo_list(c["id"], limit=6, sort="popularity")[:6]:
            try:
                r = P.xo_rates(h["id"], dep, ret, per_room, 1)
            except P.SourceError:
                continue
            if r and (best is None or r[0]["night"] < best["night"]):
                best = {"id": h["id"], "name": h["name"], "rating": h["rating"], "night": r[0]["night"], "site": r[0]["site"], "image": h.get("image")}
        t["link"] = _marker(t["link"], cfg)
        return {"city": c["id"], "flight": t, "hotel": best, "depart": dep, "return": ret, "nights": nights, "rooms": rooms}
    with ThreadPoolExecutor(5) as ex:
        res = [x for x in ex.map(plan, picks) if x["hotel"]]
    return {"options": res}


def api_nearby(q, body):
    return {"places": P.overpass_nearby(float(q["lat"]), float(q["lng"]), int(q.get("radius", 1500)))}


def api_history(q, body):
    return history(q["kind"], q["key"], q.get("day"))


def api_watch_check(q, body):
    cfg = load_config()
    if WEBSITE or (body and isinstance(body.get("watches"), list)):
        watches = (body or {}).get("watches") or []
        cfg["ntfy_topic"] = (body or {}).get("ntfy_topic") or ""
        cfg["alerts_on"] = bool(cfg["ntfy_topic"])
    else:
        watches = store_get("watches", []) or []
    out = []
    for w in watches:
        try:
            p = w.get("params") or {}
            price = None
            if w.get("kind") == "flight-month":
                days = P.tp_month_calendar(cfg.get("tp_token"), p["origin"], p["destination"], p["month"],
                                           p.get("one_way", "1") == "1", False, int(p["nights"]) if p.get("nights") else None)
                best = min(days.items(), key=lambda kv: kv[1]["price"]) if days else None
                price = best[1]["price"] if best else None
                w["best_day"] = best[0] if best else None
                key, day, kind = f"{p['origin']}-{p['destination']}-M", p["month"], "flight-month"
            elif w.get("kind") == "flight":
                t = P.tp_search(cfg.get("tp_token"), p["origin"], p["destination"], p["depart"], p.get("return"),
                                p.get("direct") == "1", limit=30)
                price = min((x["price"] for x in t), default=None)
                key, day = f"{p['origin']}-{p['destination']}{'-RT' if p.get('return') else ''}", p["depart"]
                kind = "flight"
            elif p.get("token"):
                # Google Hotels watch: each check spends one of the ~250 monthly searches, so once a day is enough.
                key, day, kind = p["id"], p["checkin"], "hotel"
                if not cfg.get("serp_key") or time.time() - (w.get("checked") or 0) < 20 * 3600:
                    out.append({"id": w["id"], "price": w.get("last"), "prev": w.get("last"), "skipped": True,
                                "dropped": False, "below_target": False, "below_booked": False, "history": history(kind, key, day)})
                    continue
                r = P.serp_hotel_detail(cfg["serp_key"], p["token"], p.get("query", ""), p["checkin"], p["checkout"],
                                        int(p.get("adults", 2)), ages(p.get("children")))
                price = r[0]["night"] if r else None
            else:
                r = P.xo_rates(p["id"], p["checkin"], p["checkout"], int(p.get("per_room", 2)), 1)
                price = r[0]["night"] if r else None
                key, day, kind = p["id"], p["checkin"], "hotel"
            if price:
                record(kind, key, day, price)
            prev = w.get("last")
            w["last"] = price or prev
            w["checked"] = int(time.time())
            h = history(kind, key, day)
            r = {"id": w["id"], "price": price, "prev": prev, "dropped": bool(price and prev and price < prev),
                 "below_target": bool(price and w.get("target") and price <= w["target"]),
                 "below_booked": bool(price and w.get("booked") and price < w["booked"] * 0.97), "history": h}
            why = alert_for(w, r)
            r["alert"] = why
            if why and cfg.get("alerts_on") and cfg.get("ntfy_topic") and w.get("notified") != price:
                try:
                    P.ntfy_send(cfg["ntfy_topic"], "دروب · " + str(w.get("label", ""))[:80], why, tags=["chart_with_downwards_trend"])
                    w["notified"] = price
                except P.SourceError:
                    pass
            out.append(r)
        except (P.SourceError, KeyError, ValueError) as e:
            out.append({"id": w.get("id"), "error": str(e)})
    if not WEBSITE and not (body and isinstance(body.get("watches"), list)):
        store_put("watches", watches)
    return {"results": out, "watches": watches}


def check_reminders():
    """Send trip reminders (passport, visa, check-in...) to the phone on their day."""
    cfg = load_config()
    if not (cfg.get("alerts_on") and cfg.get("ntfy_topic")):
        return
    trips = store_get("trips", []) or []
    today = dt.date.today().isoformat()
    changed = False
    for t in trips:
        for r in t.get("reminders") or []:
            if r.get("date") and r["date"] <= today and not r.get("sent") and not r.get("done"):
                try:
                    P.ntfy_send(cfg["ntfy_topic"], "دروب · " + str(t.get("name", ""))[:60], r.get("text", ""), tags=["bell"])
                    r["sent"] = True
                    changed = True
                except P.SourceError:
                    return
    if changed:
        store_put("trips", trips)


ROUTES = {
    "settings": api_settings,
    "places": api_places,
    "fx": api_fx,
    "flights/search": api_flights_search,
    "flights/calendar": api_flights_calendar,
    "flights/anywhere": api_flights_anywhere,
    "hotels/search": api_hotels_search,
    "hotels/rates": api_hotels_rates,
    "hotels/calendar": api_hotels_calendar,
    "trip": api_trip,
    "history": api_history,
    "watch/check": api_watch_check,
    "flights/smart": api_flights_smart,
    "flights/matrix": api_flights_matrix,
    "multicity": api_multicity,
    "umrah": api_umrah,
    "notify/test": api_notify_test,
    "autostart": api_autostart,
    "budget": api_budget,
    "nearby": api_nearby,
}
WEB_BLOCKED = {"autostart"}
_hits: dict[str, list[float]] = {}


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "Duroob/1.0"

    def log_message(self, fmt, *args):
        if not FROZEN:
            sys.stderr.write("%s\n" % (fmt % args))

    def _send(self, code, payload, ctype="application/json; charset=utf-8"):
        data = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _host_ok(self):
        if WEBSITE:
            return True
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def _rate_ok(self):
        if not WEBSITE:
            return True
        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        now = time.time()
        hits = [t for t in _hits.get(ip, []) if now - t < 60]
        hits.append(now)
        _hits[ip] = hits
        return len(hits) <= 90

    def do_GET(self):
        self.handle_any(None)

    def do_POST(self):
        self.handle_any(self._body())

    def do_PUT(self):
        self.handle_any(self._body())

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 5_000_000:
            return {}
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except ValueError:
            return {}

    def handle_any(self, body):
        global _last_ping
        if not self._host_ok():
            return self._send(403, {"error": "forbidden"})
        url = urllib.parse.urlparse(self.path)
        path = url.path
        if path.startswith("/api/"):
            if body is not None and self.headers.get("X-Duroob") != "1":
                return self._send(403, {"error": "forbidden"})
            _last_ping = time.time()
            name = path[5:].strip("/")
            q = {k: v[-1] for k, v in urllib.parse.parse_qs(url.query).items()}
            if name == "ping":
                return self._send(200, {"app": "duroob", "web": WEBSITE})
            if not self._rate_ok():
                return self._send(429, {"error": "طلبات كثيرة، انتظر دقيقة وجرب.", "code": "rate"})
            if WEBSITE and (name.startswith("store/") or name in WEB_BLOCKED):
                return self._send(404, {"error": "not available on the website"})
            if name.startswith("store/"):
                sname = name[6:]
                if sname not in STORE_NAMES:
                    return self._send(404, {"error": "unknown store"})
                if body is not None:
                    store_put(sname, body.get("value"))
                return self._send(200, {"value": store_get(sname)})
            fn = ROUTES.get(name)
            if not fn:
                return self._send(404, {"error": "not found"})
            try:
                return self._send(200, fn(q, body))
            except P.SourceError as e:
                msg = str(e)
                code = "no_tp" if msg == "NO_TP_TOKEN" else "no_serp" if msg == "NO_SERP_KEY" else "source"
                return self._send(502, {"error": msg, "code": code})
            except (KeyError, ValueError) as e:
                return self._send(400, {"error": f"طلب ناقص: {e}", "code": "bad_request"})
        # static files
        rel = "index.html" if path in ("/", "") else path.lstrip("/")
        full = os.path.normpath(os.path.join(WEB, rel))
        if not full.startswith(os.path.normpath(WEB)) or not os.path.isfile(full):
            return self._send(404, b"not found", "text/plain")
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        with open(full, "rb") as f:
            self._send(200, f.read(), ctype)


def already_running(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1) as s:
            s.sendall(b"GET /api/ping HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n")
            return b"duroob" in s.recv(2048)
    except OSError:
        return False


def open_window(url):
    if os.name == "nt":
        for exe in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"):
            if os.path.exists(exe):
                profile = os.path.join(DATA, "window")
                subprocess.Popen([exe, f"--app={url}", f"--user-data-dir={profile}",
                                  "--window-size=1320,860", "--no-first-run"])
                return
    webbrowser.open(url)


def watchdog():
    # Exit after the window has been closed for a while (only for the packaged app).
    while True:
        time.sleep(15)
        if time.time() - _last_ping > 120:
            cfg = load_config()
            if cfg.get("alerts_on") and autostart_status():
                continue  # keep watching prices in the background
            os._exit(0)


def main_web():
    port = int(os.environ.get("PORT", 10000))
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    srv.daemon_threads = True
    print(f"Duroob website on port {port}", flush=True)
    srv.serve_forever()


def main():
    if WEBSITE:
        return main_web()
    first = int(os.environ.get("DUROOB_PORT", PORT))
    srv = None
    for port in range(first, first + 10):
        url = f"http://127.0.0.1:{port}/"
        if already_running(port):
            if not BACKGROUND:
                open_window(url)
            return
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            break
        except OSError:
            continue  # port taken by another program
    if srv is None:
        sys.exit("No free port for Duroob")
    srv.daemon_threads = True
    if "--no-window" not in sys.argv and not BACKGROUND:
        threading.Timer(0.6, open_window, [url]).start()
    if FROZEN and not BACKGROUND:
        threading.Thread(target=watchdog, daemon=True).start()
    threading.Thread(target=background_loop, daemon=True).start()
    print(f"Duroob running at {url}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
