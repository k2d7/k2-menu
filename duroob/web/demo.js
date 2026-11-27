/* Demo price source: used in the phone preview, and on the PC while no keys are set.
   Every number here is invented (seeded, so it stays stable) and the UI labels it "تجريبي". */
(function () {
  const META = window.DUROOB_META;
  let CITIES = [];
  const SITES = ["Booking.com", "Agoda.com", "Expedia", "Hotels.com", "Trip.com", "موقع الفندق"];
  const NAMES = ["فندق الواحة", "نزل القافلة", "برج النخيل", "دار الضيافة", "فندق المنارة", "أجنحة السراب", "فندق الديرة",
    "منتجع الكثبان", "فندق الريم", "نُزل البخور", "فندق درب الحرير", "شقق الياسمين", "فندق الفنار", "أجنحة اللؤلؤ",
    "فندق السدو", "منتجع الشاطئ الذهبي", "فندق النجمة", "دار الوفاء", "فندق باب المدينة", "شقق المرسى",
    "فندق الأندلس", "قصر الضيافة", "أجنحة الهدى", "فندق الجوهرة"];
  const EXTRA_AIRPORTS = META.homeAirports.map(a => ({ code: a.code, ar: a.name }));

  function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(seed) { let x = hash(seed) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  function cityByIata(code) { return CITIES.find(c => c.iata === code) || null; }
  const COORDS = { RUH: [24.71, 46.67], JED: [21.54, 39.17], DMM: [26.42, 50.09], MED: [24.47, 39.61], AHB: [18.22, 42.51], TIF: [21.27, 40.42], ELQ: [26.3, 43.77], TUF: [28.38, 36.56], HAS: [27.52, 41.69], GIZ: [16.89, 42.55], YNB: [24.09, 38.06], ULH: [26.61, 37.92], HOF: [25.38, 49.59] };
  function coords(code) { const c = cityByIata(code); if (c) return [c.lat, c.lng]; return COORDS[code] || [30, 40]; }
  function km(a, b) {
    const [la1, lo1] = coords(a), [la2, lo2] = coords(b), r = Math.PI / 180;
    const d = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2;
    return Math.max(300, 12742 * Math.asin(Math.sqrt(d)));
  }
  function season(day) {
    const s = (window.DUROOB_SEASONS || META.seasons).filter(s => day >= s.from && day <= s.to);
    let f = 1;
    for (const x of s) f = Math.max(f, x.kind === "holiday" ? 1.45 : x.kind === "hajj" ? 1.3 : x.kind === "high" ? 1.3 : 1.05);
    return f;
  }
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const dow = day => new Date(day + "T12:00:00Z").getUTCDay();

  function airlinesFor(o, d) {
    const c = cityByIata(d) || {}, base = ["SV", "XY", "F3"];
    const by = { AE: ["EK", "FZ"], QA: ["QR"], BH: ["GF"], KW: ["KU", "J9"], OM: ["WY"], EG: ["MS", "E5"], JO: ["RJ"], LB: ["ME"], TR: ["TK", "PC"],
      GB: ["BA", "EK", "QR"], FR: ["AF", "EK"], IT: ["AZ", "TK"], ES: ["IB", "TK"], DE: ["LH", "TK"], CH: ["LX", "EK"], AT: ["OS", "TK"], NL: ["KL"],
      MY: ["MH", "QR", "EK"], ID: ["GA", "EK"], TH: ["TG", "EY"], SG: ["SQ", "EK"], JP: ["JL", "QR"], KR: ["KE", "EK"], MA: ["AT"], TN: ["TU"],
      AZ: ["J2", "FZ"], GE: ["FZ", "A9"], MV: ["EK", "QR"], IN: ["6E", "AI"], US: ["SV", "EK"] };
    return base.concat(by[c.country] || ["EK", "QR", "TK"]);
  }

  function tickets(o, d, day, ret, direct, n = 18) {
    const dist = km(o, d), r = rnd(`${o}${d}${day}${ret}`);
    const out = [];
    const als = airlinesFor(o, d);
    const domestic = (cityByIata(d) || {}).country === "SA" || COORDS[d];
    for (let i = 0; i < n; i++) {
      const al = als[Math.floor(r() * als.length)];
      const own = ["SV", "XY", "F3"].includes(al) || (cityByIata(d) && airlinesFor(o, d).slice(3).includes(al) && r() > .5);
      let transfers = dist < 1800 || own ? (r() < .82 ? 0 : 1) : (r() < .35 ? 0 : r() < .8 ? 1 : 2);
      if (domestic) transfers = 0;
      if (direct && transfers) continue;
      const lowcost = META.baggage[al] != null;
      let price = (dist * 0.33 + 230) * season(day) * (dow(day) === 4 ? 1.1 : 1) * (0.78 + r() * 0.5) * (lowcost ? 0.78 : 1) * (transfers ? 0.88 : 1);
      if (ret) price *= 1.72 * season(ret) / Math.max(1, season(day) * 0.8);
      const dur = Math.round(dist / 780 * 60 + 35 + transfers * (90 + r() * 140));
      const h = Math.floor(r() * 24), m = [0, 10, 20, 35, 45, 55][Math.floor(r() * 6)];
      const dep = `${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+03:00`;
      let retAt = null;
      if (ret) { const h2 = Math.floor(r() * 24); retAt = `${ret}T${String(h2).padStart(2, "0")}:15:00+03:00`; }
      out.push({
        source: "تجريبي", cached: true, demo: true, origin: o, destination: d, origin_airport: o, destination_airport: d,
        price: Math.round(price / 5) * 5, airline: al, flight_number: String(100 + Math.floor(r() * 1800)),
        departure_at: dep, return_at: retAt, transfers, return_transfers: ret ? transfers : null,
        duration_to: dur, duration_back: ret ? dur + Math.round(r() * 40 - 20) : null, duration: ret ? dur * 2 : dur,
        link: `https://www.aviasales.com/search/${o}${day.slice(8, 10)}${day.slice(5, 7)}${d}${ret ? ret.slice(8, 10) + ret.slice(5, 7) : ""}1`
      });
    }
    return out.sort((a, b) => a.price - b.price);
  }
  const cheapest = (o, d, day, ret, direct) => { const t = tickets(o, d, day, ret, direct, 10); return t[0] || null; };
  function monthDays(month) {
    const [y, m] = month.split("-").map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate(), today = iso(new Date());
    const out = [];
    for (let i = 1; i <= last; i++) { const d = `${month}-${String(i).padStart(2, "0")}`; if (d >= today) out.push(d); }
    return out;
  }
  function monthsAhead(n = 12) {
    const t = new Date(), out = [];
    for (let i = 0; i < n; i++) { const d = new Date(Date.UTC(t.getFullYear(), t.getMonth() + i, 1)); out.push(iso(d).slice(0, 7)); }
    return out;
  }

  // ---------- hotels
  function cityTier(c) {
    if (c.id === "g293993") return 640; if (c.id === "g298551") return 430;
    const t = { SA: 380, AE: 520, QA: 480, BH: 360, KW: 400, OM: 360, EG: 270, JO: 330, LB: 380, IQ: 300, TR: 360, GB: 720, IE: 600, FR: 690, IT: 560,
      ES: 480, AT: 520, CZ: 380, DE: 520, CH: 900, NL: 640, HU: 340, PL: 320, GR: 420, BG: 260, BA: 230, AZ: 300, GE: 240, RU: 300, MY: 260, ID: 280,
      TH: 240, SG: 620, JP: 520, KR: 420, HK: 560, CN: 360, VN: 200, MV: 1500, LK: 250, IN: 260, MA: 340, TN: 240, TZ: 420, KE: 380, ZA: 420, US: 820, AU: 620 };
    return t[c.country] || 400;
  }
  function hotelsOf(cid) {
    const c = CITIES.find(x => x.id === cid); if (!c) return [];
    const r = rnd("h" + cid), lm = c.landmarks[0];
    return NAMES.map((n, i) => {
      const stars = 3 + Math.floor(r() * 3), rating = Math.round((3.5 + r() * 1.4) * 10) / 10;
      const spread = c.id === "g293993" || c.id === "g298551" ? 0.018 : 0.045;
      const lat = lm.lat + (r() - .5) * spread * (1 + i / 12), lng = lm.lng + (r() - .5) * spread * (1 + i / 12);
      return { id: `${cid}-demo${i}`, name: `${n} ${c.ar}`, type: i % 7 === 3 ? "Apartment" : "Hotel", rating, reviews: Math.floor(80 + r() * 6000),
        stars, lat, lng, image: null, url: null, breakfast: r() > .55, free_cancel: r() > .45, base: cityTier(c) * (0.55 + stars * 0.17) * (0.7 + r() * 0.6),
        demo: true, source: "تجريبي" };
    });
  }
  function hotelNight(h, day, perRoom) {
    const r = rnd(h.id + day);
    let f = season(day);
    if (h.id.startsWith("g293993") || h.id.startsWith("g298551")) {
      const s = (window.DUROOB_SEASONS || META.seasons).find(s => day >= s.from && day <= s.to && (s.kind === "ramadan" || s.kind === "hajj"));
      if (s) f *= s.kind === "hajj" ? 2.6 : (day >= addDays(s.to, -10) ? 2.3 : 1.3);
    }
    const wd = dow(day); if (wd === 4 || wd === 5) f *= 1.12;
    return Math.round(h.base * f * (0.9 + r() * 0.2) * (perRoom > 2 ? 1 + (perRoom - 2) * 0.18 : 1));
  }
  function ratesFor(h, chkIn, chkOut, perRoom) {
    const nights = Math.max(1, (new Date(chkOut) - new Date(chkIn)) / 864e5);
    let sum = 0; for (let i = 0; i < nights; i++) sum += hotelNight(h, addDays(chkIn, i), perRoom);
    const night = sum / nights, r = rnd(h.id + chkIn + "sites");
    const n = 2 + Math.floor(r() * 4);
    const sites = SITES.slice().sort(() => r() - .5).slice(0, n);
    return sites.map(s => ({ code: s, site: s, night: Math.round(night * (0.95 + r() * 0.12)), link: null })).sort((a, b) => a.night - b.night);
  }
  function hotelSearch(q) {
    const per = roomQuery(q);
    return hotelsOf(q.city).map(h => {
      const rates = ratesFor(h, q.checkin, q.checkout, per.per_room);
      return Object.assign({}, h, { rates, night: rates[0].night });
    });
  }
  function roomQuery(q) {
    const kids = String(q.children || "").split(",").filter(Boolean).map(Number);
    const beds = Number(q.adults || 2) + kids.filter(a => a >= 2).length, rooms = Math.max(1, Number(q.rooms || 1));
    return { per_room: Math.max(1, Math.min(4, Math.ceil(beds / rooms))), rooms };
  }

  function histPoints(base, seed) {
    const r = rnd(seed), now = Date.now() / 1000, pts = [];
    for (let i = 30; i >= 1; i--) pts.push({ at: Math.round(now - i * 86400), price: Math.round(base * (0.9 + r() * 0.3)) });
    pts.push({ at: Math.round(now), price: base });
    const prices = pts.map(p => p.price), sorted = prices.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    const v = base <= sorted[0] * 1.02 ? "lowest" : base < med * .95 ? "good" : base > med * 1.08 ? "high" : "normal";
    return { points: pts, min: sorted[0], max: sorted[sorted.length - 1], median: med, current: base, verdict: v, demo: true };
  }

  const LS = {
    get(k, d) { try { const v = localStorage.getItem("duroob:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("duroob:" + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };

  const routes = {
    "settings"(q, body) {
      const s = LS.get("settings", { home: "RUH" });
      if (body) { Object.assign(s, body); if (body.tp_token != null) s.has_tp = !!body.tp_token; if (body.serp_key != null) s.has_serp = !!body.serp_key; delete s.tp_token; delete s.serp_key; LS.set("settings", s); }
      return Object.assign({ has_tp: false, has_serp: false, home: "RUH", use_serp_hotels: true, use_serp_flights: false, demo: true }, s);
    },
    "places"(q) {
      const t = (q.term || "").trim().toLowerCase(); if (!t) return [];
      const list = CITIES.filter(c => c.iata).map(c => ({ code: c.iata, name: c.ar, city: c.ar, type: "city", country: c.country, country_code: c.country, lat: c.lat, lng: c.lng }))
        .concat(EXTRA_AIRPORTS.map(a => ({ code: a.code, name: a.ar, city: a.ar, type: "city", country: "السعودية", country_code: "SA" })));
      const seen = new Set();
      return list.filter(p => (p.name.includes(t) || p.code.toLowerCase().startsWith(t) || (CITIES.find(c => c.iata === p.code) || { en: "" }).en.toLowerCase().startsWith(t)) && !seen.has(p.code) && seen.add(p.code)).slice(0, 8);
    },
    "flights/search"(q) {
      const day = q.depart.length === 7 ? monthDays(q.depart)[0] : q.depart;
      const ret = q.return ? (q.return.length === 7 ? addDays(day, 7) : q.return) : null;
      return { tickets: tickets(q.origin, q.destination, day, ret, q.direct === "1"), insights: null, demo: true };
    },
    "flights/calendar"(q) {
      const one = q.one_way !== "0";
      if (q.year === "1") {
        const months = {};
        for (const m of monthsAhead(12)) {
          let best = null;
          for (const d of monthDays(m).filter((_, i) => i % 2 === 0)) {
            const t = cheapest(q.origin, q.destination, d, one ? null : addDays(d, Number(q.nights || 7)), q.direct === "1");
            if (t && (!best || t.price < best.price)) best = t;
          }
          months[m] = best;
        }
        return { months, demo: true };
      }
      const days = {};
      for (const d of monthDays(q.month)) days[d] = cheapest(q.origin, q.destination, d, one ? null : addDays(d, Number(q.nights || 7)), q.direct === "1");
      return { days, demo: true };
    },
    "flights/anywhere"(q) {
      const day = monthDays(q.month)[Math.min(5, monthDays(q.month).length - 1)];
      const out = [];
      for (const c of CITIES) {
        if (!c.iata || c.iata === q.origin) continue;
        let best = null;
        for (const d of [day, addDays(day, 6), addDays(day, 13)]) { const t = cheapest(q.origin, c.iata, d, q.one_way === "0" ? addDays(d, 7) : null); if (t && (!best || t.price < best.price)) best = t; }
        if (best) out.push(best);
      }
      const seen = new Set();
      return { tickets: out.sort((a, b) => a.price - b.price).filter(t => !seen.has(t.destination) && seen.add(t.destination)), demo: true };
    },
    "hotels/search"(q) {
      const per = roomQuery(q);
      return { hotels: hotelSearch(q), nights: Math.round((new Date(q.checkout) - new Date(q.checkin)) / 864e5), per_room: per.per_room, rooms: per.rooms, source: "تجريبي", demo: true };
    },
    "hotels/rates"(q) {
      const cid = q.id.split("-demo")[0], h = hotelsOf(cid).find(x => x.id === q.id);
      return { rates: h ? ratesFor(h, q.checkin, q.checkout, roomQuery(q).per_room) : [], demo: true };
    },
    "hotels/calendar"(q) {
      const hs = hotelsOf(q.city).slice(0, 4);
      const med = day => { const p = hs.map(h => hotelNight(h, day, 2)).sort((a, b) => a - b); return p[Math.floor(p.length / 2)]; };
      if (q.year === "1") {
        const months = {};
        for (const m of monthsAhead(12)) { const ds = monthDays(m); const d = ds[Math.min(14, ds.length - 1)] || `${m}-15`; months[m] = { price: med(d), sample: d }; }
        return { months, demo: true };
      }
      const days = {};
      const all = monthDays(q.month).map(d => [d, med(d)]);
      const sorted = all.map(x => x[1]).sort((a, b) => a - b);
      for (const [d, p] of all) days[d] = { price: p, level: p <= sorted[Math.floor(sorted.length * .33)] ? "cheap" : p >= sorted[Math.floor(sorted.length * .7)] ? "high" : "average" };
      return { days, demo: true };
    },
    "trip"(q) {
      const c = CITIES.find(x => x.id === q.city), nights = Number(q.nights || 5), per = roomQuery(q);
      const cands = [];
      for (const m of (q.months || "").split(",").filter(Boolean)) for (const d of monthDays(m)) { const t = cheapest(q.origin, c.iata, d, addDays(d, nights)); if (t) cands.push([d, t]); }
      cands.sort((a, b) => a[1].price - b[1].price);
      const hs = hotelsOf(q.city);
      const windows = cands.slice(0, 6).map(([d, t]) => {
        const ret = addDays(d, nights);
        let best = null;
        for (const h of hs.slice(0, 10)) { const r = ratesFor(h, d, ret, per.per_room)[0]; if (!best || r.night < best.night) best = { id: h.id, name: h.name, rating: h.rating, night: r.night, site: r.site, lat: h.lat, lng: h.lng }; }
        return { depart: d, return: ret, nights, flight: t, hotel: best, rooms: per.rooms };
      });
      return { windows, demo: true };
    },
    "history"(q) {
      const base = Number(q.current || 1000);
      return histPoints(base, q.kind + q.key + (q.day || ""));
    },
    "watch/check"() {
      const ws = LS.get("store:watches", []) || [];
      const results = ws.map(w => {
        const r = rnd(w.id + new Date().toDateString());
        const price = Math.round((w.last || 1000) * (0.9 + r() * 0.16));
        const res = { id: w.id, price, prev: w.last, dropped: price < (w.last || 0), below_target: !!(w.target && price <= w.target), history: histPoints(price, w.id) };
        w.last = price; w.checked = Math.round(Date.now() / 1000);
        return res;
      });
      LS.set("store:watches", ws);
      return { results, watches: ws, demo: true };
    }
  };

  window.DuroobDemo = {
    init(cities) { CITIES = cities; },
    call(path, q, body) {
      if (path.startsWith("store/")) {
        const k = "store:" + path.slice(6);
        if (body) LS.set(k, body.value);
        return { value: LS.get(k, null) };
      }
      const fn = routes[path];
      if (!fn) throw new Error("demo: unknown " + path);
      return fn(q || {}, body);
    }
  };
})();
