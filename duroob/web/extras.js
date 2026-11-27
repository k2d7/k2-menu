/* Duroob — destination facts (country card, prayer times, qibla), packing list, reminders, share card, plain-language search. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ country card
  // tz: IANA zone · plugs · drive side · emergency number · currency
  const COUNTRY = {
    SA: ["Asia/Riyadh", "G", "R", "911", "SAR"], AE: ["Asia/Dubai", "G", "R", "999", "AED"], QA: ["Asia/Qatar", "G", "R", "999", "QAR"],
    BH: ["Asia/Bahrain", "G", "R", "999", "BHD"], KW: ["Asia/Kuwait", "G, C", "R", "112", "KWD"], OM: ["Asia/Muscat", "G", "R", "9999", "OMR"],
    EG: ["Africa/Cairo", "C, F", "R", "122", "EGP"], JO: ["Asia/Amman", "C, F, G", "R", "911", "JOD"], LB: ["Asia/Beirut", "C, D, G", "R", "112", "LBP"],
    IQ: ["Asia/Baghdad", "C, D, G", "R", "104", "IQD"], MA: ["Africa/Casablanca", "C, E", "R", "19", "MAD"], TN: ["Africa/Tunis", "C, E", "R", "197", "TND"],
    TR: ["Europe/Istanbul", "C, F", "R", "112", "TRY"], AZ: ["Asia/Baku", "C, F", "R", "112", "AZN"], GE: ["Asia/Tbilisi", "C, F", "R", "112", "GEL"],
    BA: ["Europe/Sarajevo", "C, F", "R", "112", "BAM"], RU: ["Europe/Moscow", "C, F", "R", "112", "RUB"], GB: ["Europe/London", "G", "L", "999", "GBP"],
    IE: ["Europe/Dublin", "G", "L", "112", "EUR"], FR: ["Europe/Paris", "C, E", "R", "112", "EUR"], IT: ["Europe/Rome", "C, F, L", "R", "112", "EUR"],
    ES: ["Europe/Madrid", "C, F", "R", "112", "EUR"], AT: ["Europe/Vienna", "C, F", "R", "112", "EUR"], CZ: ["Europe/Prague", "C, E", "R", "112", "CZK"],
    DE: ["Europe/Berlin", "C, F", "R", "112", "EUR"], CH: ["Europe/Zurich", "C, J", "R", "112", "CHF"], NL: ["Europe/Amsterdam", "C, F", "R", "112", "EUR"],
    HU: ["Europe/Budapest", "C, F", "R", "112", "HUF"], PL: ["Europe/Warsaw", "C, E", "R", "112", "PLN"], GR: ["Europe/Athens", "C, F", "R", "112", "EUR"],
    BG: ["Europe/Sofia", "C, F", "R", "112", "EUR"], MY: ["Asia/Kuala_Lumpur", "G", "L", "999", "MYR"], ID: ["Asia/Jakarta", "C, F", "L", "112", "IDR"],
    TH: ["Asia/Bangkok", "A, B, C, O", "L", "191", "THB"], SG: ["Asia/Singapore", "G", "L", "999", "SGD"], JP: ["Asia/Tokyo", "A, B", "L", "110", "JPY"],
    KR: ["Asia/Seoul", "C, F", "R", "112", "KRW"], HK: ["Asia/Hong_Kong", "G", "L", "999", "HKD"], CN: ["Asia/Shanghai", "A, C, I", "R", "110", "CNY"],
    VN: ["Asia/Ho_Chi_Minh", "A, C", "R", "113", "VND"], MV: ["Indian/Maldives", "G, D", "L", "119", "MVR"], LK: ["Asia/Colombo", "D, G", "L", "119", "LKR"],
    IN: ["Asia/Kolkata", "C, D, M", "L", "112", "INR"], TZ: ["Africa/Dar_es_Salaam", "D, G", "L", "112", "TZS"], KE: ["Africa/Nairobi", "G", "L", "999", "KES"],
    ZA: ["Africa/Johannesburg", "M, N", "L", "10111", "ZAR"], US: ["America/New_York", "A, B", "R", "911", "USD"], AU: ["Australia/Sydney", "I", "L", "000", "AUD"]
  };
  const CITY_TZ = { g32655: "America/Los_Angeles", g294226: "Asia/Makassar", g298507: "Europe/Moscow" };
  function tzOffset(tz, date) {
    // minutes ahead of UTC for this zone on this date
    const d = date || new Date();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
    const g = t => Number(parts.find(p => p.type === t).value);
    const asUTC = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
    return Math.round((asUTC - d.getTime()) / 60000);
  }
  function countryCard(city, dateStr) {
    const c = COUNTRY[city.country]; if (!c) return null;
    const tz = CITY_TZ[city.id] || c[0], date = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();
    const diff = (tzOffset(tz, date) - tzOffset("Asia/Riyadh", date)) / 60;
    const adapter = !c[1].split(", ").includes("G");
    return { tz, diff, plugs: c[1], adapter, drive: c[2], emergency: c[3], currency: c[4] };
  }

  // ------------------------------------------------------------------ prayer times (Umm al-Qura: Fajr 18.5°, Isha 90 min after Maghrib) + qibla
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  function sunPos(jd) {
    const D = jd - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
    const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
    return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fix(RA, 24) };
  }
  function prayerTimes(dateStr, lat, lng, tz) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const jd0 = (() => { let Y = y, M = m; if (M <= 2) { Y -= 1; M += 12; } const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5; })() - lng / 360;
    const mid = t => fix(12 - sunPos(jd0 + t).eqt, 24);
    const angleTime = (angle, t, ccw) => {
      const s = sunPos(jd0 + t), x = (-Math.sin(rad(angle)) - Math.sin(rad(s.decl)) * Math.sin(rad(lat))) / (Math.cos(rad(s.decl)) * Math.cos(rad(lat)));
      const T = deg(Math.acos(Math.max(-1, Math.min(1, x)))) / 15; return mid(t) + (ccw ? -T : T);
    };
    const asr = t => { const s = sunPos(jd0 + t); const a = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - s.decl)))))); return angleTime(a, t); };
    const off = tzOffset(tz, new Date(dateStr + "T12:00:00Z")) / 60, adj = h => h + off - lng / 15;
    const times = { fajr: adj(angleTime(18.5, 5 / 24, true)), sunrise: adj(angleTime(0.833, 6 / 24, true)), dhuhr: adj(mid(12 / 24)), asr: adj(asr(13 / 24)), maghrib: adj(angleTime(0.833, 18 / 24)) };
    times.isha = times.maghrib + 1.5;
    const fmt = h => { h = fix(h + 0.5 / 60, 24); const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
    return Object.fromEntries(Object.entries(times).map(([k, v]) => [k, fmt(v)]));
  }
  function qibla(lat, lng) {
    const k = [21.4225, 39.8262], p1 = rad(lat), p2 = rad(k[0]), dl = rad(k[1] - lng);
    return fix(deg(Math.atan2(Math.sin(dl), Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl))), 360);
  }

  // ------------------------------------------------------------------ packing list
  function packingList({ city, month, nights, party, umrah, country }) {
    const cl = city && window.D.climateOf(city.id, month), cc = city ? COUNTRY[city.country] : null, n = Math.max(1, Math.min(nights || 4, 10));
    const g = [];
    g.push([tx("الأوراق"), [tx("جواز السفر") + (umrah || (city && city.country === "SA") ? " " + tx("أو الهوية") : ""), tx("التأشيرة أو التصريح"), tx("التذاكر وحجز الفندق (نسخة على الجوال)"), tx("بطاقة بنكية ومبلغ كاش") + (cc ? ` (${cc[4]})` : ""), tx("تأمين السفر")]]);
    const clothes = [`${n} ${tx("طقم ملابس")}`, tx("ملابس نوم"), tx("حذاء مريح للمشي")];
    if (cl) {
      const avg = (cl.hi + cl.lo) / 2;
      if (avg < 12) clothes.push(tx("جاكيت شتوي"), tx("قفازات وشال"), tx("ملابس حرارية"));
      else if (avg < 20) clothes.push(tx("جاكيت خفيف"), tx("بلوفر"));
      else clothes.push(tx("ملابس صيفية خفيفة"), tx("نظارة شمس"), tx("واقي شمس"), tx("قبعة"));
      if (cl.rain >= 5) clothes.push(tx("مظلة أو جاكيت مطر"));
    }
    g.push([tx("الملابس"), clothes]);
    const tech = [tx("شاحن الجوال"), tx("باور بانك")];
    if (cc && !cc[1].split(", ").includes("G")) tech.push(tx("محوّل كهرباء نوع") + ` ${cc[1]}`);
    g.push([tx("الأجهزة"), tech]);
    g.push([tx("الصحة"), [tx("أدويتك الشخصية"), tx("معقّم ومناديل"), tx("مسكن للصداع"), tx("كمامة للطيران")]]);
    if (umrah) g.push([tx("العمرة"), [tx("ملابس الإحرام للرجال"), tx("حزام الإحرام"), tx("نعال مريحة"), tx("سجادة صلاة صغيرة"), tx("مصحف أو تطبيق"), tx("كيس للأحذية في الحرم")]]);
    if (party && (party.children || party.infants)) {
      const kids = [tx("ألعاب وكتب للطريق"), tx("وجبات خفيفة"), tx("أدوية الأطفال")];
      if (party.infants) kids.push(tx("حفاضات ومناديل"), tx("حليب ورضّاعة"), tx("عربة أطفال خفيفة"));
      g.push([tx("الأطفال"), kids]);
    }
    g.push([tx("أغراض ثانية"), [tx("أدوات العناية الشخصية"), tx("قفل للشنطة"), tx("كيس للملابس المتسخة")]]);
    return g.map(([group, items]) => ({ group, items: items.map(text => ({ text, done: false })) }));
  }

  // ------------------------------------------------------------------ reminders for a trip
  function makeReminders({ depart, ret, passport, visaKind, umrah }) {
    const D = window.D, out = [], today = D.today();
    const add = (date, text) => out.push({ id: D.uid(), date: date < today ? today : date, text, done: false });
    if (passport && ret && passport < D.addDays(ret, 180)) add(today, tx("جوازك ينتهي قبل ما يكمل ٦ أشهر بعد رجعتك، وأغلب الدول تطلب ٦ أشهر. جدده من أبشر."));
    if (depart) {
      if (visaKind === "schengen") add(D.addDays(depart, -45), tx("قدّم على تأشيرة شنغن الحين، المواعيد تتأخر."));
      else if (["evisa", "eta", "required"].includes(visaKind)) add(D.addDays(depart, -21), tx("قدّم على التأشيرة أو التصريح الإلكتروني."));
      if (umrah) add(D.addDays(depart, -14), tx("احجز تصريح العمرة من تطبيق نسك."));
      add(D.addDays(depart, -7), tx("راجع حجز الفندق والطيران، وجهز قائمة الشنطة."));
      add(D.addDays(depart, -1), tx("سجّل دخول رحلتك واختر مقعدك."));
    }
    return out.sort((a, b) => a.date < b.date ? -1 : 1);
  }

  // ------------------------------------------------------------------ share card (PNG)
  async function shareCard({ title, lines, price, sub }) {
    const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d"), rtl = I18N.RTL, F = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif';
    try { await document.fonts.load(`700 40px ${F}`); } catch (e) { /* use fallback */ }
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#fdf7ec"); bg.addColorStop(1, "#f6e2bf"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // Sadu band
    for (let x = 0; x < W; x += 36) { g.fillStyle = "#8b2b1c"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 18, 24); g.lineTo(x + 36, 0); g.fill(); g.fillStyle = "#1f1812"; g.beginPath(); g.moveTo(x + 18, 24); g.lineTo(x + 36, 48); g.lineTo(x + 36, 24); g.fill(); }
    g.fillStyle = "#b8892e"; g.fillRect(0, 48, W, 6);
    // dunes
    g.fillStyle = "#efd3a2"; g.beginPath(); g.moveTo(0, H - 260); g.bezierCurveTo(300, H - 360, 600, H - 300, W, H - 330); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#e6c286"; g.beginPath(); g.moveTo(0, H - 160); g.bezierCurveTo(400, H - 230, 700, H - 140, W, H - 190); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.direction = rtl ? "rtl" : "ltr"; g.textAlign = rtl ? "right" : "left";
    const X = rtl ? W - 80 : 80, wrap = (text, y, size, weight, color, maxLines = 3) => {
      g.font = `${weight} ${size}px ${F}`; g.fillStyle = color;
      const words = String(text).split(" "); let line = "", n = 0;
      for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > W - 160 && line) { g.fillText(line, X, y); y += size * 1.35; line = w; if (++n >= maxLines) return y; } else line = t; }
      if (line) { g.fillText(line, X, y); y += size * 1.35; } return y;
    };
    g.font = `700 54px ${F}`; g.fillStyle = "#2a2118"; g.fillText(tx("دروب"), X, 150);
    g.font = `400 28px ${F}`; g.fillStyle = "#75695a"; g.fillText(tx("دليلك لأرخص الطرق"), X, 195);
    let y = wrap(title, 330, 64, 700, "#2a2118", 3);
    if (sub) y = wrap(sub, y + 10, 34, 500, "#8b6a22", 2);
    y += 20;
    for (const l of lines || []) y = wrap(l, y, 36, 400, "#3a3024", 2);
    if (price) { g.font = `700 96px ${F}`; g.fillStyle = "#26346f"; g.fillText(price, X, Math.min(H - 380, y + 120)); }
    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    return { blob, url: URL.createObjectURL(blob) };
  }

  // ------------------------------------------------------------------ plain-language search
  const AR_DIGITS = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9 };
  const norm = s => String(s || "").replace(/[٠-٩]/g, d => AR_DIGITS[d]).replace(/ـ/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
  const NUMW = { "واحد": 1, "وحده": 1, "اثنين": 2, "ثنين": 2, "ثلاث": 3, "ثلاثه": 3, "اربع": 4, "اربعه": 4, "خمس": 5, "خمسه": 5, "ست": 6, "سته": 6, "سبع": 7, "سبعه": 7, "ثمان": 8, "ثمانيه": 8, "تسع": 9, "تسعه": 9, "عشر": 10, "عشره": 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const MONTHS = [["يناير", "january", "jan"], ["فبراير", "february", "feb"], ["مارس", "march", "mar"], ["ابريل", "april", "apr"], ["مايو", "may"], ["يونيو", "june", "jun"],
    ["يوليو", "july", "jul"], ["اغسطس", "august", "aug"], ["سبتمبر", "september", "sep"], ["اكتوبر", "october", "oct"], ["نوفمبر", "november", "nov"], ["ديسمبر", "december", "dec"]];
  function numIn(s) { const m = s.match(/\d+(?:[.,]\d+)?/); if (m) return Number(m[0].replace(",", "")); for (const [w, n] of Object.entries(NUMW)) if (new RegExp(`(^|\\s)${w}(\\s|$)`).test(s)) return n; return null; }
  function parseQuery(text) {
    const D = window.D, X = D.X, t = " " + norm(text) + " ", out = { text };
    // places: cities (ar/en), airports, home airports
    const names = [];
    for (const c of X.cities) { names.push([norm(c.ar), { city: c.id, code: c.iata }]); names.push([norm(c.ar).replace(/^ال/, ""), { city: c.id, code: c.iata }]); names.push([c.en.toLowerCase(), { city: c.id, code: c.iata }]); }
    for (const [code, a] of Object.entries(X.airports)) { names.push([norm(a.ar), { code }]); if (a.en) names.push([a.en.toLowerCase(), { code }]); }
    names.sort((a, b) => b[0].length - a[0].length);
    const found = []; let rest = t;
    for (const [n, v] of names) { if (n.length < 3) continue; const i = rest.indexOf(n); if (i >= 0) { found.push(Object.assign({ at: i, name: n }, v)); rest = rest.slice(0, i) + " ".repeat(n.length) + rest.slice(i + n.length); } }
    found.sort((a, b) => a.at - b.at);
    for (const f of found) { const before = t.slice(Math.max(0, f.at - 5), f.at); if (/(من|from)\s*$/.test(before) && !out.origin) out.origin = f; else if (!out.dest) out.dest = f; else if (!out.dest2) out.dest2 = f; }
    // when: month names, seasons, relative words
    const now = new Date(), ms = D.months12();
    MONTHS.forEach((names, i) => { if (names.some(n => new RegExp(`(^|\\s)${n}(\\s|$)`).test(t))) { const m = ms.find(x => Number(x.slice(5)) === i + 1); out.month = m; const day = t.match(new RegExp(`(\\d{1,2})\\s*(?:${names.join("|")})`)); if (day) out.date = `${m}-${String(day[1]).padStart(2, "0")}`; } });
    if (!out.month) {
      if (/الصيف|summer/.test(t)) out.month = ms.find(x => ["07"].includes(x.slice(5))) || ms[0];
      else if (/الشتاء|الشتا|winter/.test(t)) out.month = ms.find(x => ["01", "12"].includes(x.slice(5))) || ms[0];
      else if (/الشهر الجاي|next month/.test(t)) out.month = ms[1];
      else if (/رمضان|ramadan/.test(t)) { const s = D.seasons().find(x => x.kind === "ramadan" && x.to >= D.today()); if (s) out.month = s.from.slice(0, 7); }
      else if (/عيد الاضحي|الاضحي/.test(t)) { const s = D.seasons().find(x => /الأضحى|Adha/.test(x.name) && x.to >= D.today()); if (s) { out.month = s.from.slice(0, 7); out.date = s.from; } }
      else if (/العيد|عيد الفطر|eid/.test(t)) { const s = D.seasons().find(x => /الفطر|Fitr/.test(x.name) && x.to >= D.today()); if (s) { out.month = s.from.slice(0, 7); out.date = s.from; } }
      else if (/بكره|بكرا|tomorrow/.test(t)) out.date = D.addDays(D.today(), 1);
      else if (/الاسبوع الجاي|next week/.test(t)) out.date = D.addDays(D.today(), 7);
      if (out.date && !out.month) out.month = out.date.slice(0, 7);
    }
    // nights
    let m = t.match(/(\d+|[^\s]+)\s*(ليالي|ليله|ليال|ايام|يوم|nights?|days?)/);
    if (/ليلتين|يومين/.test(t)) out.nights = 2; else if (/اسبوعين|two weeks/.test(t)) out.nights = 14; else if (/اسبوع|week/.test(t)) out.nights = 7;
    else if (m) { const n = numIn(m[1]); if (n && n < 60) out.nights = n; }
    // people
    let adults = null, children = 0, infants = 0;
    if (/لحالي|لوحدي|انا بس|alone|just me/.test(t)) adults = 1;
    if (/(انا و(زوجتي|زوجي|المدام|ام العيال|الاهل|اخوي|ربيعي|صديقي))|(me and my (wife|husband))/.test(t)) adults = 2;
    m = t.match(/(\d+|[^\s]+)\s*(اشخاص|شخص|نفر|بالغين|كبار|adults?|people)/); if (m) adults = numIn(m[1]) || adults;
    if (/(ولدين|بنتين|طفلين|ولد وبنت)/.test(t)) children += 2;
    m = t.match(/(\d+|[^\s]+)\s*(اطفال|عيال|بزران|اولاد|بنات|kids|children)/); if (m && numIn(m[1])) children = numIn(m[1]);
    else if (/\s(ولد|بنت|طفل|kid|child)\s/.test(t) && !children) children = 1;
    if (/رضيع|بيبي|baby|infant/.test(t)) infants = 1;
    if (/العائله|عائلتي|العيله|family/.test(t) && adults == null && !children) { const fam = (D.S.groups || []).find(g => /عائل|family/i.test(g.name)); if (fam) out.group = fam; else { adults = 2; children = 2; } }
    if (adults != null || children || infants) out.people = { adults: adults || 1, children, infants };
    // budget
    m = t.match(/(\d[\d,.]*)\s*(الف|k)?\s*(ريال|ر\.?س|sar|درهم|دولار|\$)?/);
    if (/(عندي|ميزاني|ميزانيه|budget|بحدود|ب حدود)/.test(t) && m) out.budget = Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
    // intent
    if (/عمره|umrah/.test(t)) out.intent = "umrah";
    else if (out.budget) out.intent = "budget";
    else if (/وين اروح|وين نسافر|اقترح|وجهات|where (should|to) go|suggest/.test(t)) out.intent = "where";
    else if (/افضل وقت|متي ازور|متي اروح|best time/.test(t)) out.intent = "best";
    else if (out.dest2) out.intent = "multi";
    else if (/فندق|فنادق|سكن|شقه|شقق|hotel/.test(t)) out.intent = "hotels";
    else if (/طيران|تذكره|تذاكر|رحله طيران|flight|ticket/.test(t)) out.intent = "flights";
    else if (out.dest && out.dest.city && out.nights) out.intent = "trip";
    else out.intent = out.dest ? "flights" : "where";
    return out;
  }

  window.DX = { COUNTRY, countryCard, prayerTimes, qibla, packingList, makeReminders, shareCard, parseQuery, tzOffset };
})();
