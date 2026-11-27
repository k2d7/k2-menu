/* Duroob (دروب) — shared helpers, state, data access and components. Pages register through D.page(). */
(function () {
  "use strict";
  const META = window.DUROOB_META;
  const D = window.D = {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const sar = n => I18N.money(n);
  const sarShort = n => I18N.moneyShort(n);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = s => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d || 1, 12); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const today = () => iso(new Date());
  const G = new Intl.DateTimeFormat(I18N.LOC_G, { weekday: "short", day: "numeric", month: "short" });
  const GL = new Intl.DateTimeFormat(I18N.LOC_G, { weekday: "long", day: "numeric", month: "long" });
  const GM = new Intl.DateTimeFormat(I18N.LOC_G, { month: "long", year: "numeric" });
  const GMs = new Intl.DateTimeFormat(I18N.LOC_G, { month: "long" });
  const HD = new Intl.DateTimeFormat(I18N.LOC_H, { day: "numeric" });
  const HM = new Intl.DateTimeFormat(I18N.LOC_H, { month: "long", year: "numeric" });
  const fmtDay = s => s ? G.format(parse(s)) : "";
  const fmtDayLong = s => s ? GL.format(parse(s)) : "";
  const fmtMonth = m => GM.format(parse(m + "-01"));
  const monthName = m => GMs.format(parse(m + "-01"));
  const hhmm = s => s && s.length >= 16 ? s.slice(11, 16) : "";
  const dur = m => { if (!m) return ""; const h = Math.floor(m / 60), mm = Math.round(m % 60); return h ? `${h}${tx("س")} ${mm ? mm + tx("د") : ""}`.trim() : `${mm}${tx("د")}`; };
  const airline = c => META.airlines[c] || c || tx("شركة طيران");
  const months12 = () => { const t = new Date(), o = []; for (let i = 0; i < 12; i++) o.push(iso(new Date(t.getFullYear(), t.getMonth() + i, 1)).slice(0, 7)); return o; };
  const defaultMonth = () => months12()[new Date().getDate() > 20 ? 1 : 0];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };

  const ICON = {
    swap: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4v16M7 4L3 8M7 4l4 4M17 20V4m0 16l-4-4m4 4l4-4"/></svg>',
    star: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-3.9-1z"/></svg>',
    out: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>',
    map: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    filter: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16l-6 8v6l-4-2v-4z"/></svg>',
    user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    scroll: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h11a2 2 0 012 2v2H9M7 3a2 2 0 00-2 2v12a2 2 0 01-2 2h12a2 2 0 002-2V7M7 3a2 2 0 012 2v2"/><path d="M9 12h5M9 15h5"/></svg>',
    plane: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14L3 11l2-2 7 1 5-5a2 2 0 013 3l-5 5 1 7-2 2-3-7-3 3v3l-2 1-1-4-4-1 1-2h3z"/></svg>',
    bed: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18V6M3 13h18v5M21 13a3 3 0 00-3-3h-7v3M7 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/></svg>',
    note: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v12l-4 4H5zM15 20v-4h4M8 9h8M8 13h5"/></svg>',
    sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    pass: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/></svg>',
    wallet: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l12-4 2 4M16 13h2"/></svg>',
    kaaba: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8l8-4 8 4v10l-8 3-8-3zM4 8l8 3 8-3M12 11v10M4 11.5l8 3 8-3"/></svg>',
    moon: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>',
    route: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h7" stroke-dasharray="2 3"/></svg>'
  };

  // ------------------------------------------------------------------ state + data access
  const X = { mode: "demo", cities: [], climate: {}, airports: {}, names: {} };
  const S = { settings: {}, groups: [], favorites: [], watches: [], history: [], prefs: {}, seasons: null, baggage: null, trips: [], holidays: null };
  const PAGES = {};

  async function boot() {
    try {
      const r = await Promise.race([fetch("api/ping", { cache: "no-store" }), new Promise((_, j) => setTimeout(() => j(new Error("t")), 1500))]);
      const pj = r.ok ? await r.json() : {};
      if (pj.app === "duroob") { X.mode = "live"; X.web = !!pj.web; }
    } catch (e) { X.mode = "demo"; }
    // Family link: "#k=..." carries the owner's keys; save them in this browser and drop them from the address.
    if (X.web && location.hash.startsWith("#k=")) {
      try {
        const k = JSON.parse(atob(location.hash.slice(3).replace(/-/g, "+").replace(/_/g, "/")));
        for (const kind of ["tp", "serp"]) if (/^[A-Za-z0-9_-]{8,128}$/.test(k[kind] || "")) { setWebKey(kind, k[kind]); X.joined = true; }
      } catch (e) { /* broken link: carry on without keys */ }
      history.replaceState(null, "", location.pathname + "#home");
    }
    const load = async (f, def) => { try { return await (await fetch("data/" + f)).json(); } catch (e) { return def; } };
    [X.cities, X.climate, X.airports] = await Promise.all([load("cities.json", []), load("climate.json", {}), load("airports.json", {})]);
    load("names.json", {}).then(n => { X.names = n || {}; });
    window.DuroobDemo.init(X.cities, X.airports);
    S.settings = await api("settings");
    try { const fx = await api("fx"); I18N.setFx(fx.rates, fx.live); } catch (e) { /* keep built-in rates */ }
    for (const k of ["groups", "favorites", "watches", "history", "prefs", "seasons", "baggage", "trips", "holidays"]) {
      let v = null;
      if (X.web) { try { v = JSON.parse(I18N.store.get("store:" + k, "null")); } catch (e) { v = null; } }
      else v = (await api("store/" + k)).value;
      if (v != null) S[k] = v;
    }
    if (!S.prefs || typeof S.prefs !== "object") S.prefs = {};
    if (!S.prefs.people) S.prefs.people = [{ by: new Date().getFullYear() - 30 }, { by: new Date().getFullYear() - 28 }];
    if (!Array.isArray(S.trips)) S.trips = [];
    applySeasons(); applyTheme(S.prefs.theme);
    bindNav();
    window.addEventListener("hashchange", route);
    route();
    if (X.joined) toast(tx("أهلاً بك في دروب! جاهز بأسعار حقيقية ✓"), "good");
    if (X.mode === "live" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    if (X.mode === "live") {
      setInterval(() => fetch("api/ping").catch(() => {}), 20000);
      setTimeout(() => autoCheckWatches(false), 4000);
      setInterval(() => autoCheckWatches(false), 3 * 3600 * 1000);
    }
  }
  function applySeasons() { window.DUROOB_SEASONS = S.seasons || META.seasons; }
  const seasons = () => S.seasons || META.seasons;
  const baggage = () => S.baggage || META.baggage;
  function applyTheme(t) { if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme"); }

  // Website: price-source keys live in this browser only and go with each request; the server never stores them.
  function webKeys() { try { return JSON.parse(I18N.store.get("keys") || "{}") || {}; } catch (e) { return {}; } }
  function setWebKey(kind, val) { const k = webKeys(); if (val) k[kind] = val; else delete k[kind]; I18N.store.set("keys", JSON.stringify(k)); }
  // Link to send to family: the site address, plus this browser's keys so it works for them straight away.
  function familyLink() {
    const k = webKeys(), base = location.origin + location.pathname;
    if (!k.tp && !k.serp) return base;
    return base + "#k=" + btoa(JSON.stringify({ tp: k.tp, serp: k.serp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function api(path, params, body) {
    const sp = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
    if (X.mode === "demo") return window.DuroobDemo.call(path, sp, body);
    const q = Object.keys(sp).length ? "?" + new URLSearchParams(sp).toString() : "";
    const headers = {};
    if (X.web) { const k = webKeys(); if (k.tp) headers["X-TP-Token"] = k.tp; if (k.serp) headers["X-Serp-Key"] = k.serp; }
    const opt = body !== undefined ? { method: "POST", headers: Object.assign(headers, { "Content-Type": "application/json", "X-Duroob": "1" }), body: JSON.stringify(body) } : { headers };
    const r = await fetch("api/" + path + q, opt);
    const data = await r.json().catch(() => ({ error: tx("رد غير مفهوم من البرنامج") }));
    if (!r.ok) {
      if (data.code === "no_tp" || data.code === "no_serp") { const d = window.DuroobDemo.call(path, sp, body); d.demo = true; d.reason = data.code; return d; }
      const err = new Error(data.error || tx("صار خطأ")); err.code = data.code; throw err;
    }
    return data;
  }
  async function save(k) {
    if (X.web) { I18N.store.set("store:" + k, JSON.stringify(S[k])); return; }
    await api("store/" + k, null, { value: S[k] });
  }

  // ------------------------------------------------------------------ ui helpers
  let loaderTimer = null;
  function loading(on, text) {
    const el = $("#loader"); clearTimeout(loaderTimer);
    if (on) { $("#loader-text").textContent = text || tx("القافلة تدوّر لك على الأسعار…"); loaderTimer = setTimeout(() => { el.hidden = false; }, 250); }
    else el.hidden = true;
  }
  async function withLoad(text, fn) { loading(true, text); try { return await fn(); } finally { loading(false); } }
  function toast(msg, kind) { const t = document.createElement("div"); t.className = "toast " + (kind || ""); t.textContent = msg; $("#toasts").appendChild(t); setTimeout(() => t.remove(), 4200); }
  const errorBox = e => `<div class="panel empty"><b>${tx("ما ضبط")}</b>${esc(e.message || e)}</div>`;
  function notice() {
    const el = $("#notice"); let html = "";
    if (X.mode === "demo") html = tx("<b>نسخة تجربة.</b> كل الأسعار هنا تجريبية للعرض فقط. الأسعار الحقيقية تشتغل في نسخة الكمبيوتر.");
    else if (!S.settings.has_tp) html = `<b>${tx("الطيران يعرض أسعار تجريبية")}</b> ${tx("لين تحط مفتاح Travelpayouts المجاني. الفنادق أسعارها حقيقية.")} <a href="#setup">${tx("حط المفتاح")}</a>`;
    el.innerHTML = html ? `<div class="wrap">${html}</div>` : ""; el.hidden = !html;
  }
  function openDrawer(html) { $("#drawer-body").innerHTML = html; $("#drawer").hidden = false; document.body.style.overflow = "hidden"; $(".drawer-x").focus(); }
  function closeDrawer() { $("#drawer").hidden = true; document.body.style.overflow = ""; }
  document.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(); });
  const seg = (name, opts, val) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(val)}">${l}</button>`).join("")}</div>`;
  function bindSeg(root, name, cb) {
    const g = $(`[data-seg="${name}"]`, root); if (!g) return;
    g.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $$("button", g).forEach(x => x.setAttribute("aria-pressed", x === b)); cb(b.dataset.v); });
  }
  const segVal = (root, name) => { const b = $(`[data-seg="${name}"] button[aria-pressed="true"]`, root); return b ? b.dataset.v : null; };
  const setSeg = (root, name, v) => $$(`[data-seg="${name}"] button`, root).forEach(x => x.setAttribute("aria-pressed", x.dataset.v === v));
  const waLink = text => "https://wa.me/?text=" + enc(text);
  function hero(key, title, actions, back) {
    const [eyebrow] = META.lore[key] || [""];
    return `<header class="hero">${back ? `<a class="back" href="${back[0]}">‹ ${esc(back[1])}</a>` : ""}
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}<h1>${esc(title)}</h1>${actions ? `<div class="hero-actions">${actions}</div>` : ""}</header>`;
  }
  // A simple list of big buttons in the drawer (keeps result cards short).
  function actionsDrawer(title, items) {
    openDrawer(`<h2 id="drawer-title">${esc(title)}</h2><div class="action-list">${items.map((it, i) => it.href
      ? `<a class="action" href="${esc(it.href)}" target="_blank" rel="noopener">${it.icon || ""}<span>${esc(it.label)}</span></a>`
      : `<button type="button" class="action" data-ai="${i}">${it.icon || ""}<span>${esc(it.label)}</span></button>`).join("")}</div>`);
    $$("[data-ai]").forEach(b => b.addEventListener("click", () => items[Number(b.dataset.ai)].onClick(b)));
  }
  const more = label => `<details class="more"><summary>${tx("خيارات أكثر")}</summary><div class="more-body">${label}</div></details>`;

  // ------------------------------------------------------------------ travelers
  const year = new Date().getFullYear();
  const ageOf = p => Math.max(0, year - p.by);
  const kindOf = a => a >= 12 ? "adult" : a >= 2 ? "child" : "infant";
  const KIND = { adult: tx("بالغ"), child: tx("طفل"), infant: tx("رضيع") };
  function party(people) {
    const ps = people || S.prefs.people || [];
    const ages = ps.map(ageOf), kids = ages.filter(a => a < 12);
    const adults = ages.filter(a => a >= 12).length || 1;
    return { adults, children: kids.filter(a => a >= 2).length, infants: kids.filter(a => a < 2).length, childAges: kids, beds: adults + kids.filter(a => a >= 2).length, total: ps.length || 1,
      names: ps.map((p, i) => p.name || (kindOf(ageOf(p)) === "adult" ? tx("مسافر ") + (i + 1) : KIND[kindOf(ageOf(p))] + " " + (i + 1))) };
  }
  function partyLabel(p) {
    const bits = [P(p.adults, "adult")];
    if (p.children) bits.push(P(p.children, "child"));
    if (p.infants) bits.push(P(p.infants, "infant"));
    return bits.join(" · ");
  }
  const partyParams = () => { const p = party(); return { adults: p.adults, children: p.children, infants: p.infants }; };
  function travelersField(id) {
    return `<div class="field" id="${id}"><label>${tx("المسافرون")}</label>
      <button type="button" class="btn trav-btn" data-trav aria-expanded="false"><span data-trav-label>${esc(partyLabel(party()))}</span>${ICON.user}</button>
      <div class="trav-pop" hidden></div></div>`;
  }
  function bindTravelers(root, id, onChange) {
    const box = $("#" + id, root), btn = $("[data-trav]", box), pop = $(".trav-pop", box);
    const draw = () => {
      const ps = S.prefs.people;
      pop.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:center"><b>${tx("مين بيسافر؟")}</b><span class="small muted">${tx("العمر يتحدث تلقائياً كل سنة")}</span></div>
        ${ps.map((p, i) => `<div class="person"><input class="input" data-name="${i}" placeholder="${tx("الاسم (اختياري)")}" value="${esc(p.name || "")}" aria-label="${tx("الاسم")}">
          <input class="input num" type="number" min="0" max="110" data-age="${i}" value="${ageOf(p)}" aria-label="${tx("العمر")}">
          <span class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><span class="tag">${KIND[kindOf(ageOf(p))]}</span><button type="button" class="icon-btn" data-del="${i}" aria-label="${tx("حذف")}">✕</button></span></div>`).join("")}
        <div class="chip-set"><button type="button" class="chip" data-add="30">${tx("+ بالغ")}</button><button type="button" class="chip" data-add="8">${tx("+ طفل")}</button><button type="button" class="chip" data-add="1">${tx("+ رضيع")}</button></div>
        <hr class="sep"><div class="lbl">${tx("مجموعات محفوظة")}</div>
        <div class="chip-set">${(S.groups || []).map((g, i) => `<button type="button" class="chip" data-group="${i}">${esc(g.name)} (${g.people.length})</button>`).join("") || tx('<span class="small muted">ما فيه مجموعات للحين</span>')}</div>
        <div class="row"><input class="input grow" id="${id}-gname" placeholder="${tx("اسم المجموعة، مثل: العائلة")}"><button type="button" class="btn btn-ghost btn-sm" data-savegroup>${tx("احفظ المجموعة")}</button></div>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-primary btn-sm" data-done>${tx("تم")}</button></div>`;
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
        const name = $("#" + id + "-gname").value.trim() || tx("مجموعتي");
        S.groups = (S.groups || []).filter(g => g.name !== name).concat([{ name, people: JSON.parse(JSON.stringify(S.prefs.people)) }]);
        await save("groups"); draw(); toast(tx("انحفظت المجموعة: ") + name);
      } else if (t.hasAttribute("data-done")) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("click", e => { if (!box.isConnected) return; if (!box.contains(e.target)) { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
  }

  // ------------------------------------------------------------------ place inputs
  function placeField(id, label, val, ph) {
    return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" autocomplete="off" placeholder="${ph || tx("مدينة أو مطار")}" value="${esc(val && val.code ? (placeName(val.code) !== val.code ? placeName(val.code) : val.name) + " (" + val.code + ")" : "")}" data-code="${esc(val ? val.code || "" : "")}" data-name="${esc(val && val.code ? (placeName(val.code) !== val.code ? placeName(val.code) : val.name) : "")}"><div class="ac-list" hidden></div></div>`;
  }
  function bindPlace(root, id, onPick) {
    const inp = $("#" + id, root), list = inp.nextElementSibling;
    let timer, items = [], on = -1;
    const pick = p => { inp.value = `${p.name} (${p.code})`; inp.dataset.code = p.code; inp.dataset.name = p.name; list.hidden = true; onPick && onPick(p); };
    const draw = () => { list.innerHTML = items.map((p, i) => `<div class="ac-item ${i === on ? "on" : ""}" data-i="${i}"><span>${esc(p.name)} <span class="small muted">${esc(p.country || "")}</span></span><span class="code">${esc(p.code)}</span></div>`).join(""); list.hidden = !items.length; };
    inp.addEventListener("input", () => {
      inp.dataset.code = ""; clearTimeout(timer);
      const t = inp.value.trim(); if (t.length < 2) { list.hidden = true; return; }
      timer = setTimeout(async () => { try { items = (await api("places", { term: t, locale: I18N.LANG })).filter(p => p.code).slice(0, 8); on = -1; draw(); } catch (e) { list.hidden = true; } }, 220);
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
    const c = X.cities.find(x => x.iata === code); if (c) return L(c);
    const a = X.airports[code]; if (a) return L(a);
    const n = X.names[code]; if (n) return I18N.LANG === "en" ? n[1] : n[0];
    const h = META.homeAirports.find(x => x.code === code); return h ? h.name : code;
  }
  const cityByIata = code => X.cities.find(x => x.iata === code) || null;
  const countryOfCode = code => { const c = cityByIata(code); if (c) return c.country; const a = X.airports[code]; if (a) return a.cc; const n = X.names[code]; return n ? n[2] : null; };
  function cityField(id, label, cid) {
    const c = X.cities.find(x => x.id === cid);
    return `<div class="field"><label for="${id}">${label}</label><input class="input" id="${id}" autocomplete="off" placeholder="${tx("اكتب اسم المدينة")}" value="${esc(c ? c.ar : "")}" data-city="${esc(c ? c.id : "")}"><div class="ac-list" hidden></div></div>`;
  }
  function bindCity(root, id, onPick) {
    const inp = $("#" + id, root), list = inp.nextElementSibling;
    let items = [], on = -1;
    const pick = c => { inp.value = L(c); inp.dataset.city = c.id; list.hidden = true; onPick && onPick(c); };
    const draw = () => { list.innerHTML = items.map((c, i) => `<div class="ac-item ${i === on ? "on" : ""}" data-i="${i}"><span>${esc(L(c))} <span class="small muted">${esc(I18N.LANG === "en" ? c.ar : c.en)}</span></span><span class="code">${esc(c.country)}</span></div>`).join(""); list.hidden = !items.length; };
    const filter = () => { const t = inp.value.trim().toLowerCase().replace(/^ال/, ""); items = X.cities.filter(c => !t || c.ar.replace(/^ال/, "").includes(t) || c.ar.includes(t) || c.en.toLowerCase().includes(t)).slice(0, 10); on = -1; draw(); };
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

  // ------------------------------------------------------------------ destination facts: weather, visa, daily spend
  function climateOf(cityId, month) {
    const c = X.climate[cityId]; if (!c) return null;
    const [hi, lo, rain] = c[Number(month.slice(5, 7)) - 1]; return { hi, lo, rain };
  }
  function feel(cl) { if (!cl) return ""; const t = (cl.hi + cl.lo) / 2; return t < 8 ? tx("بارد جداً") : t < 15 ? tx("بارد") : t < 22 ? tx("معتدل") : t < 29 ? tx("دافي") : t < 34 ? tx("حار") : tx("حار جداً"); }
  function visaOf(cc) {
    if (!cc || cc === "SA") return null;
    const v = META.visa.countries[cc]; if (!v) return { label: tx("غير معروف"), cls: "visa-mid", sure: false };
    const [label, ease] = META.visa.kinds[v[0]];
    return { kind: v[0], label, cls: "visa-" + ease, ease, sure: v[1] };
  }
  const visaCheckLink = cc => "https://www.google.com/search?q=" + enc(`${tx("متطلبات دخول")} ${META.visa.countryNames[cc] || cc} ${tx("للمواطنين السعوديين")}`);
  const dailyCost = cc => META.dailyCost[cc] || null;
  function infoStrip(cityOrCode, month, nights, people) {
    const c = typeof cityOrCode === "string" ? (cityByIata(cityOrCode) || X.cities.find(x => x.id === cityOrCode)) : cityOrCode;
    if (!c) return "";
    const cl = climateOf(c.id, month), v = visaOf(c.country), dc = dailyCost(c.country);
    return `<section class="panel info-strip" aria-label="${tx("عن الوجهة")}">
      <div class="info"><span class="lbl">${ICON.sun} ${tx("الجو في")} ${esc(monthName(month))}</span>${cl ? `<b>${esc(feel(cl))} · ${cl.lo}° – ${cl.hi}°</b><span class="small muted">${cl.rain >= 8 ? tx("أمطار كثيرة") : cl.rain >= 3 ? tx("أمطار أحياناً") : tx("قليل المطر")} (${P(cl.rain, "day")} ${tx("بالشهر تقريباً")})</span>` : tx('<span class="small muted">ما عندنا بيانات</span>')}</div>
      ${v ? `<div class="info"><span class="lbl">${ICON.pass} ${tx("التأشيرة للجواز السعودي")}</span><b class="${v.cls}">${esc(v.label)}</b><span class="small muted">${v.sure ? "" : tx("غير مؤكد · ")}${tx("تحديث")} ${esc(META.visa.updated)} · <a href="${esc(visaCheckLink(c.country))}" target="_blank" rel="noopener">${tx("تأكد قبل السفر")}</a></span></div>` : ""}
      ${countryInfo(c, month)}
      ${dc ? `<div class="info"><span class="lbl">${ICON.wallet} ${tx("مصروف يومي تقريبي")}</span><b>${sar(dc)} ${tx("للشخص")}</b><span class="small muted">${tx("أكل ومواصلات")}${nights ? ` · ${P(nights, "day")} ${tx("لـ")}${P(people || 1, "person")}: ${sar(dc * nights * (people || 1))}` : ""} ${tx("(تقديري)")}</span></div>` : ""}
    </section>`;
  }

  function countryInfo(c, month) {
    const k = window.DX && DX.countryCard(c, month + "-15"); if (!k) return "";
    const diff = k.diff === 0 ? tx("نفس توقيت السعودية") : `${k.diff > 0 ? "+" : "−"}${Math.abs(k.diff)} ${tx("ساعة عن السعودية")}`;
    return `<div class="info"><span class="lbl">${ICON.map} ${tx("بطاقة الدولة")}</span><b>${esc(diff)}</b>
      <span class="small muted">${tx("الفيش")} ${esc(k.plugs)}${k.adapter ? " · " + tx("تحتاج محوّل") : ""} · ${k.drive === "L" ? tx("السواقة يسار") : tx("السواقة يمين")} · ${tx("الطوارئ")} ${esc(k.emergency)}</span>
      <button type="button" class="link-btn" data-place="${esc(c.id)}">${tx("أوقات الصلاة والقبلة والمساجد")}</button></div>`;
  }
  // Prayer times, qibla, and mosques / halal food near a city's landmark.
  async function placeDrawer(cid, date) {
    const c = X.cities.find(x => x.id === cid); if (!c) return;
    const lm = c.landmarks[0], k = DX.countryCard(c, date), day = date || today();
    const pt = DX.prayerTimes(day, lm.lat, lm.lng, k ? k.tz : "Asia/Riyadh"), q = Math.round(DX.qibla(lm.lat, lm.lng));
    const names = { fajr: tx("الفجر"), sunrise: tx("الشروق"), dhuhr: tx("الظهر"), asr: tx("العصر"), maghrib: tx("المغرب"), isha: tx("العشاء") };
    openDrawer(`<h2 id="drawer-title">${esc(L(c))}</h2><p class="muted" style="margin:0">${esc(fmtDayLong(day))} · ${tx("بتوقيت المدينة")}</p>
      <section class="panel panel-pad"><h3 class="sub" style="margin-bottom:8px">${tx("أوقات الصلاة")}</h3>
        <div class="prayer-grid">${Object.entries(pt).map(([kk, v]) => `<div><span class="small muted">${names[kk]}</span><b class="num">${v}</b></div>`).join("")}</div>
        <p class="small muted" style="margin:8px 0 0">${tx("محسوبة على تقويم أم القرى. في البلدان الشمالية بالصيف تكون تقريبية.")}</p></section>
      <section class="panel panel-pad qibla-row"><svg viewBox="0 0 100 100" class="compass" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" stroke-width="2"/><text x="50" y="16" text-anchor="middle" font-size="10" fill="var(--ink-soft)">N</text><g transform="rotate(${q} 50 50)"><path d="M50 14 L57 50 L50 44 L43 50 Z" fill="var(--gold)"/></g></svg>
        <div><h3 class="sub">${tx("اتجاه القبلة")}</h3><b class="num" style="font-size:22px">${q}°</b><div class="small muted">${tx("من الشمال باتجاه عقارب الساعة")}</div></div></section>
      <section class="panel panel-pad"><h3 class="sub" style="margin-bottom:8px">${tx("مساجد ومطاعم حلال قريبة")} · ${esc(L(lm))}</h3><div id="nearby" class="small muted">${tx("نجيبها من خرائط OpenStreetMap…")}</div></section>`);
    try {
      const r = await api("nearby", { lat: lm.lat, lng: lm.lng, radius: 1500 });
      const list = (r.places || []).map(p => Object.assign(p, { d: km(lm.lat, lm.lng, p.lat, p.lng) })).sort((a, b) => a.d - b.d);
      const box = $("#nearby"); if (!box) return;
      const row = p => `<a class="near" href="${esc(gMaps((I18N.LANG === "en" ? p.name_en || p.name : p.name) || (p.kind === "mosque" ? "mosque" : "halal restaurant"), `${p.lat},${p.lng}`))}" target="_blank" rel="noopener"><span>${p.kind === "mosque" ? "🕌" : "🍽"} ${esc((I18N.LANG === "en" ? p.name_en || p.name : p.name) || (p.kind === "mosque" ? tx("مسجد") : tx("مطعم حلال")))}</span><span class="num">${p.d < 1 ? Math.round(p.d * 1000) + " " + tx("م") : p.d.toFixed(1) + " " + tx("كم")}</span></a>`;
      const ms = list.filter(p => p.kind === "mosque").slice(0, 6), hs = list.filter(p => p.kind === "halal").slice(0, 6);
      box.className = "nearby-cols";
      box.innerHTML = `<div><div class="lbl">${tx("مساجد")}</div>${ms.map(row).join("") || `<span class="small muted">${tx("ما لقينا قريب")}</span>`}</div><div><div class="lbl">${tx("مطاعم حلال")}</div>${hs.map(row).join("") || `<span class="small muted">${tx("ما لقينا قريب")}</span>`}</div>`;
    } catch (e) { const box = $("#nearby"); if (box) box.textContent = e.message; }
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-place]"); if (b) placeDrawer(b.dataset.place, b.dataset.date); });
  // A picture card of a trip/hotel/flight to send on WhatsApp or Snapchat.
  async function showCard(info) {
    let card; try { card = await DX.shareCard(info); } catch (e) { toast(e.message); return; }
    const file = new File([card.blob], "duroob.png", { type: "image/png" });
    const canShare = navigator.canShare && navigator.canShare({ files: [file] });
    openDrawer(`<h2 id="drawer-title">${tx("بطاقة للمشاركة")}</h2><img class="share-img" src="${card.url}" alt="${esc(info.title)}">
      <div class="row" style="justify-content:center">${canShare ? `<button type="button" class="btn btn-primary" id="card-share">${ICON.share} ${tx("شارك الصورة")}</button>` : ""}
        <a class="btn btn-ghost" href="${card.url}" download="duroob.png">${tx("حفظ الصورة")}</a></div>
      <p class="small muted" style="margin:0;text-align:center">${tx("إذا ما اشتغل الزر، اضغط على الصورة مطولاً واحفظها.")}</p>`);
    const b = $("#card-share"); b && b.addEventListener("click", () => navigator.share({ files: [file], title: info.title }).catch(() => {}));
  }

  // ------------------------------------------------------------------ seasons + calendars
  const seasonsOn = day => seasons().filter(s => day >= s.from && day <= s.to);
  function levelOf(price, sorted) {
    if (price == null || !sorted.length) return "";
    const q1 = sorted[Math.floor((sorted.length - 1) * 0.33)], q2 = sorted[Math.floor((sorted.length - 1) * 0.7)];
    return price <= q1 ? "l-cheap" : price >= q2 ? "l-high" : "l-mid";
  }
  function monthCalendar(month, cells, opts = {}) {
    const [y, m] = month.split("-").map(Number), first = new Date(y, m - 1, 1, 12), last = new Date(y, m, 0).getDate();
    const prices = Object.values(cells).map(c => c && c.price).filter(p => p != null).sort((a, b) => a - b);
    const min = prices[0], t = today();
    // Badge only the first cheapest day: Google often gives several days the same lowest price.
    const minDay = Object.keys(cells).sort().find(d => d.startsWith(month) && d >= t && cells[d] && cells[d].price === min);
    let html = [tx("أحد"), tx("إثنين"), tx("ثلاثاء"), tx("أربعاء"), tx("خميس"), tx("جمعة"), tx("سبت")].map(d => `<div class="cal-dow">${d}</div>`).join("");
    for (let i = 0; i < first.getDay(); i++) html += "<div></div>";
    for (let d = 1; d <= last; d++) {
      const day = `${month}-${String(d).padStart(2, "0")}`, c = cells[day], dt = parse(day), wd = dt.getDay();
      const past = day < t, ss = seasonsOn(day);
      const lv = c && c.price != null ? levelOf(c.price, prices) : c && c.level ? { cheap: "l-cheap", average: "l-mid", high: "l-high" }[c.level] : "";
      const disabled = past || (opts.onlyDow != null && wd !== opts.onlyDow);
      const extra = opts.marker ? opts.marker(day) : "";
      html += `<button type="button" class="cal-day ${lv} ${wd === 5 || wd === 6 ? "weekend" : ""} ${min != null && day === minDay ? "min" : ""} ${opts.sel === day ? "sel" : ""}" data-day="${day}" ${disabled ? "disabled" : ""}
        title="${esc(ss.map(s => s.name + (s.note ? " — " + s.note : "")).join(" · "))}">
        <span class="d">${d}<span class="h">${esc(HD.format(dt))}</span></span>
        ${extra || (ss.length ? `<span class="season season-${ss[0].kind}"></span>` : "<span></span>")}
        <span class="p ${c && c.price != null ? "" : "none"}">${past ? "" : c && c.price != null ? sarShort(c.price) + (c.tag ? ` <span class="small muted">${esc(c.tag)}</span>` : "") : c && c.level ? { cheap: tx("رخيص"), average: tx("متوسط"), high: tx("غالي") }[c.level] : c && c.label ? esc(c.label) : "—"}</span></button>`;
    }
    return `<div class="panel cal">
      <div class="cal-head"><div><div class="cal-title">${esc(fmtMonth(month))}</div><div class="cal-hijri">${esc(HM.format(first))} – ${esc(HM.format(new Date(y, m - 1, last, 12)))}</div></div>
        ${opts.nav ? `<div class="row"><button type="button" class="btn btn-ghost btn-sm" data-cal-prev>‹ ${tx("الشهر اللي قبل")}</button><button type="button" class="btn btn-ghost btn-sm" data-cal-next>${tx("الشهر الجاي")} ›</button></div>` : ""}</div>
      <div class="cal-grid">${html}</div>${opts.legend || legend(opts.unit)}
      ${opts.note ? `<p class="small muted" style="margin:6px 0 0">${opts.note}</p>` : ""}</div>`;
  }
  function legend(unit) {
    const kinds = [["season-ramadan", tx("رمضان")], ["season-hajj", tx("الحج")], ["season-holiday", tx("إجازة / عيد")], ["season-high", tx("موسم مزدحم")]];
    return `<div class="legend"><span><i class="sw" style="background:var(--cheap-bg);border:1px solid var(--cheap)"></i>${tx("أرخص")}</span><span><i class="sw" style="background:var(--mid-bg)"></i>${tx("متوسط")}</span><span><i class="sw" style="background:var(--high-bg)"></i>${tx("أغلى")}</span>
      ${kinds.map(([c, l]) => `<span><i class="sw ${c}"></i>${l}</span>`).join("")}<span>${unit || tx("الأسعار بالريال")}</span></div>`;
  }
  function yearCalendar(cells, note) {
    const ms = months12(), prices = ms.map(m => cells[m] && cells[m].price).filter(p => p != null).sort((a, b) => a - b);
    const min = prices[0], max = prices[prices.length - 1];
    return `<div class="panel cal"><div class="cal-head"><div class="cal-title">${tx("السنة كاملة")}</div><span class="small muted">${tx("أرخص سعر بكل شهر · اضغط الشهر يفتح لك أيامه")}</span></div>
      <div class="year-grid">${ms.map(m => {
        const c = cells[m] || {}, ss = seasons().filter(s => s.from.slice(0, 7) <= m && s.to.slice(0, 7) >= m);
        const pct = c.price != null && max ? Math.max(8, Math.round(c.price / max * 100)) : 0;
        return `<button type="button" class="ycell ${levelOf(c.price, prices)} ${c.price === min && min != null ? "min" : ""}" data-month="${m}">
          <span class="m"><span>${esc(monthName(m))}</span><span class="small muted">${m.slice(0, 4)}</span></span>
          <span class="p">${c.price != null ? sar(c.price) : tx("ما فيه بيانات")}</span><span class="bar"><i style="width:${pct}%"></i></span>
          <span class="s">${esc([c.tag, ss.map(s => s.name).join(tx("، "))].filter(Boolean).join(" · "))}</span></button>`;
      }).join("")}</div>${legend()}${note ? `<p class="small muted" style="margin:6px 0 0">${note}</p>` : ""}</div>`;
  }
  function bindCalNav(box, current, go) {
    const ms = months12();
    const p = $("[data-cal-prev]", box), n = $("[data-cal-next]", box);
    p && p.addEventListener("click", () => { const i = ms.indexOf(current) - 1; if (i >= 0) go(ms[i]); });
    n && n.addEventListener("click", () => { const i = ms.indexOf(current) + 1; if (i < ms.length) go(ms[i]); });
  }

  // ------------------------------------------------------------------ favorites, watches, history, trip files
  const isFav = id => (S.favorites || []).some(f => f.id === id);
  async function toggleFav(item) {
    if (isFav(item.id)) S.favorites = S.favorites.filter(f => f.id !== item.id);
    else S.favorites = [Object.assign({ saved: Date.now() }, item)].concat(S.favorites || []);
    await save("favorites"); toast(isFav(item.id) ? tx("انضاف للمفضلة") : tx("انشال من المفضلة")); return isFav(item.id);
  }
  async function addWatch(w) {
    S.watches = (S.watches || []).filter(x => x.id !== w.id);
    S.watches.unshift(Object.assign({ created: Date.now() }, w));
    await save("watches");
    toast(tx("بنراقب السعر ونعلمك إذا نزل. تلقاها في «متابعاتي»"), "good");
  }
  async function remember(kind, label, params) {
    const key = kind + JSON.stringify(params);
    S.history = [{ kind, label, params, at: Date.now(), key }].concat((S.history || []).filter(h => h.key !== key)).slice(0, 30);
    await save("history");
  }
  async function autoCheckWatches(manual) {
    if (!S.watches || !S.watches.length) { if (manual) toast(tx("ما عندك متابعات للحين")); return null; }
    if (!manual && Date.now() - Number(S.prefs.lastCheck || 0) < 3 * 3600 * 1000) return null;
    let res;
    const body = X.web ? { watches: S.watches, ntfy_topic: S.prefs.alertsOn ? S.prefs.ntfyTopic : "" } : {};
    try { res = await api("watch/check", null, body); } catch (e) { if (manual) toast(e.message); return null; }
    S.watches = res.watches; S.prefs.lastCheck = Date.now(); save("prefs");
    if (X.web) save("watches");
    const alerts = res.results.filter(r => r.alert || r.dropped || r.below_target);
    for (const d of alerts) {
      const w = S.watches.find(x => x.id === d.id);
      const msg = `${w ? w.label : ""}: ${d.alert || tx("نزل السعر إلى ") + sar(d.price)}`;
      toast(msg, "good");
      try { if ("Notification" in window && Notification.permission === "granted") new Notification(tx("دروب"), { body: msg }); } catch (e) { /* not available */ }
    }
    if (manual && !alerts.length) toast(tx("فحصت المتابعات، ما فيه نزول جديد"));
    return res;
  }
  // Add an item (flight, hotel, plan) to a trip file; asks which file in the drawer.
  function addToTrip(item) {
    const trips = S.trips || [];
    openDrawer(`<h2 id="drawer-title">${tx("أضف لملف رحلة")}</h2><p class="muted" style="margin:0">${esc(item.title)} · ${esc(item.sub || "")}</p>
      <div class="file-items">${trips.map((t, i) => `<button type="button" class="file-item btn-ghost" style="cursor:pointer;text-align:start" data-ti="${i}"><span class="k">${ICON.scroll}</span><span><b>${esc(t.name)}</b><br><span class="small muted">${P(t.items.length, "item")}</span></span><span>${tx("أضف")}</span></button>`).join("")}</div>
      <div class="row"><div class="field grow"><label for="nt-name">${tx("ملف رحلة جديد")}</label><input class="input" id="nt-name" placeholder="${tx("مثلاً: صيف إسطنبول مع العائلة")}"></div><button type="button" class="btn btn-primary" id="nt-add">${tx("أنشئ وأضف")}</button></div>`);
    const add = async t => { t.items.push(Object.assign({ id: uid(), added: Date.now() }, item)); await save("trips"); closeDrawer(); toast(`${tx("انضاف لملف «")}${t.name}»`, "good"); };
    $$("[data-ti]").forEach(b => b.addEventListener("click", () => add(S.trips[Number(b.dataset.ti)])));
    $("#nt-add").addEventListener("click", () => {
      const name = $("#nt-name").value.trim() || tx("رحلتي");
      const t = { id: uid(), name, created: Date.now(), items: [], members: party().names, expenses: [] };
      S.trips = [t].concat(S.trips || []); add(t);
    });
  }

  // ------------------------------------------------------------------ links
  // Google Flights link that opens on the exact search: "tfs" is a small protobuf (same as Google's own links).
  const CITY_MAIN = { LON: "LHR", PAR: "CDG", ROM: "FCO", MIL: "MXP", MOW: "SVO", NYC: "JFK", TYO: "HND", SEL: "ICN", OSA: "KIX", BJS: "PEK", JKT: "CGK" };
  function gTfs(legs, pax, opts = {}) {
    const m = [], varint = (a, n) => { while (n > 127) { a.push((n & 127) | 128); n = Math.floor(n / 128); } a.push(n); };
    const num = (a, f, n) => { varint(a, f * 8); varint(a, n); };
    const bytes = (a, f, d) => { const b = typeof d === "string" ? Array.from(new TextEncoder().encode(d)) : d; varint(a, f * 8 + 2); varint(a, b.length); a.push(...b); };
    const ap = c => { const a = []; num(a, 1, 1); bytes(a, 2, CITY_MAIN[c] || c); return a; };
    num(m, 1, 28); num(m, 2, 2);
    legs.forEach(([date, a, b], i) => { const fd = []; bytes(fd, 2, date); if (opts.direct) num(fd, 5, 0); if (opts.airline && i === 0) bytes(fd, 6, opts.airline); bytes(fd, 13, ap(a)); bytes(fd, 14, ap(b)); bytes(m, 3, fd); });
    for (const [kind, n] of [[1, pax.adults || 1], [2, pax.children || 0], [4, pax.infants || 0]]) for (let i = 0; i < n; i++) num(m, 8, kind);
    num(m, 9, opts.cls || 1); num(m, 14, 1); num(m, 19, legs.length === 2 && legs[1][1] === legs[0][2] ? 1 : 2);
    return btoa(String.fromCharCode(...m)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function gFlights(o, d, dep, ret, opts = {}) {
    const ok = x => /^\d{4}-\d{2}-\d{2}$/.test(x || "");
    if (!ok(dep) || (ret && !ok(ret))) return `https://www.google.com/travel/flights?hl=${I18N.LANG}&q=` + enc(`Flights from ${o} to ${d}${dep ? " on " + dep : ""}`);
    const legs = [[dep, o, d]].concat(ret ? [[ret, d, o]] : []);
    return `https://www.google.com/travel/flights?hl=${I18N.LANG}&gl=sa&curr=${I18N.CUR || "SAR"}&tfs=${gTfs(legs, opts.pax || party(), opts)}&tfu=EgIIAQ`;
  }
  const gMaps = (name, city) => "https://www.google.com/maps/search/?api=1&query=" + enc(`${name} ${city || ""}`.trim());
  const gHotels = (name, city) => "https://www.google.com/travel/search?q=" + enc(`${name} ${city || ""}`.trim());
  function otaLink(site, h, ctx) {
    const q = enc(`${h.name} ${ctx.cityEn || ""}`.trim()), s = (site || "").toLowerCase(), p = ctx.party, n = Math.max(1, diffDays(ctx.checkin, ctx.checkout));
    if (s.includes("booking")) return `https://www.booking.com/searchresults.html?ss=${q}&checkin=${ctx.checkin}&checkout=${ctx.checkout}&group_adults=${p.adults}&group_children=${p.childAges.length}&no_rooms=${ctx.rooms}${p.childAges.map(a => "&age=" + a).join("")}`;
    if (s.includes("agoda")) return `https://www.agoda.com/search?textToSearch=${q}&checkIn=${ctx.checkin}&los=${n}&rooms=${ctx.rooms}&adults=${p.adults}&children=${p.childAges.length}${p.childAges.length ? "&childAges=" + p.childAges.join(",") : ""}`;
    if (s.includes("expedia")) return `https://www.expedia.com/Hotel-Search?destination=${q}&startDate=${ctx.checkin}&endDate=${ctx.checkout}&adults=${p.adults}`;
    if (s.includes("hotels.com")) return `https://www.hotels.com/Hotel-Search?destination=${q}&startDate=${ctx.checkin}&endDate=${ctx.checkout}&adults=${p.adults}`;
    if (s.includes("trip.com")) return `https://www.trip.com/hotels/list?keyword=${q}&checkin=${ctx.checkin.replace(/-/g, "/")}&checkout=${ctx.checkout.replace(/-/g, "/")}&adult=${p.adults}&crn=${ctx.rooms}`;
    return "https://www.google.com/search?q=" + enc(`${h.name} ${ctx.cityEn || ""} ${site || ""}`.trim());
  }

  // ------------------------------------------------------------------ price history view
  const VERDICT = { lowest: ["v-lowest", tx("أرخص سعر شفناه · احجز")], good: ["v-good", tx("أرخص من المعتاد · سعر زين")], normal: ["v-normal", tx("سعر عادي")], high: ["v-high", tx("أغلى من المعتاد · انتظر لو تقدر")], few: ["v-few", tx("بيانات قليلة للحين")] };
  function sparkline(points) {
    if (!points || points.length < 2) return "";
    const W = 300, H = 44, ps = points.map(p => p.price), min = Math.min(...ps), max = Math.max(...ps), t0 = points[0].at, t1 = points[points.length - 1].at;
    const x = t => t1 > t0 ? (t - t0) / (t1 - t0) * (W - 8) + 4 : W / 2, y = v => max > min ? H - 6 - (v - min) / (max - min) * (H - 12) : H / 2;
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
    const last = points[points.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" style="direction:ltr">
      <path d="${d} L${x(last.at).toFixed(1)},${H} L${x(t0).toFixed(1)},${H}Z" fill="var(--gold)" opacity=".15"/>
      <path d="${d}" fill="none" stroke="var(--gold-deep)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(last.at).toFixed(1)}" cy="${y(last.price).toFixed(1)}" r="3.5" fill="var(--gold-deep)"/></svg>`;
  }
  function historyView(title, h, unit) {
    const v = VERDICT[h.verdict] || VERDICT.few;
    return `<h2 id="drawer-title">${tx("تاريخ السعر")}</h2><p class="muted" style="margin:0">${esc(title)}</p>
      <div class="panel panel-pad" style="display:grid;gap:10px"><span class="verdict ${v[0]}">${v[1]}</span>${sparkline(h.points)}
        <div class="kv"><div><div class="lbl">${tx("السعر الحين")}</div><b class="num">${sar(h.current)}</b></div><div><div class="lbl">${tx("أرخص شي")}</div><b class="num">${sar(h.min)}</b></div><div><div class="lbl">${tx("المعتاد")}</div><b class="num">${sar(h.median)}</b></div><div><div class="lbl">${tx("أغلى شي")}</div><b class="num">${sar(h.max)}</b></div></div>
        <p class="small muted" style="margin:0">${h.demo ? tx("تاريخ تجريبي للعرض. ") : ""}${tx("دروب يحفظ كل سعر يشوفه وأنت تدوّر أو لما يفحص متابعاتك، فكل ما استخدمته أكثر صار الحكم أدق.")} ${unit || ""}</p></div>`;
  }

  // ------------------------------------------------------------------ flights pricing helpers shared by pages
  function groupPrice(t, p, withBag) {
    const total = t.total_price ? t.price : t.price * p.adults + t.price * 0.75 * p.children + t.price * 0.1 * p.infants;
    const fee = baggage()[t.airline];
    const bag = withBag && fee && !t.total_price ? fee * (p.adults + p.children) * (t.return_at ? 2 : 1) : 0;
    return { total: Math.round(total), bag, withBag: Math.round(total + bag), estimated: !t.total_price && (p.children + p.infants > 0 || p.adults > 1) };
  }
  const perGroup = (price, p) => Math.round(price * p.adults + price * 0.75 * p.children + price * 0.1 * p.infants);

  // ------------------------------------------------------------------ navigation + router
  function bindPrefs() {
    const ls = $("#lang-sel"), cs = $("#cur-sel");
    ls.value = I18N.LANG;
    ls.addEventListener("change", () => I18N.setLang(ls.value));
    cs.innerHTML = Object.keys(I18N.CURRENCIES).map(c => `<option value="${c}" title="${esc(I18N.CUR_NAMES[c][I18N.LANG === "en" ? 1 : 0])}">${c} · ${esc(I18N.CURRENCIES[c][I18N.RTL ? 0 : 1])}</option>`).join("");
    cs.value = I18N.CUR;
    cs.addEventListener("change", () => { I18N.setCur(cs.value); route(); toast(tx("العملة") + ": " + I18N.CUR_NAMES[cs.value][I18N.LANG === "en" ? 1 : 0]); });
  }
  function bindNav() { bindPrefs(); }
  const TAB_OF = { trip: "plan", budget: "plan", multi: "plan", where: "plan", best: "plan", umrah: "plan", holidays: "plan", watch: "trips" };
  let cleanup = [];
  function route() {
    const name = (location.hash || "#home").slice(1);
    const page = PAGES[name] ? name : "home";
    const tab = TAB_OF[page] || page;
    $$("#route .station, #tabbar a").forEach(a => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    cleanup.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); cleanup = [];
    const old = $("#view"), fresh = old.cloneNode(false); old.replaceWith(fresh);
    notice();
    PAGES[page](fresh);
    window.scrollTo(0, 0);
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  // A page can be opened with "search now" (from the home search box).
  let autoRun = null;
  const setAutoRun = name => { autoRun = name; };
  const takeAutoRun = name => { if (autoRun === name) { autoRun = null; return true; } return false; };

  Object.assign(D, {
    META, X, S, ICON, $, $$, esc, enc, sar, sarShort, iso, parse, addDays, diffDays, today, fmtDay, fmtDayLong, fmtMonth, monthName, hhmm, dur, airline,
    months12, defaultMonth, uid, km, api, save, loading, withLoad, toast, errorBox, notice, openDrawer, closeDrawer, seg, bindSeg, segVal, setSeg,
    waLink, hero, party, partyLabel, partyParams, travelersField, bindTravelers, placeField, bindPlace, codeOf, placeName, cityByIata, countryOfCode,
    cityField, bindCity, climateOf, feel, visaOf, visaCheckLink, dailyCost, infoStrip, seasons, seasonsOn, baggage, applySeasons, applyTheme, levelOf,
    monthCalendar, yearCalendar, legend, bindCalNav, isFav, toggleFav, addWatch, remember, autoCheckWatches, addToTrip, gFlights, gMaps, gHotels, otaLink,
    VERDICT, sparkline, historyView, groupPrice, perGroup, go, HM, HD, actionsDrawer, more, setAutoRun, takeAutoRun, placeDrawer, showCard, webKeys, setWebKey, familyLink,
    page(name, fn) { PAGES[name] = fn; },
    onLeave(fn) { cleanup.push(fn); },
    start() { boot().catch(e => { $("#view").innerHTML = errorBox(e); }); }
  });
})();
