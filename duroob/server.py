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
STORE_NAMES = {"favorites", "watches", "history", "groups", "prefs", "seasons", "baggage"}

with open(os.path.join(WEB, "data", "cities.json"), encoding="utf-8") as f:
    CITIES = {c["id"]: c for c in json.load(f)}

_lock = threading.Lock()
_last_ping = time.time()


# ---------------------------------------------------------------- config + store
def load_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


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
    if body is not None:
        for k in ("tp_token", "tp_marker", "serp_key"):
            if k in body:
                cfg[k] = str(body[k] or "").strip()
        for k in ("home", "use_serp_hotels", "use_serp_flights"):
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
        "data_dir": DATA,
    }


def _marker(link, cfg):
    if link and cfg.get("tp_marker") and "marker=" not in link:
        link += ("&" if "?" in link else "?") + "marker=" + urllib.parse.quote(cfg["tp_marker"])
    return link


def api_places(q, body):
    return P.places(q.get("term", ""))


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
    if tickets:
        best = min(tickets, key=lambda t: t["price"])
        day = (best["departure_at"] or depart)[:10] if len(depart) == 10 else depart
        record("flight", f"{o}-{d}{'-RT' if ret else ''}", day, best["price"])
    return {"tickets": tickets, "insights": insights}


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
    if cfg.get("serp_key") and cfg.get("use_serp_hotels", True):
        query = q.get("near") or f"hotels in {c['en']}"
        hotels = P.serp_hotels(cfg["serp_key"], query, chk_in, chk_out, adults, kids,
                               free_cancel=q.get("free_cancel") == "1")
    else:
        hotels = P.xo_search(c["id"], chk_in, chk_out, per_room, rooms)
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
    if q.get("token") and cfg.get("serp_key"):
        rates = P.serp_hotel_detail(cfg["serp_key"], q["token"], q.get("query") or q.get("name", ""),
                                    q["checkin"], q["checkout"], adults, kids)
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


def api_history(q, body):
    return history(q["kind"], q["key"], q.get("day"))


def api_watch_check(q, body):
    cfg = load_config()
    watches = store_get("watches", []) or []
    out = []
    for w in watches:
        try:
            p = w.get("params") or {}
            price = None
            if w.get("kind") == "flight":
                t = P.tp_search(cfg.get("tp_token"), p["origin"], p["destination"], p["depart"], p.get("return"),
                                p.get("direct") == "1", limit=30)
                price = min((x["price"] for x in t), default=None)
                key, day = f"{p['origin']}-{p['destination']}{'-RT' if p.get('return') else ''}", p["depart"]
                kind = "flight"
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
            out.append({"id": w["id"], "price": price, "prev": prev, "dropped": bool(price and prev and price < prev),
                        "below_target": bool(price and w.get("target") and price <= w["target"]), "history": h})
        except (P.SourceError, KeyError, ValueError) as e:
            out.append({"id": w.get("id"), "error": str(e)})
    store_put("watches", watches)
    return {"results": out, "watches": watches}


ROUTES = {
    "settings": api_settings,
    "places": api_places,
    "flights/search": api_flights_search,
    "flights/calendar": api_flights_calendar,
    "flights/anywhere": api_flights_anywhere,
    "hotels/search": api_hotels_search,
    "hotels/rates": api_hotels_rates,
    "hotels/calendar": api_hotels_calendar,
    "trip": api_trip,
    "history": api_history,
    "watch/check": api_watch_check,
}


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
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

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
                return self._send(200, {"app": "duroob"})
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
            os._exit(0)


def main():
    first = int(os.environ.get("DUROOB_PORT", PORT))
    srv = None
    for port in range(first, first + 10):
        url = f"http://127.0.0.1:{port}/"
        if already_running(port):
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
    if "--no-window" not in sys.argv:
        threading.Timer(0.6, open_window, [url]).start()
    if FROZEN:
        threading.Thread(target=watchdog, daemon=True).start()
    print(f"Duroob running at {url}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
