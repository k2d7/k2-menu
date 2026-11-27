/* Duroob (دروب) — UI. Vanilla JS, no build step. */
(function () {
  "use strict";
  const META = window.DUROOB_META;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const sar = n => n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("en-US") + " ر.س";
  const sarShort = n => n == null ? "" : n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "k" : Math.round(n).toLocaleString("en-US");
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = s => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d || 1, 12); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const today = () => iso(new Date());
  const G = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "short", day: "numeric", month: "short" });
  const GM = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric" });
  const GMs = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long" });
  const HD = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric" });
  const HM = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { month: "long", year: "numeric" });
  const fmtDay = s => s ? G.format(parse(s)) : "";
  const fmtMonth = m => GM.format(parse(m + "-01"));
  const hhmm = s => s && s.length >= 16 ? s.slice(11, 16) : "";
  const dur = m => { if (!m) return ""; const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}س ${mm ? mm + "د" : ""}`.trim() : `${mm}د`; };
  const airline = c => META.airlines[c] || c || "شركة طيران";
  const months12 = () => { const t = new Date(), o = []; for (let i = 0; i < 12; i++) o.push(iso(new Date(t.getFullYear(), t.getMonth() + i, 1)).slice(0, 7)); return o; };
  const defaultMonth = () => months12()[new Date().getDate() > 20 ? 1 : 0];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };

  const ICON = {
    swap: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M7 4L3 8M7 4l4 4M17 20V4m0 16l-4-4m4 4l4-4"/></svg>',
    star: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-3.9-1z"/><path d="M9 10c.5 2 2 3.5 4 4l1.2-1.1 2 1-.6 1.6c-3.5 0-7-3.5-7-7l1.6-.6 1 2z" fill="currentColor" stroke="none"/></svg>',
    out: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
    map: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    filter: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>',
    user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'
  };

  // ------------------------------------------------------------------ data access
  let MODE = "demo"; // "live" when the desktop server answers
  let CITIES = [];
  const S = { settings: {}, groups: [], favorites: [], watches: [], history: [], prefs: {}, seasons: null, baggage: null };

  async function boot() {
    try {
      const r = await Promise.race([fetch("api/ping", { cache: "no-store" }), new Promise((_, j) => setTimeout(() => j(new Error("t")), 1500))]);
      if (r.ok && (await r.json()).app === "duroob") MODE = "live";
    } catch (e) { MODE = "demo"; }
    try { CITIES = await (await fetch("data/cities.json")).json(); } catch (e) { CITIES = window.DUROOB_CITIES || []; }
    window.DuroobDemo.init(CITIES);
    S.settings = await api("settings");
    for (const k of ["groups", "favorites", "watches", "history", "prefs", "seasons", "baggage"]) {
      const v = (await api("store/" + k)).value;
      if (v != null) S[k] = v;
    }
    if (!S.prefs || typeof S.prefs !== "object") S.prefs = {};
    if (!S.prefs.people) S.prefs.people = [{ by: new Date().getFullYear() - 30 }, { by: new Date().getFullYear() - 28 }];
    applySeasons();
    applyTheme(S.prefs.theme);
    window.addEventListener("hashchange", route);
    route();
    if (MODE === "live") {
      setInterval(() => fetch("api/ping").catch(() => {}), 20000);
      setTimeout(() => autoCheckWatches(false), 4000);
      setInterval(() => autoCheckWatches(false), 3 * 3600 * 1000);
    }
  }
  function applySeasons() { window.DUROOB_SEASONS = S.seasons || META.seasons; }
  function seasons() { return S.seasons || META.seasons; }
  function baggage() { return S.baggage || META.baggage; }
  function applyTheme(t) { if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }

  async function api(path, params, body) {
    const q = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString() : "";
    const sp = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
    if (MODE === "demo") return window.DuroobDemo.call(path, sp, body);
    const opt = body !== undefined ? { method: "POST", headers: { "Content-Type": "application/json", "X-Duroob": "1" }, body: JSON.stringify(body) } : {};
    const r = await fetch("api/" + path + q, opt);
    const data = await r.json().catch(() => ({ error: "رد غير مفهوم من البرنامج" }));
    if (!r.ok) {
      if (data.code === "no_tp" || data.code === "no_serp") {
        const d = window.DuroobDemo.call(path, sp, body); d.demo = true; d.reason = data.code; return d;
      }
      const err = new Error(data.error || "صار خطأ"); err.code = data.code; throw err;
    }
    return data;
  }
  async function save(k) { await api("store/" + k, null, { value: S[k] }); }

  // ------------------------------------------------------------------ ui helpers
  let loaderTimer = null;
  function loading(on, text) {
    const el = $("#loader");
    clearTimeout(loaderTimer);
    if (on) { $("#loader-text").textContent = text || "القافلة تدوّر لك على الأسعار…"; loaderTimer = setTimeout(() => { el.hidden = false; }, 250); }
    else el.hidden = true;
  }
  async function withLoad(text, fn) { loading(true, text); try { return await fn(); } finally { loading(false); } }
  function toast(msg, kind) {
    const t = document.createElement("div"); t.className = "toast " + (kind || ""); t.textContent = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  function errorBox(e) { return `<div class="panel empty"><b>ما ضبط البحث</b>${esc(e.message || e)}</div>`; }
  function notice() {
    const el = $("#notice");
    let html = "";
    if (MODE === "demo") html = "<b>نسخة تجربة.</b> كل الأسعار هنا تجريبية للعرض فقط. الأسعار الحقيقية تشتغل في نسخة الكمبيوتر.";
    else if (!S.settings.has_tp) html = `<b>الطيران يعرض أسعار تجريبية</b> لين تحط مفتاح Travelpayouts المجاني. الفنادق أسعارها حقيقية. <a href="#setup">حط المفتاح</a>`;
    el.innerHTML = html ? `<div class="wrap">${html}</div>` : "";
    el.hidden = !html;
  }
  function openDrawer(html) { $("#drawer-body").innerHTML = html; $("#drawer").hidden = false; document.body.style.overflow = "hidden"; $(".drawer-x").focus(); }
  function closeDrawer() { $("#drawer").hidden = true; document.body.style.overflow = ""; }
  document.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(); });
  const seg = (name, opts, val) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${v === val}">${l}</button>`).join("")}</div>`;
  function bindSeg(root, name, cb) {
    const g = $(`[data-seg="${name}"]`, root); if (!g) return;
    g.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $$("button", g).forEach(x => x.setAttribute("aria-pressed", x === b)); cb(b.dataset.v); });
  }
  const segVal = (root, name) => { const b = $(`[data-seg="${name}"] button[aria-pressed="true"]`, root); return b ? b.dataset.v : null; };
  function waLink(text) { return "https://wa.me/?text=" + enc(text); }

  // ------------------------------------------------------------------ travelers
  const year = new Date().getFullYear();
  const ageOf = p => Math.max(0, year - p.by);
  const kindOf = a => a >= 12 ? "adult" : a >= 2 ? "child" : "infant";
  const KIND = { adult: "بالغ", child: "طفل", infant: "رضيع" };
  function party(people) {
    const ps = people || S.prefs.people || [];
    const ages = ps.map(ageOf);
    const adults = ages.filter(a => a >= 12).length || 1, kids = ages.filter(a => a < 12);
    return { adults, children: kids.filter(a => a >= 2).length, infants: kids.filter(a => a < 2).length, childAges: kids, beds: adults + kids.filter(a => a >= 2).length, total: ps.length || 1 };
  }
  function partyLabel(p) {
    const bits = [`${p.adults} ${p.adults > 2 ? "بالغين" : p.adults === 2 ? "بالغين" : "بالغ"}`];
    if (p.children) bits.push(`${p.children} ${p.children > 1 ? "أطفال" : "طفل"}`);
    if (p.infants) bits.push(`${p.infants} ${p.infants > 1 ? "رضّع" : "رضيع"}`);
    return bits.join(" · ");
  }
  function travelersField(id) {
    return `<div class="field" id="${id}"><label>المسافرون</label>
      <button type="button" class="btn trav-btn" data-trav aria-expanded="false"><span data-trav-label>${esc(partyLabel(party()))}</span>${ICON.user}</button>
      <div class="trav-pop" hidden></div></div>`;
  }
  function bindTravelers(root, id, onChange) {
    const box = $("#" + id, root), btn = $("[data-trav]", box), pop = $(".trav-pop", box);
    const draw = () => {
      const ps = S.prefs.people;
      pop.innerHTML = `
        <div class="row" style="justify-content:space-between"><b>مين بيسافر؟</b><span class="small muted">العمر يتحدث تلقائياً كل سنة</span></div>
        ${ps.map((p, i) => `<div class="person"><input class="input" data-name="${i}" placeholder="الاسم (اختياري)" value="${esc(p.name || "")}" aria-label="الاسم">
          <input class="input num" type="number" min="0" max="110" data-age="${i}" value="${ageOf(p)}" aria-label="العمر">
          <span class="row" style="gap:6px;flex-wrap:nowrap"><span class="tag">${KIND[kindOf(ageOf(p))]}</span><button type="button" class="icon-btn" data-del="${i}" aria-label="حذف">✕</button></span></div>`).join("")}
        <div class="chip-set"><button type="button" class="chip" data-add="30">+ بالغ</button><button type="button" class="chip" data-add="8">+ طفل</button><button type="button" class="chip" data-add="1">+ رضيع</button></div>
        <hr class="sep">
        <div class="lbl">مجموعات محفوظة</div>
        <div class="chip-set">${(S.groups || []).map((g, i) => `<button type="button" class="chip" data-group="${i}">${esc(g.name)} (${g.people.length})</button>`).join("") || '<span class="small muted">ما فيه مجموعات للحين</span>'}</div>
        <div class="row"><input class="input grow" id="${id}-gname" placeholder="اسم المجموعة، مثل: العائلة"><button type="button" class="btn btn-ghost btn-sm" data-savegroup>احفظ المجموعة</button></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-primary btn-sm" data-done>تم</button></div>`;
    };
    const changed = () => { $("[data-trav-label]", box).textContent = partyLabel(party()); save("prefs"); onChange && onChange(); };
    btn.addEventListener("click", () => { pop.hidden = !pop.hidden; btn.setAttribute("aria-expanded", !pop.hidden); if (!pop.hidden) draw(); });
    pop.addEventListener("input", e => {
      const a = e.target.dataset.age, n = e.target.dataset.name;
      if (a != null) { const v = Math.max(0, Math.min(110, Number(e.target.value || 0))); S.prefs.people[a].by = year - v; const tag = e.target.parentElement.querySelector(".tag"); if (tag) tag.textContent = KIND[kindOf(v)]; changed(); }
      if (n != null) { S.prefs.people[n].name = e.target.value; save("prefs"); }
    });
    pop.addEventListener("click", async e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.add) { S.prefs.people.push({ by: year - Number(t.dataset.add) }); draw(); changed(); }
      else if (t.dataset.del != null) { if (S.prefs.people.length > 1) { S.prefs.people.splice(Number(t.dataset.del), 1); draw(); changed(); } }
      else if (t.dataset.group != null) { S.prefs.people = JSON.parse(JSON.stringify(S.groups[t.dataset.group].people)); draw(); changed(); }
      else if (t.hasAttribute("data-savegroup")) {
        const name = $("#" + id + "-gname").value.trim() || "مجموعتي";
        S.groups = (S.groups || []).filter(g => g.name !== name).concat([{ name, people: JSON.parse(JSON.stringify(S.prefs.people)) }]);
        await save("groups"); draw(); toast("انحفظت المجموعة: " + name);
      } else if (t.hasAttribute("data-done")) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("click", e => { if (!box.contains(e.target)) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
  }

  // ------------------------------------------------------------------ place inputs
  function placeField(id, label, val) {
    return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" autocomplete="off" placeholder="مدينة أو مطار" value="${esc(val ? val.name + " (" + val.code + ")" : "")}" data-code="${esc(val ? val.code : "")}"><div class="ac-list" hidden></div></div>`;
  }
  function bindPlace(root, id, onPick) {
    const inp = $("#" + id, root), list = inp.nextElementSibling;
    let timer, items = [], on = -1;
    const pick = p => { inp.value = `${p.name} (${p.code})`; inp.dataset.code = p.code; inp.dataset.name = p.name; list.hidden = true; onPick && onPick(p); };
    const draw = () => { list.innerHTML = items.map((p, i) => `<div class="ac-item ${i === on ? "on" : ""}" data-i="${i}"><span>${esc(p.name)}${p.type === "airport" ? "" : ""} <span class="small muted">${esc(p.country || "")}</span></span><span class="code">${esc(p.code)}</span></div>`).join(""); list.hidden = !items.length; };
    inp.addEventListener("input", () => {
      inp.dataset.code = ""; clearTimeout(timer);
      const t = inp.value.trim(); if (t.length < 2) { list.hidden = true; return; }
      timer = setTimeout(async () => { try { items = (await api("places", { term: t })).filter(p => p.code).slice(0, 8); on = -1; draw(); } catch (e) { list.hidden = true; } }, 220);
    });
    inp.addEventListener("keydown", e => {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { on = Math.min(items.length - 1, on + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { on = Math.max(0, on - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && items[on >= 0 ? on : 0]) { pick(items[on >= 0 ? on : 0]); e.preventDefault(); }
    });
    list.addEventListener("mousedown", e => { const it = e.target.closest(".ac-item"); if (it) { e.preventDefault(); pick(items[it.dataset.i]); } });
    inp.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 150));
  }
  const codeOf = el => { const c = el.dataset.code || (el.value.match(/\(([A-Z]{3})\)/) || [])[1] || (/^[A-Za-z]{3}$/.test(el.value.trim()) ? el.value.trim().toUpperCase() : ""); return c.toUpperCase(); };
  function placeName(code) {
    const c = CITIES.find(x => x.iata === code); if (c) return c.ar;
    const a = META.homeAirports.find(x => x.code === code); return a ? a.name : code;
  }
  function cityField(id, label, cid) {
    const c = CITIES.find(x => x.id === cid);
    return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" autocomplete="off" placeholder="اكتب اسم المدينة" value="${esc(c ? c.ar : "")}" data-city="${esc(c ? c.id : "")}"><div class="ac-list" hidden></div></div>`;
  }
  function bindCity(root, id, onPick) {
    const inp = $("#" + id, root), list = inp.nextElementSibling;
    let items = [], on = -1;
    const pick = c => { inp.value = c.ar; inp.dataset.city = c.id; list.hidden = true; onPick && onPick(c); };
    const draw = () => { list.innerHTML = items.map((c, i) => `<div class="ac-item ${i === on ? "on" : ""}" data-i="${i}"><span>${esc(c.ar)} <span class="small muted">${esc(c.en)}</span></span><span class="code">${esc(c.country)}</span></div>`).join(""); list.hidden = !items.length; };
    const filter = () => { const t = inp.value.trim().toLowerCase().replace(/^ال/, ""); items = CITIES.filter(c => !t || c.ar.replace(/^ال/, "").includes(t) || c.ar.includes(t) || c.en.toLowerCase().includes(t)).slice(0, 10); on = -1; draw(); };
    inp.addEventListener("input", () => { inp.dataset.city = ""; filter(); });
    inp.addEventListener("focus", filter);
    inp.addEventListener("keydown", e => {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { on = Math.min(items.length - 1, on + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { on = Math.max(0, on - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && items[on >= 0 ? on : 0]) { pick(items[on >= 0 ? on : 0]); e.preventDefault(); }
    });
    list.addEventListener("mousedown", e => { const it = e.target.closest(".ac-item"); if (it) { e.preventDefault(); pick(items[it.dataset.i]); } });
    inp.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 150));
  }

  // ------------------------------------------------------------------ seasons + calendar
  function seasonsOn(day) { return seasons().filter(s => day >= s.from && day <= s.to); }
  function levelOf(price, sorted) {
    if (price == null || !sorted.length) return "";
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.33)], q2 = sorted[Math.floor((sorted.length - 1) * 0.7)];
    return price <= q1 ? "l-cheap" : price >= q2 ? "l-high" : "l-mid";
  }
  function monthCalendar(month, cells, opts = {}) {
    // cells: { "YYYY-MM-DD": { price, level?, label? } }
    const [y, m] = month.split("-").map(Number), first = new Date(y, m - 1, 1, 12), last = new Date(y, m, 0).getDate();
    const prices = Object.values(cells).map(c => c && c.price).filter(p => p != null).sort((a, b) => a - b);
    const min = prices[0], t = today();
    const dows = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");
    for (let i = 0; i < first.getDay(); i++) html += "<div></div>";
    for (let d = 1; d <= last; d++) {
      const day = `${month}-${String(d).padStart(2, "0")}`, c = cells[day], dt = parse(day), wd = dt.getDay();
      const past = day < t, ss = seasonsOn(day);
      const lv = c && c.price != null ? levelOf(c.price, prices) : c && c.level ? { cheap: "l-cheap", average: "l-mid", high: "l-high" }[c.level] : "";
      const disabled = past || (opts.onlyDow != null && wd !== opts.onlyDow);
      html += `<button type="button" class="cal-day ${lv} ${wd === 5 || wd === 6 ? "weekend" : ""} ${c && c.price === min && min != null ? "min" : ""} ${opts.sel === day ? "sel" : ""}" data-day="${day}" ${disabled ? "disabled" : ""}
        title="${esc(ss.map(s => s.name + (s.note ? " — " + s.note : "")).join(" · "))}">
        <span class="d">${d}<span class="h">${esc(HD.format(dt))}</span></span>
        ${ss.length ? `<span class="season season-${ss[0].kind}"></span>` : "<span></span>"}
        <span class="p ${c && c.price != null ? "" : "none"}">${past ? "" : c && c.price != null ? sarShort(c.price) + (c.tag ? ` <span class="small muted">${esc(c.tag)}</span>` : "") : c && c.level ? { cheap: "رخيص", average: "متوسط", high: "غالي" }[c.level] : "—"}</span></button>`;
    }
    const hij = `${HM.format(first)} – ${HM.format(new Date(y, m - 1, last, 12))}`;
    return `<div class="panel cal">
      <div class="cal-head"><div><div class="cal-title">${esc(fmtMonth(month))}</div><div class="cal-hijri">${esc(hij)}</div></div>
        <div class="row">${opts.nav ? `<button type="button" class="btn btn-ghost btn-sm" data-cal-prev>‹ الشهر اللي قبل</button><button type="button" class="btn btn-ghost btn-sm" data-cal-next>الشهر الجاي ›</button>` : ""}</div></div>
      <div class="cal-grid">${html}</div>
      ${legend(opts.unit)}
      ${opts.note ? `<p class="small muted" style="margin:6px 0 0">${opts.note}</p>` : ""}</div>`;
  }
  function legend(unit) {
    const kinds = [["season-ramadan", "رمضان"], ["season-hajj", "الحج"], ["season-holiday", "إجازة / عيد"], ["season-high", "موسم مزدحم"]];
    return `<div class="legend"><span><i class="sw" style="background:var(--cheap-bg);border:1px solid var(--cheap)"></i>أرخص</span><span><i class="sw" style="background:var(--mid-bg)"></i>متوسط</span><span><i class="sw" style="background:var(--high-bg)"></i>أغلى</span>
      ${kinds.map(([c, l]) => `<span><i class="sw ${c}"></i>${l}</span>`).join("")}<span>${unit || "الأسعار بالريال"}</span></div>`;
  }
  function yearCalendar(cells, note) {
    // cells: { "YYYY-MM": { price, tag } }
    const ms = months12();
    const prices = ms.map(m => cells[m] && cells[m].price).filter(p => p != null).sort((a, b) => a - b);
    const min = prices[0], max = prices[prices.length - 1];
    return `<div class="panel cal"><div class="cal-head"><div class="cal-title">السنة كاملة · أرخص سعر بكل شهر</div><span class="small muted">اضغط على الشهر يفتح لك أيامه</span></div>
      <div class="year-grid">${ms.map(m => {
        const c = cells[m] || {}, ss = seasons().filter(s => s.from.slice(0, 7) <= m && s.to.slice(0, 7) >= m);
        const pct = c.price != null && max ? Math.max(8, Math.round(c.price / max * 100)) : 0;
        return `<button type="button" class="ycell ${levelOf(c.price, prices)} ${c.price === min && min != null ? "min" : ""}" data-month="${m}">
          <span class="m"><span>${esc(GMs.format(parse(m + "-01")))}</span><span class="small muted">${m.slice(0, 4)}</span></span>
          <span class="p">${c.price != null ? sar(c.price) : "ما فيه بيانات"}</span>
          <span class="bar"><i style="width:${pct}%"></i></span>
          <span class="s">${esc([c.tag, ss.map(s => s.name).join("، ")].filter(Boolean).join(" · "))}</span></button>`;
      }).join("")}</div>${legend()}${note ? `<p class="small muted" style="margin:6px 0 0">${note}</p>` : ""}</div>`;
  }

  // ------------------------------------------------------------------ favorites / watches / history
  function isFav(id) { return (S.favorites || []).some(f => f.id === id); }
  async function toggleFav(item) {
    if (isFav(item.id)) S.favorites = S.favorites.filter(f => f.id !== item.id);
    else S.favorites = [Object.assign({ saved: Date.now() }, item)].concat(S.favorites || []);
    await save("favorites");
    toast(isFav(item.id) ? "انضاف للمفضلة" : "انشال من المفضلة");
    return isFav(item.id);
  }
  async function addWatch(w) {
    S.watches = (S.watches || []).filter(x => x.id !== w.id);
    S.watches.unshift(Object.assign({ created: Date.now() }, w));
    await save("watches");
    toast("بنراقب السعر ونعلمك إذا نزل. تلقاها في «متابعاتي»", "good");
  }
  async function remember(kind, label, params) {
    const key = kind + JSON.stringify(params);
    S.history = [{ kind, label, params, at: Date.now(), key }].concat((S.history || []).filter(h => h.key !== key)).slice(0, 30);
    await save("history");
  }
  async function autoCheckWatches(manual) {
    if (!S.watches || !S.watches.length) { if (manual) toast("ما عندك متابعات للحين"); return null; }
    const last = Number(S.prefs.lastCheck || 0);
    if (!manual && Date.now() - last < 3 * 3600 * 1000) return null;
    let res;
    try { res = await api("watch/check", null, {}); } catch (e) { if (manual) toast(e.message); return null; }
    S.watches = res.watches; S.prefs.lastCheck = Date.now(); save("prefs");
    const drops = res.results.filter(r => r.dropped || r.below_target);
    for (const d of drops) {
      const w = S.watches.find(x => x.id === d.id);
      const msg = `نزل السعر: ${w ? w.label : ""} صار ${sar(d.price)}`;
      toast(msg, "good");
      try { if ("Notification" in window && Notification.permission === "granted") new Notification("دروب", { body: msg }); } catch (e) { /* not available */ }
    }
    if (manual && !drops.length) toast("فحصت المتابعات، ما فيه نزول جديد");
    return res;
  }

  // ------------------------------------------------------------------ links
  function gFlights(o, d, dep, ret) { return "https://www.google.com/travel/flights?q=" + enc(`Flights from ${o} to ${d} on ${dep}${ret ? " through " + ret : " one way"}`); }
  function gMaps(name, city) { return "https://www.google.com/maps/search/?api=1&query=" + enc(`${name} ${city || ""}`.trim()); }
  function gHotels(name, city) { return "https://www.google.com/travel/search?q=" + enc(`${name} ${city || ""}`.trim()); }
  function otaLink(site, h, ctx) {
    const q = enc(`${h.name} ${ctx.cityEn || ""}`.trim()), s = (site || "").toLowerCase(), p = ctx.party, n = Math.max(1, diffDays(ctx.checkin, ctx.checkout));
    if (s.includes("booking")) return `https://www.booking.com/searchresults.html?ss=${q}&checkin=${ctx.checkin}&checkout=${ctx.checkout}&group_adults=${p.adults}&group_children=${p.childAges.length}&no_rooms=${ctx.rooms}${p.childAges.map(a => "&age=" + a).join("")}`;
    if (s.includes("agoda")) return `https://www.agoda.com/search?textToSearch=${q}&checkIn=${ctx.checkin}&los=${n}&rooms=${ctx.rooms}&adults=${p.adults}&children=${p.childAges.length}${p.childAges.length ? "&childAges=" + p.childAges.join(",") : ""}`;
    if (s.includes("expedia")) return `https://www.expedia.com/Hotel-Search?destination=${q}&startDate=${ctx.checkin}&endDate=${ctx.checkout}&adults=${p.adults}`;
    if (s.includes("hotels.com")) return `https://www.hotels.com/Hotel-Search?destination=${q}&startDate=${ctx.checkin}&endDate=${ctx.checkout}&adults=${p.adults}`;
    if (s.includes("trip.com")) return `https://www.trip.com/hotels/list?keyword=${q}&checkin=${ctx.checkin.replace(/-/g, "/")}&checkout=${ctx.checkout.replace(/-/g, "/")}&adult=${p.adults}&crn=${ctx.rooms}`;
    return "https://www.google.com/search?q=" + enc(`${h.name} ${ctx.cityEn || ""} ${site || ""}`.trim());
  }

  // ------------------------------------------------------------------ flights
  const F = { mode: "dates", trip: "rt", month: null, cal: null, calDays: null, tickets: [], sort: "best", filters: {}, sel: null, compare: false, weekend: false, lastQ: null };

  function groupPrice(t, p, withBag) {
    let total = t.total_price ? t.price : t.price * p.adults + t.price * 0.75 * p.children + t.price * 0.1 * p.infants;
    let bag = 0;
    const fee = baggage()[t.airline];
    if (withBag && fee && !t.total_price) bag = fee * (p.adults + p.children) * (t.return_at ? 2 : 1);
    return { total: Math.round(total), bag, withBag: Math.round(total + bag), estimated: !t.total_price && (p.children + p.infants > 0 || p.adults > 1) };
  }

  function pageFlights(root) {
    const home = S.settings.home || "RUH";
    const pf = S.prefs.flights || { o: { code: home, name: placeName(home) }, d: { code: "IST", name: "إسطنبول" } };
    const dep0 = pf.dep && pf.dep >= today() ? pf.dep : addDays(today(), 14), ret0 = pf.ret && pf.ret > dep0 ? pf.ret : addDays(dep0, 6);
    F.month = F.month || defaultMonth();
    root.innerHTML = `
      <div class="page-head"><div><h1>الطيران</h1><p>دوّر بتاريخ محدد، أو خل دروب يوريك أرخص الأيام في الشهر أو أرخص شهر في السنة.</p></div></div>
      <form class="panel search-form" id="fform" autocomplete="off">
        <div class="row" style="gap:10px">${seg("trip", [["rt", "ذهاب وعودة"], ["ow", "ذهاب فقط"]], F.trip)}${seg("mode", [["dates", "تاريخ محدد"], ["month", "شهر كامل"], ["year", "السنة كاملة"]], F.mode)}</div>
        <div class="fields">
          ${placeField("f-o", "من", pf.o)}
          <button type="button" class="icon-btn swap" id="f-swap" aria-label="بدّل">${ICON.swap}</button>
          ${placeField("f-d", "إلى", pf.d)}
          <div class="field" data-show="dates"><label for="f-dep">الذهاب</label><input class="input" type="date" id="f-dep" min="${today()}" value="${dep0}"></div>
          <div class="field" data-show="dates rt"><label for="f-ret">العودة</label><input class="input" type="date" id="f-ret" min="${today()}" value="${ret0}"></div>
          <div class="field" data-show="month"><label for="f-month">الشهر</label><select class="input" id="f-month">${months12().map(m => `<option value="${m}" ${m === F.month ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field" data-show="month year rt"><label for="f-nights">مدة الرحلة (ليالي)</label><input class="input num" type="number" id="f-nights" min="1" max="60" value="${pf.nights || 7}"></div>
          ${travelersField("f-trav")}
          <div class="field"><label for="f-cls">الدرجة</label><select class="input" id="f-cls"><option value="1">سياحية</option><option value="2">سياحية مميزة</option><option value="3">أعمال</option><option value="4">أولى</option></select></div>
        </div>
        <div class="checks">
          <label class="check"><input type="checkbox" id="f-direct" ${pf.direct ? "checked" : ""}> مباشر فقط</label>
          <label class="check"><input type="checkbox" id="f-weekend" ${F.weekend ? "checked" : ""}> رحلات نهاية الأسبوع (خميس ← سبت)</label>
          <label class="check"><input type="checkbox" id="f-compare" ${F.compare ? "checked" : ""}> قارن المطارات</label>
          <span class="chip-set" id="f-airports" ${F.compare ? "" : "hidden"}>${["RUH", "JED", "DMM", "MED"].map(c => `<button type="button" class="chip" data-ap="${c}" aria-pressed="${(S.prefs.compareAirports || ["RUH", "JED", "DMM"]).includes(c)}">${placeName(c)}</button>`).join("")}</span>
        </div>
        <div class="form-actions"><span class="small muted" id="f-hint"></span><button class="btn btn-primary" type="submit">دوّر على الرحلات</button></div>
      </form>
      <div id="f-cal"></div>
      <div id="f-res"></div>`;
    const form = $("#fform", root);
    const vis = () => {
      const mode = segVal(form, "mode"), trip = segVal(form, "trip");
      $$("[data-show]", form).forEach(el => { const k = el.dataset.show.split(" "); const modeOk = k.some(x => ["dates", "month", "year"].includes(x)) ? k.includes(mode) : true; const tripOk = k.includes("rt") ? trip === "rt" : true; el.hidden = !(modeOk && tripOk); });
      $("#f-hint").textContent = mode === "dates" ? "" : mode === "month" ? "بيطلع لك تقويم الشهر بأرخص سعر لكل يوم." : "بيطلع لك أرخص سعر لكل شهر في السنة.";
    };
    bindSeg(form, "mode", v => { F.mode = v; vis(); });
    bindSeg(form, "trip", v => { F.trip = v; vis(); });
    vis();
    bindPlace(form, "f-o"); bindPlace(form, "f-d");
    bindTravelers(form, "f-trav", () => F.tickets.length && drawFlightResults());
    $("#f-swap").addEventListener("click", () => {
      const a = $("#f-o"), b = $("#f-d"); [a.value, b.value] = [b.value, a.value]; [a.dataset.code, b.dataset.code] = [b.dataset.code, a.dataset.code];
    });
    $("#f-compare").addEventListener("change", e => { F.compare = e.target.checked; $("#f-airports").hidden = !F.compare; });
    $("#f-weekend").addEventListener("change", e => { F.weekend = e.target.checked; if (F.weekend) { $("#f-nights").value = 2; } });
    $("#f-airports").addEventListener("click", e => { const b = e.target.closest("[data-ap]"); if (!b) return; b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); S.prefs.compareAirports = $$("[data-ap][aria-pressed=true]").map(x => x.dataset.ap); save("prefs"); });
    form.addEventListener("submit", e => { e.preventDefault(); runFlights(root); });
    if (F.tickets.length || F.cal) { drawFlightCal(root); drawFlightResults(); }
    else $("#f-res", root).innerHTML = `<div class="panel empty"><b>جاهز للبحث</b>اختر من وين ولوين، وحدد التاريخ أو الشهر، واضغط «دوّر».</div>`;
  }

  function flightQuery(root) {
    const o = codeOf($("#f-o", root)), d = codeOf($("#f-d", root));
    if (!o || !d) throw new Error("اختر مدينة الإقلاع والوصول من القائمة.");
    if (o === d) throw new Error("مدينة الإقلاع والوصول نفس الشي.");
    const mode = segVal(root, "mode"), rt = segVal(root, "trip") === "rt";
    const origins = F.compare ? Array.from(new Set([o].concat(S.prefs.compareAirports || []))).filter(x => x !== d) : [o];
    const q = { o, d, origins, mode, rt, dep: $("#f-dep", root).value, ret: $("#f-ret", root).value, month: $("#f-month", root).value, nights: Number($("#f-nights", root).value || 7), direct: $("#f-direct", root).checked, cls: $("#f-cls", root).value };
    if (mode === "dates") {
      if (!q.dep) throw new Error("حدد تاريخ الذهاب.");
      if (rt && (!q.ret || q.ret <= q.dep)) throw new Error("تاريخ العودة لازم يكون بعد الذهاب.");
    }
    S.prefs.flights = { o: { code: o, name: $("#f-o", root).dataset.name || placeName(o) }, d: { code: d, name: $("#f-d", root).dataset.name || placeName(d) }, dep: q.dep, ret: q.ret, nights: q.nights, direct: q.direct };
    save("prefs");
    return q;
  }

  async function runFlights(root, overrideDay) {
    let q;
    try { q = flightQuery(root); } catch (e) { toast(e.message); return; }
    F.lastQ = q;
    if (overrideDay) { q.mode = "dates"; q.dep = overrideDay; q.ret = q.rt ? addDays(overrideDay, q.nights) : ""; }
    const label = `${placeName(q.o)} ← ${placeName(q.d)}`;
    try {
      if (q.mode === "dates") {
        F.sel = q.dep;
        const res = await withLoad("القافلة تدوّر على أرخص الرحلات…", () => Promise.all(q.origins.map(o => api("flights/search", { origin: o, destination: q.d, depart: q.dep, return: q.rt ? q.ret : "", direct: q.direct ? 1 : 0, ...partyParams(), cls: q.cls }))));
        F.tickets = res.flatMap(r => r.tickets.map(t => Object.assign(t, { demo: t.demo || r.demo })));
        F.insights = res[0] && res[0].insights;
        F.filters = {};
        if (!overrideDay) { F.cal = null; $("#f-cal").innerHTML = ""; }
        remember("flight", `${label} · ${fmtDay(q.dep)}`, q);
        drawFlightResults();
        if (overrideDay) drawFlightCal(root);
      } else if (q.mode === "month") {
        F.month = q.month;
        const res = await withLoad("القافلة تمشي على أيام الشهر…", () => Promise.all(q.origins.map(o => api("flights/calendar", { origin: o, destination: q.d, month: q.month, one_way: q.rt ? 0 : 1, nights: q.rt ? q.nights : "", direct: q.direct ? 1 : 0 }).then(r => [o, r]))));
        const days = {};
        for (const [o, r] of res) for (const [day, t] of Object.entries(r.days || {})) if (t && (!days[day] || t.price < days[day].price)) days[day] = Object.assign(t, { from: o, demo: r.demo });
        F.cal = { kind: "month", days, month: q.month, demo: res.some(([, r]) => r.demo) };
        F.tickets = []; remember("flight", `${label} · ${fmtMonth(q.month)}`, q);
        drawFlightCal(root); $("#f-res").innerHTML = `<div class="panel empty"><b>اختر يوم من التقويم</b>يطلع لك كل الرحلات المتوفرة في ذاك اليوم.</div>`;
      } else {
        const res = await withLoad("القافلة تلف على أشهر السنة…", () => Promise.all(q.origins.map(o => api("flights/calendar", { origin: o, destination: q.d, year: 1, one_way: q.rt ? 0 : 1, nights: q.rt ? q.nights : "", direct: q.direct ? 1 : 0 }).then(r => [o, r]))));
        const months = {};
        for (const [o, r] of res) for (const [m, t] of Object.entries(r.months || {})) if (t && (!months[m] || t.price < months[m].price)) months[m] = Object.assign(t, { from: o });
        F.cal = { kind: "year", months, demo: res.some(([, r]) => r.demo) };
        F.tickets = []; remember("flight", `${label} · السنة كاملة`, q);
        drawFlightCal(root); $("#f-res").innerHTML = "";
      }
    } catch (e) { $("#f-res").innerHTML = errorBox(e); }
  }
  function partyParams() { const p = party(); return { adults: p.adults, children: p.children, infants: p.infants }; }

  function drawFlightCal(root) {
    const box = $("#f-cal"); if (!box) return;
    if (!F.cal) { box.innerHTML = ""; return; }
    const q = F.lastQ || {};
    const note = `${F.cal.demo ? "أسعار تجريبية. " : "أسعار محفوظة من عمليات بحث آخر أيام، وتتأكد منها لما تختار اليوم. "}السعر لشخص واحد بالغ${q.rt ? "، ذهاب وعودة" : ""}.`;
    if (F.cal.kind === "year") {
      box.innerHTML = yearCalendar(Object.fromEntries(Object.entries(F.cal.months).map(([m, t]) => [m, t && { price: t.price, tag: t.departure_at ? fmtDay(t.departure_at.slice(0, 10)) + (F.compare ? " · من " + placeName(t.from) : "") : "" }])), note);
      $$(".ycell", box).forEach(b => b.addEventListener("click", () => { const sel = $("#f-month"); sel.value = b.dataset.month; F.mode = "month"; $$('[data-seg="mode"] button').forEach(x => x.setAttribute("aria-pressed", x.dataset.v === "month")); $("#fform").dispatchEvent(new Event("submit", { cancelable: true })); }));
      return;
    }
    const cells = {};
    for (const [day, t] of Object.entries(F.cal.days)) if (t) cells[day] = { price: t.price, tag: F.compare && t.from ? t.from : "" };
    box.innerHTML = monthCalendar(F.cal.month, cells, { sel: F.sel, nav: true, onlyDow: F.weekend ? 4 : null, note });
    $$(".cal-day[data-day]", box).forEach(b => b.addEventListener("click", () => { F.sel = b.dataset.day; runFlights(root, b.dataset.day); }));
    const nav = dir => { const ms = months12(), i = ms.indexOf(F.cal.month) + dir; if (i < 0 || i >= ms.length) return; $("#f-month").value = ms[i]; F.mode = "month"; $$('[data-seg="mode"] button').forEach(x => x.setAttribute("aria-pressed", x.dataset.v === "month")); runFlights(root); };
    const p = $("[data-cal-prev]", box), n = $("[data-cal-next]", box);
    p && p.addEventListener("click", () => nav(-1)); n && n.addEventListener("click", () => nav(1));
  }

  function scoreFlights(list, p, bag) {
    const prices = list.map(t => groupPrice(t, p, bag).withBag), durs = list.map(t => t.duration_to || t.duration || 0);
    const pmin = Math.min(...prices), pmax = Math.max(...prices), dmin = Math.min(...durs), dmax = Math.max(...durs);
    list.forEach((t, i) => {
      const np = pmax > pmin ? (prices[i] - pmin) / (pmax - pmin) : 0, nd = dmax > dmin ? (durs[i] - dmin) / (dmax - dmin) : 0;
      t._score = np * 0.6 + nd * 0.25 + Math.min(2, t.transfers || 0) / 2 * 0.15; t._total = prices[i];
    });
  }

  function drawFlightResults() {
    const box = $("#f-res"); if (!box) return;
    const p = party(), f = F.filters, all = F.tickets;
    if (!all.length) { box.innerHTML = F.cal ? "" : `<div class="panel empty"><b>ما لقينا رحلات بهالتاريخ</b>جرب «شهر كامل» عشان تشوف الأيام اللي فيها أسعار، أو غيّر التاريخ.</div>`; return; }
    const bag = !!f.bag;
    scoreFlights(all, p, bag);
    const airlines = Array.from(new Set(all.map(t => t.airline))).sort();
    const maxPrice = Math.max(...all.map(t => t._total)), maxDur = Math.max(...all.map(t => t.duration_to || 0));
    const slot = t => { const h = Number(hhmm(t.departure_at).slice(0, 2)); return h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "noon" : "evening"; };
    let list = all.filter(t => (f.stops == null || (f.stops === 0 ? !t.transfers : (t.transfers || 0) <= f.stops))
      && (!f.airlines || !f.airlines.length || f.airlines.includes(t.airline))
      && (!f.slots || !f.slots.length || f.slots.includes(slot(t)))
      && (!f.maxPrice || t._total <= f.maxPrice) && (!f.maxDur || !t.duration_to || t.duration_to <= f.maxDur));
    list.sort(F.sort === "cheap" ? (a, b) => a._total - b._total : F.sort === "fast" ? (a, b) => (a.duration_to || 9e9) - (b.duration_to || 9e9) : (a, b) => a._score - b._score);
    const bestId = all.slice().sort((a, b) => a._score - b._score)[0], cheapId = all.slice().sort((a, b) => a._total - b._total)[0];
    const q = F.lastQ || {};
    const ins = F.insights && F.insights.typical ? `<div class="panel panel-pad small">قوقل يقول: السعر الحين <b>${{ low: "أرخص من المعتاد", typical: "عادي", high: "أغلى من المعتاد" }[F.insights.level] || "—"}</b>، والمعتاد بين ${sar(F.insights.typical[0])} و${sar(F.insights.typical[1])}.</div>` : "";
    box.innerHTML = `${ins}
      <div class="results">
        <aside class="panel filters" id="f-filters">
          <h3>الفلاتر</h3>
          <div class="filter-group"><span class="lbl">التوقفات</span>${seg("stops", [["", "الكل"], ["0", "مباشر"], ["1", "توقف واحد بالأكثر"]], f.stops == null ? "" : String(f.stops))}</div>
          <div class="filter-group"><span class="lbl">وقت الإقلاع</span><div class="chip-set">${[["night", "فجر ٠–٦"], ["morning", "صباح ٦–١٢"], ["noon", "ظهر ١٢–٦"], ["evening", "ليل ٦–١٢"]].map(([v, l]) => `<button type="button" class="chip" data-slot="${v}" aria-pressed="${(f.slots || []).includes(v)}">${l}</button>`).join("")}</div></div>
          <div class="filter-group"><span class="lbl"><span>أعلى سعر للمجموعة</span><b class="num" id="ff-pv">${sar(f.maxPrice || maxPrice)}</b></span><input type="range" id="ff-price" min="${Math.min(...all.map(t => t._total))}" max="${maxPrice}" step="10" value="${f.maxPrice || maxPrice}"></div>
          ${maxDur ? `<div class="filter-group"><span class="lbl"><span>أطول مدة</span><b id="ff-dv">${dur(f.maxDur || maxDur)}</b></span><input type="range" id="ff-dur" min="60" max="${maxDur}" step="15" value="${f.maxDur || maxDur}"></div>` : ""}
          <div class="filter-group"><span class="lbl">شركات الطيران</span>${airlines.map(a => `<label class="check"><input type="checkbox" data-al="${esc(a)}" ${!f.airlines || f.airlines.includes(a) ? "checked" : ""}> ${esc(airline(a))}</label>`).join("")}</div>
          <div class="filter-group"><label class="check"><input type="checkbox" id="ff-bag" ${bag ? "checked" : ""}> السعر الحقيقي مع الشنطة</label><span class="small muted">يضيف رسوم شنطة تقديرية لشركات الطيران الاقتصادي.</span></div>
        </aside>
        <section>
          <div class="sortbar">${seg("fsort", [["best", "الأفضل"], ["cheap", "الأرخص"], ["fast", "الأسرع"]], F.sort)}
            <span class="row"><button type="button" class="btn btn-ghost btn-sm filters-toggle" id="ff-toggle">${ICON.filter} الفلاتر</button><span class="count">${list.length} من ${all.length} رحلة · ${esc(partyLabel(p))}</span></span></div>
          <div class="list">${list.map(t => flightCard(t, p, bag, t === bestId, t === cheapId, q)).join("") || `<div class="panel empty"><b>ما فيه رحلات بهالفلاتر</b>خفف الفلاتر شوي.</div>`}</div>
          ${all.some(t => t.cached) ? `<p class="small muted">${all.some(t => t.demo) ? "هذي أسعار تجريبية." : "أسعار Aviasales محفوظة من عمليات بحث آخر يومين إلى سبعة أيام، وممكن تتغير. اضغط «احجز» يفتح لك البحث بالسعر الحالي ومواقع الحجز اللي فيها."} أسعار الأطفال والرضّع تقديرية (٧٥٪ و١٠٪ من سعر البالغ).</p>` : ""}
        </section>
      </div>`;
    bindSeg(box, "fsort", v => { F.sort = v; drawFlightResults(); });
    bindSeg(box, "stops", v => { f.stops = v === "" ? null : Number(v); drawFlightResults(); });
    $$("[data-slot]", box).forEach(b => b.addEventListener("click", () => { const v = b.dataset.slot; f.slots = (f.slots || []).includes(v) ? f.slots.filter(x => x !== v) : (f.slots || []).concat(v); drawFlightResults(); }));
    $$("[data-al]", box).forEach(c => c.addEventListener("change", () => { f.airlines = $$("[data-al]", box).filter(x => x.checked).map(x => x.dataset.al); drawFlightResults(); }));
    const pr = $("#ff-price", box); pr.addEventListener("input", () => { $("#ff-pv").textContent = sar(pr.value); }); pr.addEventListener("change", () => { f.maxPrice = Number(pr.value); drawFlightResults(); });
    const dr = $("#ff-dur", box); if (dr) { dr.addEventListener("input", () => { $("#ff-dv").textContent = dur(dr.value); }); dr.addEventListener("change", () => { f.maxDur = Number(dr.value); drawFlightResults(); }); }
    $("#ff-bag", box).addEventListener("change", e => { f.bag = e.target.checked; drawFlightResults(); });
    $("#ff-toggle", box).addEventListener("click", () => $("#f-filters").classList.toggle("open"));
    if (F.filtersOpen) $("#f-filters").classList.add("open");
    $$("[data-fact]", box).forEach(b => b.addEventListener("click", () => flightAction(b.dataset.fact, all[Number(b.dataset.i)], b)));
  }

  function flightCard(t, p, bag, best, cheap, q) {
    const gp = groupPrice(t, p, true), i = F.tickets.indexOf(t);
    const dep = (t.departure_at || "").slice(0, 10), ret = (t.return_at || "").slice(0, 10);
    const stops = n => n == null ? "" : `<span class="stops-${Math.min(2, n)}">${n === 0 ? "مباشر" : n === 1 ? "توقف واحد" : n + " توقفات"}</span>`;
    const leg = (date, time, from, to, d, n, title) => `<div class="leg">
        <div class="airline"><span class="al-badge">${esc(t.airline || "")}</span><span><div class="al-name">${esc(airline(t.airline))}</div><div class="al-sub">${esc(title)} · ${esc(fmtDay(date))}</div></span></div>
        <div class="timeline"><div class="tl-point"><div class="tl-time">${esc(time || "—")}</div><div class="tl-code">${esc(from)}</div></div>
          <div class="tl-mid">${d ? dur(d) : ""}<br>${stops(n)}</div>
          <div class="tl-point"><div class="tl-time">${esc(hhmm(t.arrival_at) && title === "الذهاب" ? hhmm(t.arrival_at) : "")}</div><div class="tl-code">${esc(to)}</div></div></div></div>`;
    const fee = baggage()[t.airline];
    return `<article class="panel fcard">
      <div class="legs">
        ${leg(dep, hhmm(t.departure_at), t.origin_airport || t.origin, t.destination_airport || t.destination, t.duration_to, t.transfers, "الذهاب")}
        ${t.return_at ? leg(ret, hhmm(t.return_at), t.destination_airport || t.destination, t.origin_airport || t.origin, t.duration_back, t.return_transfers, "العودة") : ""}
        <div class="badges">${best ? '<span class="badge best">الأفضل</span>' : ""}${cheap ? '<span class="badge cheap">الأرخص</span>' : ""}${F.compare ? `<span class="badge">من ${esc(placeName(t.origin))}</span>` : ""}<span class="badge">${esc(t.demo ? "تجريبي" : t.source)}${t.cached && !t.demo ? " · سعر محفوظ" : ""}</span>${t.flight_number ? `<span class="badge">رحلة ${esc(t.airline)}${esc(t.flight_number)}</span>` : ""}</div>
      </div>
      <div class="pricebox">
        <div class="price-big">${sar(bag ? gp.withBag : gp.total)}</div>
        <div class="price-sub">${p.total > 1 ? `للمجموعة${gp.estimated ? " (تقديري)" : ""} · ${sar(t.total_price ? t.price / p.total : t.price)} للبالغ` : "للشخص"}</div>
        ${fee && !t.total_price ? `<div class="true-price" title="رسوم الشنطة تقديرية وتقدر تعدلها من الإعدادات">${bag ? "يشمل" : "مع الشنطة"}: ${sar(gp.withBag)}</div>` : ""}
      </div>
      <div class="card-actions">
        <a class="btn btn-primary btn-sm" href="${esc(t.link || gFlights(t.origin, t.destination, dep, ret))}" target="_blank" rel="noopener">احجز ${ICON.out}</a>
        <a class="btn btn-ghost btn-sm" href="${esc(gFlights(t.origin, t.destination, dep, ret))}" target="_blank" rel="noopener">قارن في قوقل فلايتس ${ICON.out}</a>
        <button type="button" class="btn btn-ghost btn-sm" data-fact="fav" data-i="${i}" aria-pressed="${isFav(flightId(t))}">${ICON.star} مفضلة</button>
        <button type="button" class="btn btn-ghost btn-sm" data-fact="watch" data-i="${i}">${ICON.bell} راقب السعر</button>
        <button type="button" class="btn btn-ghost btn-sm" data-fact="hist" data-i="${i}">تاريخ السعر</button>
        <a class="btn btn-ghost btn-sm" href="${esc(waLink(flightShare(t, p)))}" target="_blank" rel="noopener">${ICON.share} واتساب</a>
      </div></article>`;
  }
  const flightId = t => `f:${t.origin}-${t.destination}-${(t.departure_at || "").slice(0, 16)}-${t.airline}${t.flight_number || ""}-${(t.return_at || "").slice(0, 10)}`;
  function flightShare(t, p) {
    const gp = groupPrice(t, p, false);
    return [`رحلة من دروب ✈`, `${placeName(t.origin)} ← ${placeName(t.destination)}`, `الذهاب: ${fmtDay((t.departure_at || "").slice(0, 10))} ${hhmm(t.departure_at)}`,
      t.return_at ? `العودة: ${fmtDay(t.return_at.slice(0, 10))}` : "ذهاب فقط", `${airline(t.airline)} · ${t.transfers ? t.transfers + " توقف" : "مباشر"}`,
      `السعر: ${sar(gp.total)}${p.total > 1 ? " للمجموعة (" + partyLabel(p) + ")" : ""}`, t.link || ""].filter(Boolean).join("\n");
  }
  async function flightAction(kind, t, btn) {
    if (!t) return;
    const dep = (t.departure_at || "").slice(0, 10), ret = (t.return_at || "").slice(0, 10);
    if (kind === "fav") {
      const on = await toggleFav({ id: flightId(t), kind: "flight", title: `${placeName(t.origin)} ← ${placeName(t.destination)}`, sub: `${fmtDay(dep)}${ret ? " · عودة " + fmtDay(ret) : ""} · ${airline(t.airline)}`, price: t.price, link: t.link });
      btn.setAttribute("aria-pressed", on);
    } else if (kind === "watch") {
      await addWatch({ id: `w:${t.origin}-${t.destination}-${dep}-${ret}`, kind: "flight", label: `${placeName(t.origin)} ← ${placeName(t.destination)} · ${fmtDay(dep)}${ret ? " إلى " + fmtDay(ret) : ""}`, last: t.price, params: { origin: t.origin, destination: t.destination, depart: dep, return: ret || "", direct: t.transfers ? "0" : "0" } });
    } else if (kind === "hist") {
      const key = `${t.origin}-${t.destination}${ret ? "-RT" : ""}`;
      const h = await api("history", { kind: "flight", key, day: dep, current: t.price });
      openDrawer(historyView(`${placeName(t.origin)} ← ${placeName(t.destination)} · ${fmtDay(dep)}`, h, "للبالغ"));
    }
  }

  // ------------------------------------------------------------------ price history view
  const VERDICT = { lowest: ["v-lowest", "أرخص سعر شفناه · احجز"], good: ["v-good", "أرخص من المعتاد · سعر زين"], normal: ["v-normal", "سعر عادي"], high: ["v-high", "أغلى من المعتاد · انتظر لو تقدر"], few: ["v-few", "بيانات قليلة للحين"] };
  function sparkline(points) {
    if (!points || points.length < 2) return "";
    const W = 300, H = 44, ps = points.map(p => p.price), min = Math.min(...ps), max = Math.max(...ps), t0 = points[0].at, t1 = points[points.length - 1].at;
    const x = t => t1 > t0 ? (t - t0) / (t1 - t0) * (W - 8) + 4 : W / 2, y = v => max > min ? H - 6 - (v - min) / (max - min) * (H - 12) : H / 2;
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
    const last = points[points.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" style="direction:ltr">
      <path d="${d} L${x(last.at).toFixed(1)},${H} L${x(t0).toFixed(1)},${H}Z" fill="var(--clay)" opacity=".12"/>
      <path d="${d}" fill="none" stroke="var(--clay)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(last.at).toFixed(1)}" cy="${y(last.price).toFixed(1)}" r="3.5" fill="var(--clay)"/></svg>`;
  }
  function historyView(title, h, unit) {
    const v = VERDICT[h.verdict] || VERDICT.few;
    return `<h2 id="drawer-title">تاريخ السعر</h2><p class="muted" style="margin:0">${esc(title)}</p>
      <div class="panel panel-pad" style="display:grid;gap:10px">
        <span class="verdict ${v[0]}">${v[1]}</span>
        ${sparkline(h.points)}
        <div class="kv"><div><div class="lbl">السعر الحين</div><b class="num">${sar(h.current)}</b></div><div><div class="lbl">أرخص شي</div><b class="num">${sar(h.min)}</b></div><div><div class="lbl">المعتاد</div><b class="num">${sar(h.median)}</b></div><div><div class="lbl">أغلى شي</div><b class="num">${sar(h.max)}</b></div></div>
        <p class="small muted" style="margin:0">${h.demo ? "تاريخ تجريبي للعرض. " : ""}دروب يحفظ كل سعر يشوفه وأنت تدوّر أو لما يفحص متابعاتك، فكل ما استخدمته أكثر صار الحكم أدق. ${unit || ""}</p>
      </div>`;
  }

  // ------------------------------------------------------------------ hotels
  const H = { mode: "dates", hotels: [], sort: "value", filters: {}, view: "list", ctx: null, cal: null, sel: null, map: null };

  function pageHotels(root) {
    const ph = S.prefs.hotels || { city: "g293993" };
    const ci0 = ph.ci && ph.ci >= today() ? ph.ci : addDays(today(), 14), co0 = ph.co && ph.co > ci0 ? ph.co : addDays(ci0, 3);
    const c = CITIES.find(x => x.id === ph.city) || CITIES[0];
    root.innerHTML = `
      <div class="page-head"><div><h1>الفنادق</h1><p>يقارن سعر كل فندق في مواقع الحجز ويرتبها من الأرخص، ويحسب الغرف حسب عددكم وأعماركم.</p></div></div>
      <form class="panel search-form" id="hform" autocomplete="off">
        <div class="row">${seg("hmode", [["dates", "تواريخ محددة"], ["month", "تقويم الشهر"], ["year", "السنة كاملة"]], H.mode)}</div>
        <div class="fields">
          ${cityField("h-city", "المدينة", c.id)}
          <div class="field" data-show="dates"><label for="h-ci">الدخول</label><input class="input" type="date" id="h-ci" min="${today()}" value="${ci0}"></div>
          <div class="field" data-show="dates"><label for="h-co">الخروج</label><input class="input" type="date" id="h-co" min="${today()}" value="${co0}"></div>
          <div class="field" data-show="month"><label for="h-month">الشهر</label><select class="input" id="h-month">${months12().map(m => `<option value="${m}" ${m === defaultMonth() ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field" data-show="month year"><label for="h-nights">كم ليلة</label><input class="input num" type="number" id="h-nights" min="1" max="30" value="${ph.nights || 3}"></div>
          ${travelersField("h-trav")}
          <div class="field"><label for="h-rooms">الغرف</label><select class="input" id="h-rooms"></select></div>
          <div class="field"><label for="h-lm">قريب من</label><select class="input" id="h-lm"></select></div>
        </div>
        <div class="form-actions"><span class="small muted" id="h-hint"></span><button class="btn btn-primary" type="submit">دوّر على الفنادق</button></div>
      </form>
      <div id="h-cal"></div>
      <div id="h-res"></div>`;
    const form = $("#hform", root);
    const fillLm = cid => { const cc = CITIES.find(x => x.id === cid) || c; $("#h-lm").innerHTML = cc.landmarks.map((l, i) => `<option value="${i}">${esc(l.ar)}</option>`).join(""); if (ph.lm != null && cid === ph.city) $("#h-lm").value = ph.lm; };
    const fillRooms = () => { const p = party(), sug = Math.max(1, Math.ceil(p.beds / 3)); const cur = Number($("#h-rooms").value || ph.rooms || sug); $("#h-rooms").innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === (cur || sug) ? "selected" : ""}>${n} ${n === 1 ? "غرفة" : n === 2 ? "غرفتين" : "غرف"}${n === sug ? " (مقترح)" : ""}</option>`).join(""); };
    fillLm(c.id); fillRooms();
    bindCity(form, "h-city", cc => fillLm(cc.id));
    bindTravelers(form, "h-trav", () => { $("#h-rooms").value = ""; fillRooms(); });
    const vis = () => { const m = segVal(form, "hmode"); $$("[data-show]", form).forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(m); }); $("#h-hint").textContent = m === "month" ? "تقويم بمتوسط سعر الليلة لأشهر الفنادق في المدينة." : m === "year" ? "متوسط سعر الليلة في كل شهر." : ""; };
    bindSeg(form, "hmode", v => { H.mode = v; vis(); }); vis();
    form.addEventListener("submit", e => { e.preventDefault(); runHotels(root); });
    if (H.hotels.length || H.cal) { drawHotelCal(root); drawHotelResults(); }
    else $("#h-res", root).innerHTML = `<div class="panel empty"><b>جاهز للبحث</b>اختر المدينة والتواريخ وعددكم، واضغط «دوّر».</div>`;
  }

  function hotelQuery(root, dayOverride) {
    const cid = $("#h-city", root).dataset.city;
    const c = CITIES.find(x => x.id === cid);
    if (!c) throw new Error("اختر المدينة من القائمة.");
    const lm = c.landmarks[Number($("#h-lm", root).value || 0)] || c.landmarks[0];
    const nights = Number($("#h-nights", root).value || 3);
    let ci = $("#h-ci", root).value, co = $("#h-co", root).value;
    if (dayOverride) { ci = dayOverride; co = addDays(dayOverride, nights); }
    const q = { city: c, lm, mode: dayOverride ? "dates" : segVal(root, "hmode"), ci, co, month: $("#h-month", root).value, nights, rooms: Number($("#h-rooms", root).value || 1), party: party() };
    if (q.mode === "dates" && (!ci || !co || co <= ci)) throw new Error("تاريخ الخروج لازم يكون بعد الدخول.");
    S.prefs.hotels = { city: c.id, ci: q.mode === "dates" ? ci : S.prefs.hotels && S.prefs.hotels.ci, co: q.mode === "dates" ? co : S.prefs.hotels && S.prefs.hotels.co, nights, rooms: q.rooms, lm: $("#h-lm", root).value };
    save("prefs");
    return q;
  }

  async function runHotels(root, dayOverride) {
    let q; try { q = hotelQuery(root, dayOverride); } catch (e) { toast(e.message); return; }
    const p = q.party;
    try {
      if (q.mode === "dates") {
        H.sel = dayOverride || null;
        if (dayOverride) { $("#h-ci").value = q.ci; $("#h-co").value = q.co; }
        const res = await withLoad("القافلة تمر على الفنادق وتقارن الأسعار…", () => api("hotels/search", { city: q.city.id, checkin: q.ci, checkout: q.co, adults: p.adults, children: p.childAges.join(","), rooms: q.rooms }));
        H.hotels = res.hotels; H.filters = {}; H.ctx = { city: q.city, lm: q.lm, checkin: q.ci, checkout: q.co, nights: res.nights, rooms: res.rooms, perRoom: res.per_room, party: p, source: res.source, demo: res.demo, cityEn: q.city.en };
        if (!dayOverride) { H.cal = null; $("#h-cal").innerHTML = ""; }
        remember("hotel", `${q.city.ar} · ${fmtDay(q.ci)} (${res.nights} ليالي)`, { city: q.city.id, ci: q.ci, co: q.co });
        drawHotelResults(); if (dayOverride) drawHotelCal(root);
      } else if (q.mode === "month") {
        const res = await withLoad("القافلة تحسب أسعار ليالي الشهر…", () => api("hotels/calendar", { city: q.city.id, month: q.month }));
        H.cal = { kind: "month", month: q.month, days: res.days, demo: res.demo, hotels: res.hotels, city: q.city };
        H.hotels = []; drawHotelCal(root); $("#h-res").innerHTML = `<div class="panel empty"><b>اختر يوم الدخول من التقويم</b>بنحسب ${q.nights} ليالي من اليوم اللي تختاره.</div>`;
      } else {
        const res = await withLoad("القافلة تلف على أشهر السنة…", () => api("hotels/calendar", { city: q.city.id, year: 1 }));
        H.cal = { kind: "year", months: res.months, demo: res.demo, hotels: res.hotels, city: q.city };
        H.hotels = []; drawHotelCal(root); $("#h-res").innerHTML = "";
      }
    } catch (e) { $("#h-res").innerHTML = errorBox(e); }
  }

  function drawHotelCal(root) {
    const box = $("#h-cal"); if (!box) return;
    if (!H.cal) { box.innerHTML = ""; return; }
    const note = `${H.cal.demo ? "أسعار تجريبية. " : "متوسط سعر ليلة لغرفة شخصين في أشهر فنادق المدينة" + (H.cal.hotels && H.cal.hotels.length ? " (" + H.cal.hotels.slice(0, 3).map(esc).join("، ") + ")" : "") + "، ومحسوبة بالعينة لبعض الأيام. "}الأيام بدون سعر ملونة حسب تقييم المصدر (رخيص / متوسط / غالي).`;
    if (H.cal.kind === "year") {
      box.innerHTML = yearCalendar(Object.fromEntries(Object.entries(H.cal.months).map(([m, c]) => [m, c && c.price != null ? { price: c.price, tag: "لليلة" } : null])), note);
      $$(".ycell", box).forEach(b => b.addEventListener("click", () => { $("#h-month").value = b.dataset.month; H.mode = "month"; $$('[data-seg="hmode"] button').forEach(x => x.setAttribute("aria-pressed", x.dataset.v === "month")); runHotels(root); }));
      return;
    }
    box.innerHTML = monthCalendar(H.cal.month, H.cal.days || {}, { sel: H.sel, nav: true, note, unit: "سعر الليلة بالريال" });
    $$(".cal-day[data-day]", box).forEach(b => b.addEventListener("click", () => runHotels(root, b.dataset.day)));
    const nav = dir => { const ms = months12(), i = ms.indexOf(H.cal.month) + dir; if (i < 0 || i >= ms.length) return; $("#h-month").value = ms[i]; H.mode = "month"; $$('[data-seg="hmode"] button').forEach(x => x.setAttribute("aria-pressed", x.dataset.v === "month")); runHotels(root); };
    const p = $("[data-cal-prev]", box), n = $("[data-cal-next]", box);
    p && p.addEventListener("click", () => nav(-1)); n && n.addEventListener("click", () => nav(1));
  }

  function roomPlans(h, ctx) {
    const n = ctx.nights, p = ctx.party, base = h.night;
    const plans = [{ main: true, label: `${ctx.rooms} ${ctx.rooms === 1 ? "غرفة" : ctx.rooms === 2 ? "غرفتين" : "غرف"} · ${ctx.perRoom} بالغرفة`, total: base * ctx.rooms * n, note: "السعر من المصدر" }];
    if (p.beds >= 3 && ctx.rooms === 1) plans.push({ label: "غرفتين عاديتين (راحة أكثر)", total: Math.round(base * 0.82) * 2 * n, note: "تقديري" });
    if (p.beds >= 3 && p.beds <= 5) plans.push({ label: "جناح أو غرفة عائلية", total: Math.round(base * (ctx.rooms === 1 ? 1.25 : 1.35 / ctx.rooms * ctx.rooms)) * n, note: "تقديري · مو كل الفنادق فيها" });
    if (p.beds >= 4) plans.push({ label: "شقة فندقية", total: Math.round(base * 1.15) * n, note: "تقديري · دوّر «شقق» في الفلاتر" });
    return plans;
  }

  function drawHotelResults() {
    const box = $("#h-res"); if (!box) return;
    const ctx = H.ctx, f = H.filters;
    if (!H.hotels.length) { box.innerHTML = H.cal ? "" : `<div class="panel empty"><b>ما لقينا أسعار بهالتواريخ</b>ممكن المصدر ما عنده أسعار لهالأيام. جرب تواريخ ثانية أو «تقويم الشهر».</div>`; return; }
    const lm = ctx.lm;
    H.hotels.forEach(h => { h._dist = h.lat != null ? km(lm.lat, lm.lng, h.lat, h.lng) : null; h._value = h.night / Math.pow(Math.max(2.5, h.rating || 3.5), 2.2); });
    const maxN = Math.max(...H.hotels.map(h => h.night)), minN = Math.min(...H.hotels.map(h => h.night));
    const dists = H.hotels.map(h => h._dist).filter(x => x != null), maxD = dists.length ? Math.ceil(Math.max(...dists)) : 0;
    const hasStars = H.hotels.some(h => h.stars), hasFc = H.hotels.some(h => h.free_cancel != null), hasBf = H.hotels.some(h => h.breakfast), types = Array.from(new Set(H.hotels.map(h => h.type)));
    let list = H.hotels.filter(h => (!f.maxN || h.night <= f.maxN) && (!f.rating || (h.rating || 0) >= f.rating) && (!f.maxD || h._dist == null || h._dist <= f.maxD)
      && (!f.stars || !f.stars.length || f.stars.includes(Number(h.stars))) && (!f.bf || h.breakfast) && (!f.fc || h.free_cancel) && (!f.type || h.type === f.type));
    list.sort(H.sort === "cheap" ? (a, b) => a.night - b.night : H.sort === "rating" ? (a, b) => (b.rating || 0) - (a.rating || 0) || a.night - b.night : H.sort === "near" ? (a, b) => (a._dist ?? 9e9) - (b._dist ?? 9e9) : (a, b) => a._value - b._value);
    const cheapest = list.slice().sort((a, b) => a.night - b.night)[0];
    box.innerHTML = `<div class="results">
      <aside class="panel filters" id="h-filters">
        <h3>الفلاتر</h3>
        <div class="filter-group"><span class="lbl"><span>أعلى سعر لليلة</span><b class="num" id="hf-pv">${sar(f.maxN || maxN)}</b></span><input type="range" id="hf-price" min="${minN}" max="${maxN}" step="5" value="${f.maxN || maxN}"></div>
        <div class="filter-group"><span class="lbl">التقييم</span>${seg("hrate", [["", "الكل"], ["3.5", "+3.5"], ["4", "+4"], ["4.5", "+4.5"]], f.rating ? String(f.rating) : "")}</div>
        ${maxD ? `<div class="filter-group"><span class="lbl"><span>البعد عن ${esc(lm.ar)}</span><b id="hf-dv">${(f.maxD || maxD).toFixed(1)} كم</b></span><input type="range" id="hf-dist" min="0.3" max="${maxD}" step="0.1" value="${f.maxD || maxD}"><span class="small muted">مشي تقريباً ${Math.round((f.maxD || maxD) / 4.5 * 60)} دقيقة</span></div>` : ""}
        ${hasStars ? `<div class="filter-group"><span class="lbl">النجوم</span><div class="chip-set">${[2, 3, 4, 5].map(s => `<button type="button" class="chip" data-star="${s}" aria-pressed="${(f.stars || []).includes(s)}">${s} نجوم</button>`).join("")}</div></div>` : `<div class="filter-group"><span class="lbl">النجوم</span><span class="small muted">تتوفر مع مفتاح SerpApi.</span></div>`}
        ${types.length > 1 ? `<div class="filter-group"><span class="lbl">نوع السكن</span><select class="input" id="hf-type"><option value="">الكل</option>${types.map(t => `<option value="${esc(t)}" ${f.type === t ? "selected" : ""}>${esc(typeAr(t))}</option>`).join("")}</select></div>` : ""}
        <div class="filter-group">
          ${hasBf ? `<label class="check"><input type="checkbox" id="hf-bf" ${f.bf ? "checked" : ""}> الفطور مشمول</label>` : ""}
          ${hasFc ? `<label class="check"><input type="checkbox" id="hf-fc" ${f.fc ? "checked" : ""}> إلغاء مجاني</label>` : `<span class="small muted">فلتر الإلغاء المجاني يتوفر مع مفتاح SerpApi.</span>`}
        </div>
      </aside>
      <section>
        <div class="sortbar">${seg("hsort", [["value", "أفضل قيمة"], ["cheap", "الأرخص"], ["rating", "الأعلى تقييم"], ["near", "الأقرب"]], H.sort)}
          <span class="row">${seg("hview", [["list", "قائمة"], ["map", "خريطة"]], H.view)}<button type="button" class="btn btn-ghost btn-sm filters-toggle" id="hf-toggle">${ICON.filter} الفلاتر</button></span></div>
        <p class="count" style="margin:0 0 8px">${list.length} من ${H.hotels.length} · ${esc(ctx.city.ar)} · ${esc(fmtDay(ctx.checkin))} ← ${esc(fmtDay(ctx.checkout))} · ${ctx.nights} ليالي · ${esc(partyLabel(ctx.party))} · ${ctx.rooms} ${ctx.rooms === 1 ? "غرفة" : "غرف"}</p>
        <div id="h-body">${H.view === "map" ? `<div class="map" id="h-map"></div><p class="map-note">الأرقام سعر الليلة. اضغط على أي فندق يفتح لك المقارنة.</p>` : `<div class="list">${list.map(h => hotelCard(h, ctx, h === cheapest)).join("") || `<div class="panel empty"><b>ما فيه فنادق بهالفلاتر</b>خفف الفلاتر شوي.</div>`}</div>`}</div>
        <p class="small muted">${ctx.demo ? "أسعار وفنادق تجريبية. " : `المصدر: ${esc(ctx.source === "Google Hotels" ? "Google Hotels عبر SerpApi" : "TripAdvisor عبر Xotelo")}. `}السعر لليلة للغرفة. ${ctx.source !== "Google Hotels" && ctx.party.childAges.length ? "المصدر المجاني ما يحسب أعمار الأطفال، فحسبنا كل طفل فوق السنتين كشخص بالغرفة. " : ""}تأكد من السعر النهائي والضرائب في موقع الحجز.</p>
      </section></div>`;
    bindSeg(box, "hsort", v => { H.sort = v; drawHotelResults(); });
    bindSeg(box, "hview", v => { H.view = v; drawHotelResults(); });
    bindSeg(box, "hrate", v => { f.rating = v ? Number(v) : null; drawHotelResults(); });
    const pr = $("#hf-price", box); pr.addEventListener("input", () => { $("#hf-pv").textContent = sar(pr.value); }); pr.addEventListener("change", () => { f.maxN = Number(pr.value); drawHotelResults(); });
    const dr = $("#hf-dist", box); if (dr) { dr.addEventListener("input", () => { $("#hf-dv").textContent = Number(dr.value).toFixed(1) + " كم"; }); dr.addEventListener("change", () => { f.maxD = Number(dr.value); drawHotelResults(); }); }
    $$("[data-star]", box).forEach(b => b.addEventListener("click", () => { const s = Number(b.dataset.star); f.stars = (f.stars || []).includes(s) ? f.stars.filter(x => x !== s) : (f.stars || []).concat(s); drawHotelResults(); }));
    const ty = $("#hf-type", box); ty && ty.addEventListener("change", () => { f.type = ty.value || null; drawHotelResults(); });
    const bf = $("#hf-bf", box); bf && bf.addEventListener("change", () => { f.bf = bf.checked; drawHotelResults(); });
    const fc = $("#hf-fc", box); fc && fc.addEventListener("change", () => { f.fc = fc.checked; drawHotelResults(); });
    $("#hf-toggle", box).addEventListener("click", () => $("#h-filters").classList.toggle("open"));
    $$("[data-hotel]", box).forEach(el => el.addEventListener("click", e => { if (e.target.closest("a,button")) return; openHotel(H.hotels.find(h => h.id === el.dataset.hotel)); }));
    $$("[data-hopen]", box).forEach(b => b.addEventListener("click", () => openHotel(H.hotels.find(h => h.id === b.dataset.hopen))));
    if (H.view === "map") drawMap(list, cheapest);
  }
  const typeAr = t => ({ hotel: "فندق", Hotel: "فندق", Apartment: "شقة", "vacation rental": "شقة / بيت", "Specialty Hotel": "فندق مميز", "B&B / Inn": "نُزل", Hostel: "سكن شبابي", Resort: "منتجع" }[t] || t);

  function hotelCard(h, ctx, cheapest) {
    const others = h.rates.slice(1, 4);
    const img = h.image ? `<div class="himg"><img src="${esc(h.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sadu-ph');this.remove()"></div>` : `<div class="himg sadu-ph" aria-hidden="true">${esc(typeAr(h.type))}</div>`;
    return `<article class="panel hcard" data-hotel="${esc(h.id)}" tabindex="0">
      ${img}
      <div class="hbody">
        <h3 class="hname">${esc(h.name)}</h3>
        <div class="row" style="gap:10px">${h.rating ? `<span class="rating"><b>${Number(h.rating).toFixed(1)}</b><span class="muted">${h.reviews ? Number(h.reviews).toLocaleString("en-US") + " تقييم" : ""}</span></span>` : ""}${h.stars ? `<span class="stars" aria-label="${h.stars} نجوم">${"★".repeat(Math.round(h.stars))}</span>` : ""}<span class="small muted">${esc(typeAr(h.type))}</span></div>
        <div class="small">${h._dist != null ? `${h._dist < 1 ? Math.round(h._dist * 1000) + " م" : h._dist.toFixed(1) + " كم"} عن ${esc(ctx.lm.ar)}` : ""}</div>
        <div class="badges">${cheapest ? '<span class="badge cheap">الأرخص</span>' : ""}${h.breakfast ? '<span class="badge">فطور</span>' : ""}${h.free_cancel ? '<span class="badge">إلغاء مجاني</span>' : ""}${h.demo ? '<span class="badge">تجريبي</span>' : ""}</div>
        ${others.length ? `<div class="sites-mini">${others.map(r => `<span>${esc(r.site)} <b class="num">${sarShort(r.night)}</b></span>`).join("")}</div>` : ""}
      </div>
      <div class="pricebox">
        <span class="small muted">أرخص موقع: <b>${esc(h.rates[0] ? h.rates[0].site : "")}</b></span>
        <div class="price-big">${sar(h.night)}<small> /ليلة</small></div>
        <div class="price-sub">المجموع ${sar(h.night * ctx.nights * ctx.rooms)}</div>
        <button type="button" class="btn btn-primary btn-sm" data-hopen="${esc(h.id)}">قارن المواقع</button>
      </div></article>`;
  }

  function drawMap(list, cheapest) {
    const el = $("#h-map"); if (!el) return;
    if (!window.L) { el.innerHTML = `<div class="empty"><b>الخريطة تحتاج إنترنت</b>ما قدرنا نحمّل مكتبة الخرائط.</div>`; return; }
    const ctx = H.ctx;
    const map = L.map(el, { zoomControl: true, attributionControl: true }).setView([ctx.lm.lat, ctx.lm.lng], 14);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    let tileErr = 0; tiles.on("tileerror", () => { if (++tileErr === 3) $(".map-note").textContent = "صور الخريطة ما تحمّلت هنا (في نسخة الجوال التجريبية تنحجب). مواقع الفنادق والأسعار ظاهرة، والخريطة كاملة في نسخة الكمبيوتر."; });
    const pin = (html, cls) => L.divIcon({ className: "leaflet-div-icon", html: `<span class="map-pin ${cls || ""}">${html}</span>`, iconSize: [0, 0] });
    L.marker([ctx.lm.lat, ctx.lm.lng], { icon: pin(esc(ctx.lm.ar), "lm"), zIndexOffset: 1000 }).addTo(map);
    const pts = [[ctx.lm.lat, ctx.lm.lng]];
    for (const h of list) {
      if (h.lat == null) continue;
      pts.push([h.lat, h.lng]);
      L.marker([h.lat, h.lng], { icon: pin(sarShort(h.night), h === cheapest ? "cheapest" : "") }).addTo(map).on("click", () => openHotel(h));
    }
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    H.map = map;
  }

  async function openHotel(h) {
    if (!h) return;
    const ctx = H.ctx;
    const render = (rates, loadingRates) => {
      const plans = roomPlans(h, ctx);
      openDrawer(`
        <h2 id="drawer-title">${esc(h.name)}</h2>
        <div class="row" style="gap:10px">${h.rating ? `<span class="rating"><b>${Number(h.rating).toFixed(1)}</b><span class="muted">${h.reviews ? Number(h.reviews).toLocaleString("en-US") + " تقييم" : ""}</span></span>` : ""}${h.stars ? `<span class="stars">${"★".repeat(Math.round(h.stars))}</span>` : ""}${h._dist != null ? `<span class="small">${h._dist.toFixed(1)} كم عن ${esc(ctx.lm.ar)}</span>` : ""}</div>
        ${h.image ? `<div class="himg" style="aspect-ratio:16/8"><img src="${esc(h.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()"></div>` : ""}
        <section><h3 class="sec">أرخص موقع تحجز منه</h3>
          <p class="small muted" style="margin:0 0 6px">${esc(fmtDay(ctx.checkin))} ← ${esc(fmtDay(ctx.checkout))} · ${ctx.nights} ليالي · ${esc(partyLabel(ctx.party))}</p>
          <div class="tbl-wrap"><table class="rates"><thead><tr><th>الموقع</th><th>لليلة</th><th>المجموع (${ctx.rooms} ${ctx.rooms === 1 ? "غرفة" : "غرف"})</th><th></th></tr></thead><tbody>
          ${rates.map((r, i) => `<tr class="${i === 0 ? "best" : ""}"><td>${esc(r.site)}${i === 0 ? ' <span class="badge cheap">الأرخص</span>' : ""}</td><td class="num">${sar(r.night)}</td><td class="num">${sar(r.night * ctx.nights * ctx.rooms)}</td>
            <td><a class="btn ${i === 0 ? "btn-primary" : "btn-ghost"} btn-sm" href="${esc(r.link || otaLink(r.site, h, ctx))}" target="_blank" rel="noopener">احجز ${ICON.out}</a></td></tr>`).join("")}
          </tbody></table></div>
          ${loadingRates ? '<p class="small muted">نحدّث الأسعار…</p>' : ""}
          ${rates.length > 1 ? `<p class="small" style="margin:6px 0 0">الفرق بين أرخص وأغلى موقع: <b class="num">${sar((rates[rates.length - 1].night - rates[0].night) * ctx.nights * ctx.rooms)}</b> على كامل الإقامة.</p>` : ""}
        </section>
        <section><h3 class="sec">الغرف المناسبة لعددكم</h3><div class="plan">
          ${plans.map(pl => `<div class="plan-opt ${pl.main ? "main" : ""}"><span><b>${esc(pl.label)}</b><br><span class="small muted">${esc(pl.note)}</span></span><b class="num">${sar(pl.total)}</b></div>`).join("")}
          </div><p class="small muted" style="margin:6px 0 0">${ctx.party.childAges.length ? "سياسة الأطفال (السكن المجاني أو السرير الإضافي) تختلف من فندق لفندق، تأكد منها في صفحة الحجز." : ""}</p></section>
        <section><h3 class="sec">شوفه في قوقل</h3><p class="small muted" style="margin:0 0 8px">قوقل ماب يعرض لك الفندق ومواقع الحجز وأسعارها مثل ما تعودت.</p>
          <div class="row"><a class="btn btn-ghost btn-sm" href="${esc(gMaps(h.name, ctx.city.en))}" target="_blank" rel="noopener">${ICON.map} افتح في قوقل ماب</a>
          <a class="btn btn-ghost btn-sm" href="${esc(gHotels(h.name, ctx.city.en))}" target="_blank" rel="noopener">قارن في قوقل للفنادق ${ICON.out}</a>
          ${h.url ? `<a class="btn btn-ghost btn-sm" href="${esc(h.url)}" target="_blank" rel="noopener">التقييمات ${ICON.out}</a>` : ""}</div></section>
        <div class="row">
          <button type="button" class="btn btn-ghost btn-sm" id="hd-fav" aria-pressed="${isFav("h:" + h.id + ctx.checkin)}">${ICON.star} مفضلة</button>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-watch">${ICON.bell} راقب السعر</button>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-hist">تاريخ السعر</button>
          <a class="btn btn-ghost btn-sm" href="${esc(waLink(hotelShare(h, ctx, rates)))}" target="_blank" rel="noopener">${ICON.share} واتساب</a>
        </div>`);
      $("#hd-fav").addEventListener("click", async e => { const on = await toggleFav({ id: "h:" + h.id + ctx.checkin, kind: "hotel", title: h.name, sub: `${ctx.city.ar} · ${fmtDay(ctx.checkin)} · ${ctx.nights} ليالي`, price: h.night, link: gMaps(h.name, ctx.city.en) }); e.currentTarget.setAttribute("aria-pressed", on); });
      $("#hd-watch").addEventListener("click", () => addWatch({ id: `w:h:${h.id}:${ctx.checkin}:${ctx.checkout}`, kind: "hotel", label: `${h.name} · ${fmtDay(ctx.checkin)} (${ctx.nights} ليالي)`, last: h.night, params: { id: h.id, checkin: ctx.checkin, checkout: ctx.checkout, per_room: ctx.perRoom } }));
      $("#hd-hist").addEventListener("click", async () => { const hist = await api("history", { kind: "hotel", key: h.id, day: ctx.checkin, current: h.night }); openDrawer(historyView(`${h.name} · ${fmtDay(ctx.checkin)}`, hist, "سعر الليلة.")); });
    };
    render(h.rates, !h.demo);
    if (h.demo) return;
    try {
      const r = await api("hotels/rates", { id: h.id, token: h.token, name: h.name, query: `${h.name} ${ctx.city.en}`, checkin: ctx.checkin, checkout: ctx.checkout, adults: ctx.party.adults, children: ctx.party.childAges.join(","), rooms: ctx.rooms });
      if (r.rates && r.rates.length && !$("#drawer").hidden) { h.rates = r.rates; h.night = r.rates[0].night; render(r.rates, false); }
      else if (!$("#drawer").hidden) render(h.rates, false);
    } catch (e) { if (!$("#drawer").hidden) render(h.rates, false); }
  }
  function hotelShare(h, ctx, rates) {
    return [`فندق من دروب 🏨`, h.name, `${ctx.city.ar} · ${fmtDay(ctx.checkin)} ← ${fmtDay(ctx.checkout)} (${ctx.nights} ليالي)`,
      `أرخص سعر: ${sar(rates[0] ? rates[0].night : h.night)} لليلة في ${rates[0] ? rates[0].site : ""}`, `المجموع تقريباً: ${sar((rates[0] ? rates[0].night : h.night) * ctx.nights * ctx.rooms)}`,
      gMaps(h.name, ctx.city.en)].join("\n");
  }

  // ------------------------------------------------------------------ full trip
  const T = { res: null };
  function pageTrip(root) {
    const pt = S.prefs.trip || { city: "g293974", nights: 5, months: months12().slice(1, 3) };
    const home = S.settings.home || "RUH";
    root.innerHTML = `
      <div class="page-head"><div><h1>رحلة كاملة</h1><p>تقول له وين وكم ليلة وفي أي أشهر، ويجمع لك الطيران والفندق لكل فترة ويرتبها من الأرخص بالمجموع.</p></div></div>
      <form class="panel search-form" id="tform" autocomplete="off">
        <div class="fields">
          ${placeField("t-o", "من", pt.o || { code: home, name: placeName(home) })}
          ${cityField("t-city", "الوجهة", pt.city)}
          <div class="field"><label for="t-n">كم ليلة</label><input class="input num" type="number" id="t-n" min="1" max="30" value="${pt.nights}"></div>
          ${travelersField("t-trav")}
          <div class="field"><label for="t-rooms">الغرف</label><select class="input" id="t-rooms">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === (pt.rooms || Math.max(1, Math.ceil(party().beds / 3))) ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        </div>
        <div class="field"><span class="lbl">الأشهر (اختر شهر أو أكثر)</span><div class="chip-set" id="t-months">${months12().map(m => `<button type="button" class="chip" data-m="${m}" aria-pressed="${pt.months.includes(m)}">${esc(fmtMonth(m))}</button>`).join("")}</div>
          <div class="chip-set" style="margin-top:6px"><button type="button" class="chip" data-preset="summer">الصيف</button><button type="button" class="chip" data-preset="winter">الشتاء</button><button type="button" class="chip" data-preset="next3">الثلاث أشهر الجاية</button></div></div>
        <div class="form-actions"><span class="small muted">نختار أرخص ستة مواعيد طيران، ونلقى لكل واحد أرخص فندق من أشهر فنادق المدينة.</span><button class="btn btn-primary" type="submit">احسب أرخص رحلة</button></div>
      </form>
      <div id="t-res"></div>`;
    const form = $("#tform", root);
    bindPlace(form, "t-o"); bindCity(form, "t-city"); bindTravelers(form, "t-trav");
    $("#t-months").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
    form.addEventListener("click", e => {
      const b = e.target.closest("[data-preset]"); if (!b) return;
      const ms = months12(), pick = b.dataset.preset === "next3" ? ms.slice(0, 3) : ms.filter(m => (b.dataset.preset === "summer" ? ["06", "07", "08"] : ["12", "01", "02"]).includes(m.slice(5)));
      $$("[data-m]", form).forEach(x => x.setAttribute("aria-pressed", pick.includes(x.dataset.m)));
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const o = codeOf($("#t-o")), cid = $("#t-city").dataset.city, c = CITIES.find(x => x.id === cid);
      const months = $$("[data-m][aria-pressed=true]", form).map(x => x.dataset.m), nights = Number($("#t-n").value || 5), rooms = Number($("#t-rooms").value || 1);
      if (!o || !c) return toast("اختر مدينة الإقلاع والوجهة.");
      if (!months.length) return toast("اختر شهر واحد على الأقل.");
      S.prefs.trip = { o: { code: o, name: placeName(o) }, city: cid, nights, months, rooms }; save("prefs");
      const p = party();
      try {
        const res = await withLoad("القافلة تحسب الطيران والفندق لكل فترة…", () => api("trip", { origin: o, city: cid, destination: c.iata, months: months.join(","), nights, adults: p.adults, children: p.childAges.join(","), rooms }));
        T.res = { windows: res.windows, c, p, o, demo: res.demo };
        remember("trip", `رحلة كاملة: ${c.ar} · ${nights} ليالي`, { o, cid, months, nights });
        drawTrip();
      } catch (err) { $("#t-res").innerHTML = errorBox(err); }
    });
    if (T.res) drawTrip();
  }
  function drawTrip() {
    const { windows, c, p, o, demo } = T.res, box = $("#t-res");
    if (!windows.length) { box.innerHTML = `<div class="panel empty"><b>ما لقينا مواعيد كاملة</b>جرب أشهر ثانية أو عدد ليالي مختلف.</div>`; return; }
    const rows = windows.map(w => { const fl = groupPrice(w.flight, p, false).total, ht = w.hotel.night * w.nights * w.rooms; return Object.assign(w, { fl, ht, total: fl + ht }); }).sort((a, b) => a.total - b.total);
    box.innerHTML = `<div class="list">${rows.map((w, i) => `<article class="panel trip-row">
        <div><div class="trip-rank">${i === 0 ? "الأرخص بالمجموع" : "الخيار " + (i + 1)}</div><b>${esc(fmtDay(w.depart))} ← ${esc(fmtDay(w.return))}</b><div class="small muted">${w.nights} ليالي · ${esc(partyLabel(p))}</div></div>
        <div><div class="lbl">الطيران · ${esc(airline(w.flight.airline))}</div><b class="num">${sar(w.fl)}</b><div class="small muted">${w.flight.transfers ? w.flight.transfers + " توقف" : "مباشر"}</div></div>
        <div><div class="lbl">الفندق · ${esc(w.hotel.site || "")}</div><b>${esc(w.hotel.name)}</b><div class="small muted num">${sar(w.hotel.night)} لليلة${w.rooms > 1 ? " × " + w.rooms + " غرف" : ""}</div></div>
        <div class="pricebox"><div class="price-big">${sar(w.total)}</div><div class="price-sub">${sar(w.total / p.total)} للشخص</div>
          <div class="row" style="gap:6px"><a class="btn btn-primary btn-sm" href="${esc(w.flight.link || gFlights(o, c.iata, w.depart, w.return))}" target="_blank" rel="noopener">الطيران ${ICON.out}</a><a class="btn btn-ghost btn-sm" href="${esc(gMaps(w.hotel.name, c.en))}" target="_blank" rel="noopener">الفندق ${ICON.out}</a></div></div>
      </article>`).join("")}</div>
      <p class="small muted">${demo ? "أسعار تجريبية. " : ""}الطيران من أسعار محفوظة، والفندق أرخص سعر من أشهر عشرة فنادق في ${esc(c.ar)} لنفس الليالي. أسعار الأطفال تقديرية.</p>`;
  }

  // ------------------------------------------------------------------ where to go
  const W = { res: null, region: "" };
  function pageWhere(root) {
    const pw = S.prefs.where || {}, home = S.settings.home || "RUH";
    root.innerHTML = `
      <div class="page-head"><div><h1>وين أروح؟</h1><p>حط ميزانيتك والشهر، ودروب يطلع لك أرخص الوجهات من مدينتك.</p></div></div>
      <form class="panel search-form" id="wform" autocomplete="off">
        <div class="fields">
          ${placeField("w-o", "من", pw.o || { code: home, name: placeName(home) })}
          <div class="field"><label for="w-month">الشهر</label><select class="input" id="w-month">${months12().map(m => `<option value="${m}" ${m === (pw.month || defaultMonth()) ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field"><label for="w-budget">الميزانية للشخص (طيران)</label><input class="input num" type="number" id="w-budget" min="0" step="100" placeholder="مثلاً 2000" value="${pw.budget || ""}"></div>
          <div class="field"><label for="w-type">نوع الرحلة</label><select class="input" id="w-type"><option value="1">ذهاب فقط</option><option value="0" ${pw.rt ? "selected" : ""}>ذهاب وعودة</option></select></div>
        </div>
        <div class="form-actions"><span></span><button class="btn btn-primary" type="submit">وريني الوجهات</button></div>
      </form>
      <div id="w-res"></div>`;
    const form = $("#wform", root);
    bindPlace(form, "w-o");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const o = codeOf($("#w-o")); if (!o) return toast("اختر مدينتك.");
      const month = $("#w-month").value, budget = Number($("#w-budget").value || 0), rt = $("#w-type").value === "0";
      S.prefs.where = { o: { code: o, name: placeName(o) }, month, budget, rt }; save("prefs");
      try {
        const res = await withLoad("القافلة تستكشف الوجهات…", () => api("flights/anywhere", { origin: o, month, one_way: rt ? 0 : 1 }));
        W.res = { tickets: res.tickets, budget, month, o, demo: res.demo };
        remember("where", `وين أروح من ${placeName(o)} · ${fmtMonth(month)}`, { o, month });
        drawWhere();
      } catch (err) { $("#w-res").innerHTML = errorBox(err); }
    });
    if (W.res) drawWhere();
  }
  function countryOf(code) { const c = CITIES.find(x => x.iata === code); return c ? c.country : null; }
  function drawWhere() {
    const { tickets, budget, demo } = W.res, box = $("#w-res");
    let list = tickets.filter(t => !budget || t.price <= budget);
    if (W.region) list = list.filter(t => (META.regions[W.region] || []).includes(countryOf(t.destination)));
    box.innerHTML = `<div class="sortbar"><div class="chip-set">${["", ...Object.keys(META.regions)].map(r => `<button type="button" class="chip" data-region="${esc(r)}" aria-pressed="${W.region === r}">${esc(r || "كل الوجهات")}</button>`).join("")}</div><span class="count">${list.length} وجهة${budget ? " ضمن " + sar(budget) : ""}</span></div>
      <div class="cards">${list.slice(0, 60).map(t => { const c = CITIES.find(x => x.iata === t.destination); return `<article class="panel dcard">
        <h3>${esc(placeName(t.destination))}</h3><span class="small muted">${esc(fmtDay((t.departure_at || "").slice(0, 10)))} · ${esc(airline(t.airline))} · ${t.transfers ? t.transfers + " توقف" : "مباشر"}</span>
        <div class="price-big">${sar(t.price)}</div><span class="small muted">للشخص${t.return_at ? " · ذهاب وعودة" : ""}</span>
        <div class="row" style="gap:6px"><a class="btn btn-primary btn-sm" href="${esc(t.link || gFlights(t.origin, t.destination, (t.departure_at || "").slice(0, 10)))}" target="_blank" rel="noopener">الرحلة ${ICON.out}</a>
        ${c ? `<button type="button" class="btn btn-ghost btn-sm" data-goh="${esc(c.id)}" data-day="${esc((t.departure_at || "").slice(0, 10))}">فنادقها</button>` : ""}</div></article>`; }).join("") || `<div class="panel empty"><b>ما فيه وجهات ضمن الميزانية</b>زِد الميزانية أو غيّر الشهر.</div>`}</div>
      <p class="small muted">${demo ? "أسعار تجريبية." : "أسعار محفوظة من عمليات بحث آخر أيام."}</p>`;
    $$("[data-region]", box).forEach(b => b.addEventListener("click", () => { W.region = b.dataset.region; drawWhere(); }));
    $$("[data-goh]", box).forEach(b => b.addEventListener("click", () => { const d = b.dataset.day >= today() ? b.dataset.day : addDays(today(), 7); S.prefs.hotels = Object.assign({}, S.prefs.hotels, { city: b.dataset.goh, ci: d, co: addDays(d, 3), lm: 0 }); H.hotels = []; H.cal = null; location.hash = "#hotels"; }));
  }

  // ------------------------------------------------------------------ watches / favorites / history
  async function pageWatch(root) {
    root.innerHTML = `
      <div class="page-head"><div><h1>متابعاتي</h1><p>الأسعار اللي تراقبها، ومفضلتك، وآخر عمليات البحث.</p></div>
        <div class="row"><button type="button" class="btn btn-primary" id="w-check">افحص الأسعار الحين</button>${MODE === "live" && "Notification" in window && Notification.permission === "default" ? '<button type="button" class="btn btn-ghost" id="w-notif">فعّل التنبيهات</button>' : ""}</div></div>
      <section><h2 class="sec">${ICON.bell} الأسعار اللي أراقبها</h2><div class="cards" id="w-list"></div></section>
      <section><h2 class="sec">${ICON.star} المفضلة</h2><div class="cards" id="fav-list"></div></section>
      <section><h2 class="sec">آخر عمليات البحث</h2><div class="panel" id="hist-list"></div></section>`;
    const draw = (results) => {
      const byId = Object.fromEntries((results || []).map(r => [r.id, r]));
      $("#w-list").innerHTML = (S.watches || []).map(w => {
        const r = byId[w.id], v = r && r.history ? VERDICT[r.history.verdict] || VERDICT.few : null;
        return `<article class="panel dcard"><span class="small muted">${w.kind === "flight" ? "طيران" : "فندق"}</span><h3 style="font-size:16px">${esc(w.label)}</h3>
          <div class="price-big">${sar(w.last)}${w.kind === "hotel" ? "<small> /ليلة</small>" : ""}</div>
          ${r && r.prev && r.price && r.price !== r.prev ? `<span class="small ${r.price < r.prev ? "stops-0" : "stops-2"}">${r.price < r.prev ? "نزل" : "طلع"} ${sar(Math.abs(r.price - r.prev))}</span>` : ""}
          ${v ? `<span class="verdict ${v[0]}">${v[1]}</span>${sparkline(r.history.points)}` : ""}
          ${r && r.error ? `<span class="small stops-2">${esc(r.error)}</span>` : ""}
          <div class="field"><label for="tg-${esc(w.id)}">نبهني إذا صار أقل من</label><input class="input num" type="number" id="tg-${esc(w.id)}" data-target="${esc(w.id)}" value="${w.target || ""}" placeholder="مثلاً ${Math.round((w.last || 1000) * 0.9)}"></div>
          <span class="small muted">${w.checked ? "آخر فحص: " + new Date(w.checked * 1000).toLocaleString("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium", timeStyle: "short" }) : "ما انفحص للحين"}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-unwatch="${esc(w.id)}">شيل المتابعة</button></article>`;
      }).join("") || `<div class="panel empty"><b>ما تراقب شي للحين</b>اضغط «راقب السعر» على أي رحلة أو فندق.</div>`;
      $("#fav-list").innerHTML = (S.favorites || []).map(f => `<article class="panel dcard"><span class="small muted">${f.kind === "flight" ? "طيران" : "فندق"}</span><h3 style="font-size:16px">${esc(f.title)}</h3><span class="small muted">${esc(f.sub || "")}</span><div class="price-big">${sar(f.price)}</div>
        <div class="row" style="gap:6px">${f.link ? `<a class="btn btn-ghost btn-sm" href="${esc(f.link)}" target="_blank" rel="noopener">افتح ${ICON.out}</a>` : ""}<button type="button" class="btn btn-ghost btn-sm" data-unfav="${esc(f.id)}">شيلها</button></div></article>`).join("") || `<div class="panel empty"><b>المفضلة فاضية</b>اضغط «مفضلة» على أي خيار يعجبك عشان تقارن بعدين.</div>`;
      $("#hist-list").innerHTML = (S.history || []).length ? `<div class="tbl-wrap"><table class="rates"><tbody>${S.history.map((h, i) => `<tr><td>${esc(h.label)}</td><td class="small muted">${new Date(h.at).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</td><td><button type="button" class="btn btn-ghost btn-sm" data-rerun="${i}">ابحث مرة ثانية</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">ما فيه عمليات بحث للحين.</div>`;
    };
    draw(S.lastWatchResults);
    $("#w-check").addEventListener("click", async () => { const res = await withLoad("نفحص أسعار متابعاتك…", () => autoCheckWatches(true)); if (res) { S.lastWatchResults = res.results; draw(res.results); } });
    const nb = $("#w-notif"); nb && nb.addEventListener("click", () => Notification.requestPermission().then(() => nb.remove()));
    root.addEventListener("change", async e => { const id = e.target.dataset.target; if (!id) return; const w = S.watches.find(x => x.id === id); if (w) { w.target = Number(e.target.value) || null; await save("watches"); toast("انحفظ السعر المطلوب"); } });
    root.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.unwatch) { S.watches = S.watches.filter(w => w.id !== b.dataset.unwatch); await save("watches"); draw(S.lastWatchResults); }
      if (b.dataset.unfav) { S.favorites = S.favorites.filter(f => f.id !== b.dataset.unfav); await save("favorites"); draw(S.lastWatchResults); }
      if (b.dataset.rerun != null) rerun(S.history[Number(b.dataset.rerun)]);
    });
  }
  function rerun(h) {
    if (!h) return;
    const p = h.params || {};
    if (h.kind === "flight") { S.prefs.flights = Object.assign({}, S.prefs.flights, { o: { code: p.o, name: placeName(p.o) }, d: { code: p.d, name: placeName(p.d) }, dep: p.dep, ret: p.ret, nights: p.nights }); F.mode = p.mode || "dates"; F.trip = p.rt ? "rt" : "ow"; F.tickets = []; F.cal = null; if (p.month) F.month = p.month; location.hash = "#flights"; }
    else if (h.kind === "hotel") { S.prefs.hotels = Object.assign({}, S.prefs.hotels, { city: p.city, ci: p.ci, co: p.co }); H.mode = "dates"; H.hotels = []; H.cal = null; location.hash = "#hotels"; }
    else if (h.kind === "trip") location.hash = "#trip";
    else location.hash = "#where";
  }

  // ------------------------------------------------------------------ settings
  function pageSetup(root) {
    const st = S.settings;
    const seasonsList = seasons(), bag = baggage();
    root.innerHTML = `
      <div class="page-head"><div><h1>الإعدادات</h1><p>مفاتيح مصادر الأسعار، ومدينتك، والمواسم، ورسوم الشنط.</p></div></div>
      ${MODE === "demo" ? `<div class="panel panel-pad small">هذي نسخة التجربة. المفاتيح تنحط في نسخة الكمبيوتر، وتنحفظ على جهازك بس.</div>` : ""}
      <section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec"><span class="status-dot ${st.has_tp ? "on" : ""}"></span> أسعار الطيران · Travelpayouts (مجاني)</h2>
        <ol class="steps small">
          <li>افتح <a href="https://www.travelpayouts.com/" target="_blank" rel="noopener">travelpayouts.com</a> وسجّل حساب مجاني بإيميلك.</li>
          <li>إذا سألك عن مشروعك، جاوب إنه برنامج شخصي للبحث عن أسعار الطيران.</li>
          <li>من قائمة البرامج (Programs) دوّر على <b>Aviasales</b> واضغط انضمام (Join).</li>
          <li>روح لصفحة <b>API</b> في حسابك (غالباً من قائمة Tools)، وانسخ <b>API token</b>.</li>
          <li>الصقه هنا واضغط «احفظ». إذا تغيّرت أسماء القوائم، دوّر في الموقع على كلمة «API token».</li>
        </ol>
        <div class="row"><div class="field grow"><label for="s-tp">API token</label><input class="input" id="s-tp" type="password" placeholder="${st.has_tp ? "محفوظ ✓ (اكتب مفتاح جديد لو تبي تغيّره)" : "الصق المفتاح هنا"}"></div><button type="button" class="btn btn-primary" data-savekey="tp">احفظ</button></div>
      </section>
      <section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec"><span class="status-dot ${st.has_serp ? "on" : ""}"></span> نتائج قوقل للفنادق والطيران · SerpApi (اختياري)</h2>
        <p class="small muted" style="margin:0">يجيب نفس الأسعار اللي تشوفها في قوقل ماب لكل موقع حجز، ويحسب أعمار الأطفال بدقة، ويضيف فلتر النجوم والإلغاء المجاني. الخطة المجانية فيها حوالي 250 بحث بالشهر، وكل بحث فنادق أو فتح فندق يستهلك واحد.</p>
        <ol class="steps small"><li>سجّل مجاناً في <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener">serpapi.com</a>.</li><li>من لوحة التحكم (Dashboard) انسخ <b>Private API Key</b>.</li><li>الصقه هنا واحفظ.</li></ol>
        <div class="row"><div class="field grow"><label for="s-serp">SerpApi key</label><input class="input" id="s-serp" type="password" placeholder="${st.has_serp ? "محفوظ ✓" : "اختياري"}"></div><button type="button" class="btn btn-primary" data-savekey="serp">احفظ</button></div>
        <div class="checks"><label class="check"><input type="checkbox" id="s-sh" ${st.use_serp_hotels !== false ? "checked" : ""}> استخدمه للفنادق</label><label class="check"><input type="checkbox" id="s-sf" ${st.use_serp_flights ? "checked" : ""}> استخدمه للطيران بالتاريخ المحدد (أسعار مباشرة)</label></div>
      </section>
      <section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec">عام</h2>
        <div class="fields">
          <div class="field"><label for="s-home">مدينتك (مطار الإقلاع المعتاد)</label><select class="input" id="s-home">${META.homeAirports.map(a => `<option value="${a.code}" ${a.code === (st.home || "RUH") ? "selected" : ""}>${a.name} (${a.code})</option>`).join("")}</select></div>
          <div class="field"><span class="lbl">المظهر</span>${seg("theme", [["", "حسب الجهاز"], ["light", "فاتح"], ["dark", "داكن"]], S.prefs.theme || "")}</div>
        </div>
        ${st.data_dir ? `<p class="small muted" style="margin:0">بياناتك محفوظة على جهازك في: <code>${esc(st.data_dir)}</code></p>` : ""}
      </section>
      <section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec">المواسم على التقويم</h2>
        <p class="small muted" style="margin:0">التواريخ الهجرية تقريبية حسب رؤية الهلال، وتواريخ الإجازات تقريبية. عدّلها أو زِد مواسمك.</p>
        <div class="tbl-wrap"><table class="rates" id="s-seasons"><thead><tr><th>الموسم</th><th>من</th><th>إلى</th><th>النوع</th><th></th></tr></thead><tbody>
          ${seasonsList.map((s, i) => `<tr><td><input class="input" data-si="${i}" data-sk="name" value="${esc(s.name)}"></td><td><input class="input" type="date" data-si="${i}" data-sk="from" value="${s.from}"></td><td><input class="input" type="date" data-si="${i}" data-sk="to" value="${s.to}"></td>
            <td><select class="input" data-si="${i}" data-sk="kind">${[["holiday", "إجازة / عيد"], ["high", "موسم مزدحم"], ["ramadan", "رمضان"], ["hajj", "حج"]].map(([v, l]) => `<option value="${v}" ${s.kind === v ? "selected" : ""}>${l}</option>`).join("")}</select></td><td><button type="button" class="icon-btn" data-sdel="${i}" aria-label="حذف">✕</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="s-sadd">+ موسم جديد</button><button type="button" class="btn btn-ghost btn-sm" id="s-sreset">رجّع الافتراضي</button></div>
      </section>
      <section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec">رسوم الشنطة (للسعر الحقيقي)</h2>
        <p class="small muted" style="margin:0">سعر شنطة وحدة (حوالي ٢٠ كيلو) لكل اتجاه بالريال، لشركات الطيران الاقتصادي. الأرقام تقديرية، عدّلها حسب آخر أسعارهم.</p>
        <div class="kv">${Object.entries(bag).map(([c, v]) => `<div class="field"><label for="bg-${c}">${esc(airline(c))} (${c})</label><input class="input num" type="number" id="bg-${c}" data-bag="${c}" value="${v}"></div>`).join("")}</div>
      </section>
      <section class="panel panel-pad" style="display:grid;gap:10px">
        <h2 class="sec">المجموعات المحفوظة</h2>
        <div class="chip-set">${(S.groups || []).map((g, i) => `<span class="chip" aria-pressed="false">${esc(g.name)} · ${esc(partyLabel(party(g.people)))} <button type="button" class="icon-btn" style="width:24px;height:24px" data-gdel="${i}" aria-label="حذف">✕</button></span>`).join("") || '<span class="small muted">تحفظ المجموعات من زر «المسافرون» في أي بحث.</span>'}</div>
      </section>`;
    root.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.savekey) {
        const isTp = b.dataset.savekey === "tp", val = $(isTp ? "#s-tp" : "#s-serp").value.trim();
        if (!val) return toast("الصق المفتاح أول.");
        S.settings = await api("settings", null, isTp ? { tp_token: val } : { serp_key: val });
        toast("انحفظ المفتاح ✓", "good"); notice(); pageSetup(root);
      }
      if (b.dataset.sdel != null) { const l = seasons().slice(); l.splice(Number(b.dataset.sdel), 1); S.seasons = l; await save("seasons"); applySeasons(); pageSetup(root); }
      if (b.id === "s-sadd") { S.seasons = seasons().concat([{ name: "موسم جديد", from: today(), to: addDays(today(), 7), kind: "holiday" }]); await save("seasons"); applySeasons(); pageSetup(root); }
      if (b.id === "s-sreset") { S.seasons = null; await save("seasons"); applySeasons(); pageSetup(root); }
      if (b.dataset.gdel != null) { S.groups.splice(Number(b.dataset.gdel), 1); await save("groups"); pageSetup(root); }
    }, { once: false });
    root.addEventListener("change", async e => {
      const t = e.target;
      if (t.dataset.si != null) { const l = seasons().map(s => Object.assign({}, s)); l[Number(t.dataset.si)][t.dataset.sk] = t.value; S.seasons = l; await save("seasons"); applySeasons(); }
      if (t.dataset.bag) { S.baggage = Object.assign({}, baggage(), { [t.dataset.bag]: Number(t.value) || 0 }); await save("baggage"); }
      if (t.id === "s-home") { S.settings = await api("settings", null, { home: t.value }); toast("تم"); }
      if (t.id === "s-sh" || t.id === "s-sf") S.settings = await api("settings", null, { use_serp_hotels: $("#s-sh").checked, use_serp_flights: $("#s-sf").checked });
    });
    bindSeg(root, "theme", v => { S.prefs.theme = v; applyTheme(v); save("prefs"); });
  }

  // ------------------------------------------------------------------ router
  const PAGES = { flights: pageFlights, hotels: pageHotels, trip: pageTrip, where: pageWhere, watch: pageWatch, setup: pageSetup };
  function route() {
    const name = (location.hash || "#flights").slice(1);
    const page = PAGES[name] ? name : "flights";
    $$("#tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.tab === page ? "page" : "false"));
    if (H.map) { try { H.map.remove(); } catch (e) { /* already gone */ } H.map = null; }
    const old = $("#view"), fresh = old.cloneNode(false); old.replaceWith(fresh); // drop old listeners
    notice();
    PAGES[page](fresh);
    window.scrollTo(0, 0);
  }

  boot().catch(e => { $("#view").innerHTML = errorBox(e); });
})();
