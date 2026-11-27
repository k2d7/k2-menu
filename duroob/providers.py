"""Price sources for Duroob.

- Travelpayouts (Aviasales Data API): cached flight prices. Free, needs a token.
- Travelpayouts autocomplete: city/airport names in Arabic. Free, no token.
- Xotelo: hotel lists (TripAdvisor) and per-site rates. Free, no key.
- SerpApi (optional): Google Hotels / Google Flights results. Free tier, needs a key.

Every function returns plain dicts that the web UI understands. Prices are in SAR.
"""
from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

USD_TO_SAR = 3.75  # the riyal is pegged to the dollar
UA = "Duroob/1.0 (desktop travel search)"


class SourceError(Exception):
    """A price source failed; the message is shown to the user (Arabic)."""


# ---------------------------------------------------------------- http + cache
_cache: dict[str, tuple[float, object]] = {}
_cache_lock = threading.Lock()


def http_json(url: str, params: dict | None = None, ttl: int = 1800, timeout: int = 30):
    if params:
        clean = {k: v for k, v in params.items() if v is not None and v != ""}
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(clean, doseq=True)
    now = time.time()
    with _cache_lock:
        hit = _cache.get(url)
        if hit and hit[0] > now:
            return hit[1]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "replace")[:300]
        except Exception:
            pass
        raise SourceError(f"HTTP {e.code}: {body}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise SourceError("ما قدرت أتصل بالإنترنت أو المصدر ما رد. تأكد من الاتصال وجرب مرة ثانية.") from e
    if ttl:
        with _cache_lock:
            _cache[url] = (now + ttl, data)
            if len(_cache) > 3000:
                for k in sorted(_cache, key=lambda k: _cache[k][0])[:1000]:
                    _cache.pop(k, None)
    return data


# ---------------------------------------------------------------- places
def places(term: str, locale: str = "ar"):
    data = http_json(
        "https://autocomplete.travelpayouts.com/places2",
        {"term": term, "locale": locale, "types[]": ["city", "airport"]},
        ttl=86400,
    )
    out = []
    for p in data or []:
        out.append({
            "code": p.get("code"),
            "name": p.get("name"),
            "type": p.get("type"),
            "city": p.get("city_name") or p.get("name"),
            "country": p.get("country_name"),
            "country_code": p.get("country_code"),
            "airport": p.get("main_airport_name"),
            "lat": (p.get("coordinates") or {}).get("lat"),
            "lng": (p.get("coordinates") or {}).get("lon"),
        })
    return out


# ---------------------------------------------------------------- Travelpayouts flights
TP = "https://api.travelpayouts.com"


def _tp(path: str, token: str, params: dict):
    if not token:
        raise SourceError("NO_TP_TOKEN")
    p = dict(params)
    p["token"] = token
    p.setdefault("currency", "sar")
    try:
        data = http_json(TP + path, p)
        rate = 1.0
    except SourceError as e:
        if "401" in str(e) or "403" in str(e):
            raise SourceError("مفتاح Travelpayouts غير صحيح. راجعه من صفحة الإعدادات.") from e
        # some endpoints reject SAR; fall back to USD and convert
        p["currency"] = "usd"
        data = http_json(TP + path, p)
        rate = USD_TO_SAR
    if isinstance(data, dict) and data.get("success") is False:
        raise SourceError("Travelpayouts: " + str(data.get("error") or "خطأ غير معروف"))
    if isinstance(data, dict) and str(data.get("currency", "")).lower() == "usd":
        rate = USD_TO_SAR
    return data, rate


def _ticket(t: dict, rate: float, one_way: bool):
    link = t.get("link") or ""
    if link and not link.startswith("http"):
        link = "https://www.aviasales.com" + link
    price = t.get("price") or t.get("value") or 0
    return {
        "source": "Aviasales",
        "cached": True,
        "origin": t.get("origin"),
        "destination": t.get("destination"),
        "origin_airport": t.get("origin_airport") or t.get("origin"),
        "destination_airport": t.get("destination_airport") or t.get("destination"),
        "price": round(float(price) * rate),
        "airline": t.get("airline"),
        "flight_number": t.get("flight_number"),
        "departure_at": t.get("departure_at") or t.get("depart_date"),
        "return_at": None if one_way else (t.get("return_at") or t.get("return_date")),
        "transfers": t.get("transfers", t.get("number_of_changes")),
        "return_transfers": t.get("return_transfers"),
        "duration": t.get("duration"),
        "duration_to": t.get("duration_to") or t.get("duration"),
        "duration_back": t.get("duration_back"),
        "link": link,
    }


def tp_search(token, origin, destination, depart, ret=None, direct=False, limit=100):
    one_way = not ret
    data, rate = _tp("/aviasales/v3/prices_for_dates", token, {
        "origin": origin, "destination": destination,
        "departure_at": depart, "return_at": ret or None,
        "one_way": "true" if one_way else "false",
        "direct": "true" if direct else "false",
        "sorting": "price", "unique": "false", "limit": limit, "page": 1,
    })
    return [_ticket(t, rate, one_way) for t in (data.get("data") or [])]


def tp_month_calendar(token, origin, destination, month, one_way=True, direct=False, nights=None):
    """Cheapest price for each departure day of `month` (YYYY-MM)."""
    days: dict[str, dict] = {}
    if one_way:
        try:
            data, rate = _tp("/aviasales/v3/grouped_prices", token, {
                "origin": origin, "destination": destination, "departure_at": month,
                "group_by": "departure_at", "direct": "true" if direct else "false",
            })
            for day, t in (data.get("data") or {}).items():
                tk = _ticket(t, rate, True)
                days[day[:10]] = tk
            if days:
                return days
        except SourceError as e:
            if "مفتاح" in str(e) or "NO_TP" in str(e):
                raise
    tickets = tp_search(token, origin, destination, month, None if one_way else month, direct, limit=1000)
    for tk in tickets:
        d = (tk["departure_at"] or "")[:10]
        if not d:
            continue
        if nights and tk.get("return_at"):
            try:
                n = (time.mktime(time.strptime(tk["return_at"][:10], "%Y-%m-%d")) -
                     time.mktime(time.strptime(d, "%Y-%m-%d"))) / 86400
                if abs(n - nights) > 1:
                    continue
            except ValueError:
                pass
        if d not in days or tk["price"] < days[d]["price"]:
            days[d] = tk
    return days


def tp_year_calendar(token, origin, destination, months, one_way=True, direct=False):
    def one(m):
        try:
            t = tp_search(token, origin, destination, m, None if one_way else m, direct, limit=30)
            return m, (min(t, key=lambda x: x["price"]) if t else None)
        except SourceError as e:
            if "مفتاح" in str(e) or "NO_TP" in str(e):
                raise
            return m, None
    with ThreadPoolExecutor(6) as ex:
        return dict(ex.map(one, months))


def tp_anywhere(token, origin, month, candidates, one_way=True):
    """Cheapest destinations from `origin` in `month`."""
    found: dict[str, dict] = {}
    try:
        data, rate = _tp("/aviasales/v3/prices_for_dates", token, {
            "origin": origin, "departure_at": month, "unique": "true",
            "sorting": "price", "limit": 200, "one_way": "true" if one_way else "false",
        })
        for t in data.get("data") or []:
            tk = _ticket(t, rate, one_way)
            d = tk["destination"]
            if d and (d not in found or tk["price"] < found[d]["price"]):
                found[d] = tk
    except SourceError as e:
        if "مفتاح" in str(e) or "NO_TP" in str(e):
            raise
    if len(found) < 8:  # endpoint needs a destination on some accounts: ask per city
        def one(dest):
            try:
                t = tp_search(token, origin, dest, month, None if one_way else month, limit=5)
                return dest, (min(t, key=lambda x: x["price"]) if t else None)
            except SourceError:
                return dest, None
        with ThreadPoolExecutor(8) as ex:
            for dest, tk in ex.map(one, [c for c in candidates if c != origin]):
                if tk:
                    found[dest] = tk
    return sorted(found.values(), key=lambda t: t["price"])


# ---------------------------------------------------------------- Xotelo hotels
XO = "https://data.xotelo.com/api"


def _xo(path, params, ttl=3600):
    data = http_json(f"{XO}/{path}", params, ttl=ttl, timeout=40)
    if isinstance(data, dict) and data.get("error"):
        raise SourceError("Xotelo: " + str((data["error"] or {}).get("message", data["error"])))
    return (data or {}).get("result") or {}


def xo_list(location_key, limit=40, sort="best_value"):
    res = _xo("list", {"location_key": location_key, "limit": limit, "offset": 0, "sort": sort}, ttl=43200)
    out = []
    for h in res.get("list") or []:
        geo = h.get("geo") or {}
        rs = h.get("review_summary") or {}
        labels = h.get("merchandising_labels") or []
        out.append({
            "id": h.get("key"),
            "name": h.get("name"),
            "type": h.get("accommodation_type") or "Hotel",
            "rating": rs.get("rating"),
            "reviews": rs.get("count"),
            "lat": geo.get("latitude"),
            "lng": geo.get("longitude"),
            "image": h.get("image"),
            "url": h.get("url"),
            "breakfast": any("breakfast" in str(x).lower() for x in labels),
            "labels": labels,
            "stars": None,
            "free_cancel": None,
        })
    return out


def xo_rates(hotel_key, chk_in, chk_out, adults=2, rooms=1):
    res = _xo("rates", {
        "hotel_key": hotel_key, "chk_in": chk_in, "chk_out": chk_out,
        "adults": max(1, min(32, adults)), "rooms": max(1, min(8, rooms)), "currency": "USD",
    }, ttl=3600)
    rates = []
    for r in res.get("rates") or []:
        if r.get("rate"):
            rates.append({
                "code": r.get("code"),
                "site": r.get("name"),
                "night": round(float(r["rate"]) * USD_TO_SAR),
                "tax": round(float(r["tax"]) * USD_TO_SAR) if r.get("tax") else None,
                "link": None,
            })
    rates.sort(key=lambda r: r["night"])
    return rates


def xo_heatmap(hotel_key, chk_out):
    res = _xo("heatmap", {"hotel_key": hotel_key, "chk_out": chk_out}, ttl=21600)
    hm = res.get("heatmap") or {}
    days = {}
    for d in hm.get("cheap_price_days") or []:
        days[d] = "cheap"
    for d in hm.get("average_price_days") or []:
        days[d] = "average"
    for d in hm.get("high_price_days") or []:
        days[d] = "high"
    return days


def xo_search(location_key, chk_in, chk_out, adults_per_room=2, rooms=1, limit=30, workers=10):
    hotels = xo_list(location_key, limit=limit)

    def price(h):
        try:
            h["rates"] = xo_rates(h["id"], chk_in, chk_out, adults_per_room, 1)
        except SourceError:
            h["rates"] = []
        h["night"] = h["rates"][0]["night"] if h["rates"] else None
        h["source"] = "Xotelo"
        return h
    with ThreadPoolExecutor(workers) as ex:
        priced = list(ex.map(price, hotels))
    return [h for h in priced if h["night"]]


# ---------------------------------------------------------------- SerpApi (optional)
SERP = "https://serpapi.com/search.json"


def _serp(key, params, ttl=3600):
    if not key:
        raise SourceError("NO_SERP_KEY")
    p = dict(params)
    p["api_key"] = key
    try:
        data = http_json(SERP, p, ttl=ttl, timeout=60)
    except SourceError as e:
        if "401" in str(e):
            raise SourceError("مفتاح SerpApi غير صحيح. راجعه من صفحة الإعدادات.") from e
        raise
    if data.get("error"):
        raise SourceError("SerpApi: " + str(data["error"]))
    return data


def _num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return v
    digits = "".join(ch for ch in str(v) if ch.isdigit() or ch == ".")
    try:
        return float(digits) if digits else None
    except ValueError:
        return None


def serp_hotels(key, query, chk_in, chk_out, adults, children_ages, sort=None, free_cancel=False):
    params = {
        "engine": "google_hotels", "q": query, "check_in_date": chk_in, "check_out_date": chk_out,
        "adults": adults, "currency": "SAR", "gl": "sa", "hl": "en",
    }
    if children_ages:
        params["children"] = len(children_ages)
        params["children_ages"] = ",".join(str(a) for a in children_ages)
    if sort:
        params["sort_by"] = sort
    if free_cancel:
        params["free_cancellation"] = "true"
    data = _serp(key, params)
    out = []
    for p in data.get("properties") or []:
        gps = p.get("gps_coordinates") or {}
        rpn = p.get("rate_per_night") or {}
        tot = p.get("total_rate") or {}
        rates = []
        for pr in p.get("prices") or []:
            n = _num((pr.get("rate_per_night") or {}).get("extracted_lowest") or (pr.get("rate_per_night") or {}).get("lowest"))
            if n:
                rates.append({"code": pr.get("source"), "site": pr.get("source"), "night": round(n), "link": pr.get("link")})
        rates.sort(key=lambda r: r["night"])
        amen = [str(a) for a in p.get("amenities") or []]
        imgs = p.get("images") or []
        night = _num(rpn.get("extracted_lowest") or rpn.get("lowest"))
        if not night:
            continue
        out.append({
            "id": p.get("property_token") or p.get("name"),
            "token": p.get("property_token"),
            "name": p.get("name"),
            "type": p.get("type") or "hotel",
            "rating": p.get("overall_rating"),
            "reviews": p.get("reviews"),
            "stars": p.get("extracted_hotel_class"),
            "lat": gps.get("latitude"), "lng": gps.get("longitude"),
            "image": imgs[0].get("thumbnail") if imgs else None,
            "images": [i.get("thumbnail") or i.get("original_image") for i in imgs[:8] if i.get("thumbnail") or i.get("original_image")],
            "url": p.get("link"),
            "night": round(night),
            "total": round(_num(tot.get("extracted_lowest") or tot.get("lowest")) or 0) or None,
            "breakfast": any("breakfast" in a.lower() for a in amen),
            "free_cancel": any("free cancellation" in a.lower() for a in amen) or bool(p.get("free_cancellation")),
            "amenities": amen[:12],
            "rates": rates,
            "source": "Google Hotels",
        })
    return out


def serp_hotel_detail(key, token, query, chk_in, chk_out, adults, children_ages):
    params = {
        "engine": "google_hotels", "q": query, "property_token": token,
        "check_in_date": chk_in, "check_out_date": chk_out, "adults": adults,
        "currency": "SAR", "gl": "sa", "hl": "en",
    }
    if children_ages:
        params["children"] = len(children_ages)
        params["children_ages"] = ",".join(str(a) for a in children_ages)
    data = _serp(key, params)
    rates = []
    for pr in (data.get("featured_prices") or []) + (data.get("prices") or []):
        n = _num((pr.get("rate_per_night") or {}).get("extracted_lowest") or (pr.get("rate_per_night") or {}).get("lowest"))
        if n:
            rates.append({"code": pr.get("source"), "site": pr.get("source"), "night": round(n),
                          "link": pr.get("link"), "free_cancel": bool(pr.get("free_cancellation"))})
    seen, uniq = set(), []
    for r in sorted(rates, key=lambda r: r["night"]):
        if r["site"] not in seen:
            seen.add(r["site"])
            uniq.append(r)
    return uniq


def serp_flights(key, origin, destination, depart, ret, adults, children, infants, cls=1, stops=0):
    params = {
        "engine": "google_flights", "departure_id": origin, "arrival_id": destination,
        "outbound_date": depart, "type": 1 if ret else 2, "adults": adults,
        "children": children or None, "infants_on_lap": infants or None,
        "travel_class": cls, "stops": stops, "currency": "SAR", "hl": "en", "gl": "sa",
    }
    if ret:
        params["return_date"] = ret
    data = _serp(key, params)
    out = []
    for group in ("best_flights", "other_flights"):
        for f in data.get(group) or []:
            legs = f.get("flights") or []
            if not legs:
                continue
            first, last = legs[0], legs[-1]
            out.append({
                "source": "Google Flights", "cached": False, "total_price": True,
                "origin": (first.get("departure_airport") or {}).get("id"),
                "destination": (last.get("arrival_airport") or {}).get("id"),
                "origin_airport": (first.get("departure_airport") or {}).get("id"),
                "destination_airport": (last.get("arrival_airport") or {}).get("id"),
                "price": f.get("price"),
                "airline": first.get("airline"),
                "airline_logo": first.get("airline_logo"),
                "flight_number": first.get("flight_number"),
                "departure_at": ((first.get("departure_airport") or {}).get("time") or "").replace(" ", "T"),
                "arrival_at": ((last.get("arrival_airport") or {}).get("time") or "").replace(" ", "T"),
                "return_at": ret,
                "transfers": max(0, len(legs) - 1),
                "duration_to": f.get("total_duration"),
                "duration": f.get("total_duration"),
                "layovers": [l.get("id") for l in f.get("layovers") or []],
                "link": None,
                "best": group == "best_flights",
            })
    insights = data.get("price_insights") or {}
    return [t for t in out if t["price"]], {
        "lowest": insights.get("lowest_price"),
        "level": insights.get("price_level"),
        "typical": insights.get("typical_price_range"),
    }


# ---------------------------------------------------------------- phone alerts (ntfy.sh)
def ntfy_send(topic, title, message, click=None, tags=None, server="https://ntfy.sh"):
    """Push a notification to the ntfy app on the user's phone (free, no account)."""
    if not topic:
        raise SourceError("ما فيه قناة تنبيهات. فعّلها من الإعدادات.")
    body = {"topic": topic, "title": title, "message": message, "tags": tags or ["camel"]}
    if click:
        body["click"] = click
    req = urllib.request.Request(server, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except (urllib.error.URLError, TimeoutError) as e:
        raise SourceError("ما قدرت أرسل التنبيه للجوال. تأكد من الإنترنت.") from e
