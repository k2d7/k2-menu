/* Duroob — search pages: flights and hotels. */
(function () {
  "use strict";
  const { META, X, S, ICON, $, $$, esc, sar, sarShort, addDays, diffDays, today, fmtDay, fmtDayLong, fmtMonth, hhmm, dur, airline, months12, defaultMonth, km,
    api, save, withLoad, toast, errorBox, openDrawer, seg, bindSeg, segVal, setSeg, waLink, hero, party, partyLabel, partyParams, travelersField, bindTravelers,
    placeField, bindPlace, codeOf, placeName, cityByIata, cityField, bindCity, infoStrip, baggage, levelOf, monthCalendar, yearCalendar, bindCalNav,
    isFav, toggleFav, addWatch, remember, addToTrip, gFlights, gMaps, gHotels, otaLink, historyView, groupPrice, perGroup } = window.D;

  // ================================================================== FLIGHTS
  const F = { mode: "dates", trip: "rt", month: null, cal: null, tickets: [], sort: "best", filters: {}, sel: null, compare: false, weekend: false, smart: true, lastQ: null, smartRes: null };

  D.page("flights", root => {
    const home = S.settings.home || "RUH";
    const pf = S.prefs.flights || { o: { code: home, name: placeName(home) }, d: { code: "IST", name: tx("إسطنبول") } };
    const dep0 = pf.dep && pf.dep >= today() ? pf.dep : addDays(today(), 14), ret0 = pf.ret && pf.ret > dep0 ? pf.ret : addDays(dep0, 6);
    F.month = F.month || defaultMonth();
    root.innerHTML = hero("flights", tx("الطيران")) + `
      <form class="panel framed search-form" id="fform" autocomplete="off">
        <div class="row" style="gap:10px">${seg("trip", [["rt", tx("ذهاب وعودة")], ["ow", tx("ذهاب فقط")]], F.trip)}${seg("mode", [["dates", tx("تاريخ محدد")], ["month", tx("شهر كامل")], ["year", tx("السنة كاملة")]], F.mode)}</div>
        <div class="fields">
          ${placeField("f-o", tx("من"), pf.o)}
          <button type="button" class="icon-btn swap" id="f-swap" aria-label="${tx("بدّل")}">${ICON.swap}</button>
          ${placeField("f-d", tx("إلى"), pf.d)}
          <div class="field" data-show="dates"><label for="f-dep">${tx("الذهاب")}</label><input class="input" type="date" id="f-dep" min="${today()}" value="${dep0}"></div>
          <div class="field" data-show="dates rt"><label for="f-ret">${tx("العودة")}</label><input class="input" type="date" id="f-ret" min="${today()}" value="${ret0}"></div>
          <div class="field" data-show="month"><label for="f-month">${tx("الشهر")}</label><select class="input" id="f-month">${months12().map(m => `<option value="${m}" ${m === F.month ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field" data-show="month year rt"><label for="f-nights">${tx("مدة الرحلة (ليالي)")}</label><input class="input num" type="number" id="f-nights" min="1" max="60" value="${pf.nights || 7}"></div>
          ${travelersField("f-trav")}
        </div>
        ${D.more(`<div class="fields"><div class="field"><label for="f-cls">${tx("الدرجة")}</label><select class="input" id="f-cls"><option value="1">${tx("سياحية")}</option><option value="2">${tx("سياحية مميزة")}</option><option value="3">${tx("أعمال")}</option><option value="4">${tx("أولى")}</option></select></div></div>
        <div class="checks">
          <label class="check"><input type="checkbox" id="f-direct" ${pf.direct ? "checked" : ""}> ${tx("مباشر فقط")}</label>
          <label class="check"><input type="checkbox" id="f-smart" ${F.smart ? "checked" : ""}> ${tx("دوّر لي طرق أوفر (تذكرتين، مطارات قريبة)")}</label>
          <label class="check"><input type="checkbox" id="f-weekend" ${F.weekend ? "checked" : ""}> ${tx("نهاية الأسبوع (خميس – سبت)")}</label>
          <label class="check"><input type="checkbox" id="f-compare" ${F.compare ? "checked" : ""}> ${tx("قارن المطارات")}</label>
          <span class="chip-set" id="f-airports" ${F.compare ? "" : "hidden"}>${["RUH", "JED", "DMM", "MED"].map(c => `<button type="button" class="chip" data-ap="${c}" aria-pressed="${(S.prefs.compareAirports || ["RUH", "JED", "DMM"]).includes(c)}">${placeName(c)}</button>`).join("")}</span>
        </div>`)}
        <div class="form-actions"><span class="small muted" id="f-hint"></span><button class="btn btn-primary" type="submit">${tx("دوّر على الرحلات")}</button></div>
      </form>
      <div id="f-info"></div><div id="f-cal"></div><div id="f-alt"></div><div id="f-res"></div>`;
    const form = $("#fform", root);
    const vis = () => {
      const mode = segVal(form, "mode"), trip = segVal(form, "trip");
      $$("[data-show]", form).forEach(el => { const k = el.dataset.show.split(" "); const modeOk = k.some(x => ["dates", "month", "year"].includes(x)) ? k.includes(mode) : true; const tripOk = k.includes("rt") ? trip === "rt" : true; el.hidden = !(modeOk && tripOk); });
      $("#f-hint").textContent = mode === "dates" ? "" : mode === "month" ? tx("بيطلع لك تقويم الشهر بأرخص سعر لكل يوم.") : tx("بيطلع لك أرخص سعر لكل شهر في السنة.");
    };
    bindSeg(form, "mode", v => { F.mode = v; vis(); });
    bindSeg(form, "trip", v => { F.trip = v; vis(); });
    vis();
    bindPlace(form, "f-o"); bindPlace(form, "f-d");
    bindTravelers(form, "f-trav", () => F.tickets.length && drawFlightResults());
    $("#f-swap").addEventListener("click", () => { const a = $("#f-o"), b = $("#f-d"); [a.value, b.value] = [b.value, a.value]; [a.dataset.code, b.dataset.code] = [b.dataset.code, a.dataset.code]; [a.dataset.name, b.dataset.name] = [b.dataset.name, a.dataset.name]; });
    $("#f-compare").addEventListener("change", e => { F.compare = e.target.checked; $("#f-airports").hidden = !F.compare; });
    $("#f-smart").addEventListener("change", e => { F.smart = e.target.checked; });
    $("#f-weekend").addEventListener("change", e => { F.weekend = e.target.checked; if (F.weekend) $("#f-nights").value = 2; });
    $("#f-airports").addEventListener("click", e => { const b = e.target.closest("[data-ap]"); if (!b) return; b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); S.prefs.compareAirports = $$("[data-ap][aria-pressed=true]").map(x => x.dataset.ap); save("prefs"); });
    form.addEventListener("submit", e => { e.preventDefault(); runFlights(root); });
    if (D.takeAutoRun("flights")) { F.tickets = []; F.cal = null; return form.requestSubmit(); }
    if (F.tickets.length || F.cal) { drawInfo(); drawFlightCal(root); drawSmart(); drawFlightResults(); }
    else $("#f-res", root).innerHTML = `<div class="panel empty"><b>${tx("جاهز للبحث")}</b>${tx("اختر من وين ولوين، وحدد التاريخ أو الشهر، واضغط «دوّر».")}</div>`;
  });

  function flightQuery(root) {
    const o = codeOf($("#f-o", root)), d = codeOf($("#f-d", root));
    if (!o || !d) throw new Error(tx("اختر مدينة الإقلاع والوصول من القائمة."));
    if (o === d) throw new Error(tx("مدينة الإقلاع والوصول نفس الشي."));
    const mode = segVal(root, "mode"), rt = segVal(root, "trip") === "rt";
    const origins = F.compare ? Array.from(new Set([o].concat(S.prefs.compareAirports || []))).filter(x => x !== d) : [o];
    const q = { o, d, origins, mode, rt, dep: $("#f-dep", root).value, ret: $("#f-ret", root).value, month: $("#f-month", root).value, nights: Number($("#f-nights", root).value || 7), direct: $("#f-direct", root).checked, cls: $("#f-cls", root).value };
    if (mode === "dates") {
      if (!q.dep) throw new Error(tx("حدد تاريخ الذهاب."));
      if (rt && (!q.ret || q.ret <= q.dep)) throw new Error(tx("تاريخ العودة لازم يكون بعد الذهاب."));
    }
    S.prefs.flights = { o: { code: o, name: $("#f-o", root).dataset.name || placeName(o) }, d: { code: d, name: $("#f-d", root).dataset.name || placeName(d) }, dep: q.dep, ret: q.ret, nights: q.nights, direct: q.direct };
    save("prefs");
    return q;
  }

  async function runFlights(root, overrideDay) {
    let q; try { q = flightQuery(root); } catch (e) { toast(e.message); return; }
    if (overrideDay) { q.mode = "dates"; q.dep = overrideDay; q.ret = q.rt ? addDays(overrideDay, q.nights) : ""; }
    F.lastQ = q; F.smartRes = null; $("#f-alt").innerHTML = "";
    const label = `${placeName(q.o)} – ${placeName(q.d)}`;
    drawInfo();
    try {
      if (q.mode === "dates") {
        F.sel = q.dep;
        const res = await withLoad(tx("القافلة تدوّر على أرخص الرحلات…"), () => Promise.all(q.origins.map(o => api("flights/search", { origin: o, destination: q.d, depart: q.dep, return: q.rt ? q.ret : "", direct: q.direct ? 1 : 0, ...partyParams(), cls: q.cls }))));
        F.tickets = res.flatMap(r => r.tickets.map(t => Object.assign(t, { demo: t.demo || r.demo })));
        F.insights = res[0] && res[0].insights; F.filters = {};
        if (!overrideDay) { F.cal = null; $("#f-cal").innerHTML = ""; }
        remember("flight", `${label} · ${fmtDay(q.dep)}`, q);
        drawFlightResults(); if (overrideDay) drawFlightCal(root);
        if (F.smart && !q.direct) loadSmart(q);
      } else if (q.mode === "month") {
        F.month = q.month;
        const res = await withLoad(tx("القافلة تمشي على أيام الشهر…"), () => Promise.all(q.origins.map(o => api("flights/calendar", { origin: o, destination: q.d, month: q.month, one_way: q.rt ? 0 : 1, nights: q.rt ? q.nights : "", direct: q.direct ? 1 : 0 }).then(r => [o, r]))));
        const days = {};
        for (const [o, r] of res) for (const [day, t] of Object.entries(r.days || {})) if (t && (!days[day] || t.price < days[day].price)) days[day] = Object.assign(t, { from: o });
        F.cal = { kind: "month", days, month: q.month, demo: res.some(([, r]) => r.demo) }; F.tickets = [];
        remember("flight", `${label} · ${fmtMonth(q.month)}`, q);
        drawFlightCal(root); $("#f-res").innerHTML = `<div class="panel empty"><b>${tx("اختر يوم من التقويم")}</b>${tx("يطلع لك كل الرحلات المتوفرة في ذاك اليوم.")}</div>`;
      } else {
        const res = await withLoad(tx("القافلة تلف على أشهر السنة…"), () => Promise.all(q.origins.map(o => api("flights/calendar", { origin: o, destination: q.d, year: 1, one_way: q.rt ? 0 : 1, nights: q.rt ? q.nights : "", direct: q.direct ? 1 : 0 }).then(r => [o, r]))));
        const months = {};
        for (const [o, r] of res) for (const [m, t] of Object.entries(r.months || {})) if (t && (!months[m] || t.price < months[m].price)) months[m] = Object.assign(t, { from: o });
        F.cal = { kind: "year", months, demo: res.some(([, r]) => r.demo) }; F.tickets = [];
        remember("flight", `${label} · ${tx("السنة كاملة")}`, q);
        drawFlightCal(root); $("#f-res").innerHTML = "";
      }
    } catch (e) { $("#f-res").innerHTML = errorBox(e); }
  }

  function drawInfo() {
    const q = F.lastQ, box = $("#f-info"); if (!box || !q) return;
    const month = (q.mode === "dates" ? q.dep : q.month || defaultMonth()).slice(0, 7);
    const nights = q.rt ? (q.mode === "dates" ? diffDays(q.dep, q.ret) : q.nights) : null;
    box.innerHTML = infoStrip(q.d, month, nights, party().total);
  }

  function drawFlightCal(root) {
    const box = $("#f-cal"); if (!box) return;
    if (!F.cal) { box.innerHTML = ""; return; }
    const q = F.lastQ || {};
    const note = `${F.cal.demo ? tx("أسعار تجريبية. ") : tx("أسعار محفوظة من عمليات بحث آخر أيام، وتتأكد منها لما تختار اليوم. ")}${tx("السعر لشخص بالغ")}${q.rt ? tx("، ذهاب وعودة") : ""}.`;
    if (F.cal.kind === "year" && !Object.values(F.cal.months).some(Boolean) && !F.cal.demo) { box.innerHTML = noPrices(q); bindNoPrices(box, root); return; }
    if (F.cal.kind === "year") {
      box.innerHTML = yearCalendar(Object.fromEntries(Object.entries(F.cal.months).map(([m, t]) => [m, t && { price: t.price, tag: t.departure_at ? fmtDay(t.departure_at.slice(0, 10)) + (F.compare ? tx(" · من ") + placeName(t.from) : "") : "" }])), note);
      $$(".ycell", box).forEach(b => b.addEventListener("click", () => { $("#f-month").value = b.dataset.month; F.mode = "month"; setSeg(root, "mode", "month"); runFlights(root); }));
      return;
    }
    if (!Object.values(F.cal.days).some(Boolean) && !F.cal.demo) { box.innerHTML = noPrices(q); bindNoPrices(box, root); return; }
    const cells = {};
    for (const [day, t] of Object.entries(F.cal.days)) if (t) cells[day] = { price: t.price, tag: F.compare && t.from ? t.from : "" };
    box.innerHTML = monthCalendar(F.cal.month, cells, { sel: F.sel, nav: true, onlyDow: F.weekend ? 4 : null, note }) +
      `<div class="row" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" id="f-wmonth">${ICON.bell} ${tx("راقب هالشهر كامل")}</button><span class="small muted">${tx("ننبهك إذا نزل أي يوم في الشهر عن السعر اللي تحدده.")}</span></div>`;
    const wm = $("#f-wmonth", box);
    wm && wm.addEventListener("click", () => {
      const prices = Object.values(F.cal.days).filter(Boolean).map(t => t.price), lo = prices.length ? Math.min(...prices) : null;
      addWatch({ id: `w:m:${q.o}-${q.d}-${F.cal.month}-${q.rt ? q.nights : "ow"}`, kind: "flight-month", label: `${placeName(q.o)} – ${placeName(q.d)} · ${fmtMonth(F.cal.month)}`, last: lo,
        params: { origin: q.o, destination: q.d, month: F.cal.month, one_way: q.rt ? "0" : "1", nights: q.rt ? String(q.nights) : "" } });
    });
    $$(".cal-day[data-day]", box).forEach(b => b.addEventListener("click", () => { F.sel = b.dataset.day; runFlights(root, b.dataset.day); }));
    bindCalNav(box, F.cal.month, m => { $("#f-month").value = m; F.mode = "month"; setSeg(root, "mode", "month"); runFlights(root); });
  }

  // ---------- cheaper ways: two one-ways, self-transfer, nearby airports
  async function loadSmart(q) {
    const box = $("#f-alt");
    box.innerHTML = `<div class="panel smart"><h2 class="sec">${tx("طرق أوفر")}</h2><p class="small muted" style="margin:0">${tx("ندوّر الحين على تذكرتين منفصلتين ومطارات قريبة…")}</p></div>`;
    try {
      F.smartRes = await api("flights/smart", { origin: q.o, destination: q.d, depart: q.dep, return: q.rt ? q.ret : "" });
      F.smartRes.q = q; drawSmart();
    } catch (e) { box.innerHTML = ""; }
  }
  function drawSmart() {
    const box = $("#f-alt"), r = F.smartRes; if (!box || !r) return;
    const p = party(), q = r.q, base = r.base, cards = [];
    const leg = t => `${esc(airline(t.airline))} · ${esc(fmtDay((t.departure_at || "").slice(0, 10)))} ${esc(hhmm(t.departure_at))}`;
    const book = (t, label) => `<a class="btn btn-ghost btn-sm" href="${esc(t.link || gFlights(t.origin, t.destination, (t.departure_at || "").slice(0, 10)))}" target="_blank" rel="noopener">${label} ${ICON.out}</a>`;
    if (r.mixed && base && r.mixed.total < base.price) {
      cards.push(`<div class="alt"><b>${tx("تذكرتين ذهاب فقط بدل ذهاب وعودة")}</b><span class="save">${tx("توفر")} ${sar(perGroup(base.price - r.mixed.total, p))}</span>
        <span class="route-line">${tx("الذهاب")}: ${leg(r.mixed.out)}</span><span class="route-line">${tx("العودة")}: ${leg(r.mixed.back)}</span>
        <span class="price-sub">${tx("المجموع")} ${sar(perGroup(r.mixed.total, p))} ${tx("بدل")} ${sar(perGroup(base.price, p))}</span>
        <div class="row" style="gap:6px">${book(r.mixed.out, tx("الذهاب"))}${book(r.mixed.back, tx("العودة"))}</div></div>`);
    }
    for (const s of r.split || []) {
      const ref = (r.mixed && r.mixed.out) || base;
      const saving = ref ? (ref === base && q.rt ? null : ref.price - s.total) : null;
      cards.push(`<div class="alt"><b>${tx("عن طريق")} ${esc(placeName(s.hub))} ${tx("بتذكرتين")}</b>${saving && saving > 0 ? `<span class="save">${tx("توفر")} ${sar(perGroup(saving, p))} ${tx("على الذهاب")}</span>` : ""}
        <span class="route-line">${tx("١.")} ${esc(placeName(q.o))} – ${esc(placeName(s.hub))}: ${leg(s.leg1)}</span>
        <span class="route-line">${tx("٢.")} ${esc(placeName(s.hub))} – ${esc(placeName(q.d))}: ${leg(s.leg2)}</span>
        <span class="price-sub">${sar(perGroup(s.total, p))} ${tx("للمجموعة · انتظار")} ${P(s.gap_hours, "hour")} ${tx("تقريباً")}</span>
        <span class="warn-line">${tx("تذكرتين منفصلتين: لو تأخرت الأولى ما تنتظرك الثانية، وتستلم شنطك وتسجّل من جديد. تأكد إنك ما تحتاج تأشيرة لـ")}${esc(placeName(s.hub))}.</span>
        ${s.gap_hours >= 8 ? `<span class="route-line">✦ ${tx("عندك")} ${P(Math.round(s.gap_hours), "hour")} ${tx("في")} ${esc(placeName(s.hub))}: ${tx("تقدر تطلع تشوف المدينة إذا التأشيرة تسمح.")}</span>` : ""}
        <div class="row" style="gap:6px">${book(s.leg1, tx("التذكرة ١"))}${book(s.leg2, tx("التذكرة ٢"))}</div></div>`);
    }
    const refTotal = q.rt ? (base ? base.price : null) : (r.mixed ? r.mixed.out.price : base ? base.price : null);
    for (const n of r.nearby || []) {
      if (refTotal && n.total >= refTotal) continue;
      const where = n.kind === "origin" ? `${tx("اطلع من")} ${esc(placeName(n.airport))}` : `${tx("انزل في")} ${esc(placeName(n.airport))}`;
      cards.push(`<div class="alt"><b>${where}</b>${refTotal ? `<span class="save">${tx("توفر")} ${sar(perGroup(refTotal - n.total, p))}</span>` : ""}
        <span class="route-line">${n.km} ${tx("كم عن")} ${esc(placeName(n.kind === "origin" ? q.o : q.d))}، ${tx("تحسب حساب المشوار.")}</span>
        <span class="route-line">${tx("الذهاب")}: ${leg(n.out)}</span>${n.back ? `<span class="route-line">${tx("العودة")}: ${leg(n.back)}</span>` : ""}
        <span class="price-sub">${sar(perGroup(n.total, p))} ${tx("للمجموعة")}</span>
        <div class="row" style="gap:6px">${book(n.out, tx("الذهاب"))}${n.back ? book(n.back, tx("العودة")) : ""}</div></div>`);
    }
    box.innerHTML = `<section class="panel smart"><div class="file-head"><h2 class="sec" style="margin:0">${tx("طرق أوفر")}</h2>${q.rt ? `<button type="button" class="btn btn-ghost btn-sm" id="f-matrix">${tx("جدول ±٣ أيام")}</button>` : ""}</div>
      ${cards.length ? `<div class="smart-grid">${cards.join("")}</div>` : `<p class="small muted" style="margin:0">${tx("ما لقينا طريق أوفر من الرحلات العادية بهالتاريخ. جرّب «جدول ±٣ أيام» يمكن يوم قبل أو بعد يفرق.")}</p>`}
      <p class="small muted" style="margin:0">${F.smartRes.demo ? tx("أسعار تجريبية. ") : ""}${tx("الأسعار محفوظة وتقديرية، وتتأكد منها في موقع الحجز.")}</p></section>`;
    const mx = $("#f-matrix"); mx && mx.addEventListener("click", () => openMatrix(q));
  }
  async function openMatrix(q) {
    let r; try { r = await withLoad(tx("نحسب الأسعار حول تواريخك…"), () => api("flights/matrix", { origin: q.o, destination: q.d, depart: q.dep, return: q.ret })); } catch (e) { toast(e.message); return; }
    const prices = Object.values(r.cells).filter(Boolean).map(c => c.price).sort((a, b) => a - b), p = party();
    openDrawer(`<h2 id="drawer-title">${tx("جدول ±٣ أيام")}</h2><p class="muted" style="margin:0">${esc(placeName(q.o))} – ${esc(placeName(q.d))} · ${tx("ذهاب وعودة · السعر للبالغ. الصفوف أيام الذهاب، والأعمدة أيام العودة.")}</p>
      <div class="tbl-wrap"><table class="matrix"><thead><tr><th>${tx("ذهاب")} \\ ${tx("عودة")}</th>${r.rets.map(d => `<th>${esc(fmtDay(d))}</th>`).join("")}</tr></thead><tbody>
      ${r.deps.map(a => `<tr><th>${esc(fmtDay(a))}</th>${r.rets.map(b => { const c = r.cells[`${a}|${b}`]; return c ? `<td class="${levelOf(c.price, prices)} ${a === q.dep && b === q.ret ? "cur" : ""}"><a href="${esc(c.link || gFlights(q.o, q.d, a, b))}" target="_blank" rel="noopener" title="${esc(airline(c.airline))}">${sarShort(c.price)}</a></td>` : `<td class="${a === q.dep && b === q.ret ? "cur" : ""}">—</td>`; }).join("")}</tr>`).join("")}
      </tbody></table></div>
      <p class="small muted" style="margin:0">${r.demo ? tx("أسعار تجريبية. ") : tx("الخانات الفاضية ما فيها أسعار محفوظة. ")}${tx("اضغط أي سعر يفتح لك الحجز. للمجموعة اضربه تقريباً في")} ${p.adults + p.children * .75 + p.infants * .1}.</p>`);
  }

  // ---------- results list
  function scoreFlights(list, p, bag) {
    const prices = list.map(t => groupPrice(t, p, bag).withBag), durs = list.map(t => t.duration_to || t.duration || 0);
    const pmin = Math.min(...prices), pmax = Math.max(...prices), dmin = Math.min(...durs), dmax = Math.max(...durs);
    list.forEach((t, i) => {
      const np = pmax > pmin ? (prices[i] - pmin) / (pmax - pmin) : 0, nd = dmax > dmin ? (durs[i] - dmin) / (dmax - dmin) : 0;
      t._score = np * 0.6 + nd * 0.25 + Math.min(2, t.transfers || 0) / 2 * 0.15; t._total = prices[i];
    });
  }

  // Live search links + tips when the free price cache has nothing for a route (Riyadh routes, for example).
  function aviaLink(o, d, dep, ret, p) {
    const dm = x => x ? x.slice(8, 10) + x.slice(5, 7) : "";
    const pax = `${p.adults}${p.children || p.infants ? `${p.children}${p.infants}` : ""}`;
    return `https://www.aviasales.com/search/${o}${dm(dep)}${d}${ret ? dm(ret) : ""}${pax}`;
  }
  function noPrices(q) {
    const p = party(), dep = q.mode === "dates" ? q.dep : (q.month || defaultMonth()) + "-15", ret = q.rt ? (q.mode === "dates" ? q.ret : addDays(dep, q.nights || 7)) : "";
    const alts = ["JED", "DMM", "MED"].filter(c => c !== q.o && c !== q.d);
    return `<div class="panel panel-pad" style="display:grid;gap:10px">
      <b style="font-size:16px">${tx("ما فيه أسعار محفوظة لهالخط في المصدر المجاني")}</b>
      <span class="small muted">${tx("المصدر المجاني يحفظ أسعار عمليات البحث الأخيرة، وبعض المدن مثل الرياض ما لها بيانات فيه. تقدر تشوف الأسعار المباشرة من هنا:")}</span>
      <div class="row"><a class="btn btn-primary btn-sm" href="${esc(aviaLink(q.o, q.d, dep, ret, p))}" target="_blank" rel="noopener">${tx("الأسعار المباشرة في Aviasales")} ${ICON.out}</a>
        <a class="btn btn-ghost btn-sm" href="${esc(gFlights(q.o, q.d, dep, ret))}" target="_blank" rel="noopener">${tx("قوقل فلايتس")} ${ICON.out}</a></div>
      ${alts.length ? `<div class="row" style="align-items:center"><span class="small">${tx("أو جرب الإقلاع من مطار ثاني:")}</span>${alts.map(c => `<button type="button" class="chip" data-alt-origin="${c}">${esc(placeName(c))}</button>`).join("")}</div>` : ""}
      ${S.settings.has_serp ? "" : `<span class="small muted">${tx("وللأسعار المباشرة داخل دروب، حط مفتاح SerpApi المجاني (حوالي ٢٥٠ بحث بالشهر) من الإعدادات.")}</span>`}
    </div>`;
  }
  function bindNoPrices(box, root) {
    $$("[data-alt-origin]", box).forEach(b => b.addEventListener("click", () => {
      const el = $("#f-o", root || document); if (!el) return;
      el.value = `${placeName(b.dataset.altOrigin)} (${b.dataset.altOrigin})`; el.dataset.code = b.dataset.altOrigin; el.dataset.name = placeName(b.dataset.altOrigin);
      $("#fform").requestSubmit();
    }));
  }

  function drawFlightResults() {
    const box = $("#f-res"); if (!box) return;
    const p = party(), f = F.filters, all = F.tickets;
    if (!all.length) { if (F.cal) { box.innerHTML = ""; return; } box.innerHTML = noPrices(F.lastQ || {}); bindNoPrices(box); return; }
    const bag = !!f.bag; scoreFlights(all, p, bag);
    const airlines = Array.from(new Set(all.map(t => t.airline))).sort();
    const maxPrice = Math.max(...all.map(t => t._total)), maxDur = Math.max(...all.map(t => t.duration_to || 0));
    const slot = t => { const h = Number(hhmm(t.departure_at).slice(0, 2)); return h < 6 ? "night" : h < 12 ? "morning" : h < 18 ? "noon" : "evening"; };
    const list = all.filter(t => (f.stops == null || (f.stops === 0 ? !t.transfers : (t.transfers || 0) <= f.stops))
      && (!f.airlines || f.airlines.includes(t.airline)) && (!f.slots || !f.slots.length || f.slots.includes(slot(t)))
      && (!f.maxPrice || t._total <= f.maxPrice) && (!f.maxDur || !t.duration_to || t.duration_to <= f.maxDur));
    list.sort(F.sort === "cheap" ? (a, b) => a._total - b._total : F.sort === "fast" ? (a, b) => (a.duration_to || 9e9) - (b.duration_to || 9e9) : (a, b) => a._score - b._score);
    const bestT = all.slice().sort((a, b) => a._score - b._score)[0], cheapT = all.slice().sort((a, b) => a._total - b._total)[0];
    const ins = F.insights && F.insights.typical ? `<div class="panel panel-pad small">${tx("قوقل يقول: السعر الحين")} <b>${{ low: tx("أرخص من المعتاد"), typical: tx("عادي"), high: tx("أغلى من المعتاد") }[F.insights.level] || "—"}</b>، ${tx("والمعتاد بين")} ${sar(F.insights.typical[0])} ${tx("و")}${sar(F.insights.typical[1])}.</div>` : "";
    box.innerHTML = `${ins}<div class="results">
      <aside class="panel filters" id="f-filters"><h3>${tx("الفلاتر")}</h3>
        <div class="filter-group"><span class="lbl">${tx("التوقفات")}</span>${seg("stops", [["", tx("الكل")], ["0", tx("مباشر")], ["1", tx("توقف بالأكثر")]], f.stops == null ? "" : String(f.stops))}</div>
        <div class="filter-group"><span class="lbl">${tx("وقت الإقلاع")}</span><div class="chip-set">${[["night", tx("فجر ٠–٦")], ["morning", tx("صباح ٦–١٢")], ["noon", tx("ظهر ١٢–٦")], ["evening", tx("ليل ٦–١٢")]].map(([v, l]) => `<button type="button" class="chip" data-slot="${v}" aria-pressed="${(f.slots || []).includes(v)}">${l}</button>`).join("")}</div></div>
        <div class="filter-group"><span class="lbl"><span>${tx("أعلى سعر للمجموعة")}</span><b class="num" id="ff-pv">${sar(f.maxPrice || maxPrice)}</b></span><input type="range" id="ff-price" min="${Math.min(...all.map(t => t._total))}" max="${maxPrice}" step="10" value="${f.maxPrice || maxPrice}"></div>
        ${maxDur ? `<div class="filter-group"><span class="lbl"><span>${tx("أطول مدة")}</span><b id="ff-dv">${dur(f.maxDur || maxDur)}</b></span><input type="range" id="ff-dur" min="60" max="${maxDur}" step="15" value="${f.maxDur || maxDur}"></div>` : ""}
        <div class="filter-group"><span class="lbl">${tx("شركات الطيران")}</span>${airlines.map(a => `<label class="check"><input type="checkbox" data-al="${esc(a)}" ${!f.airlines || f.airlines.includes(a) ? "checked" : ""}> ${esc(airline(a))}</label>`).join("")}</div>
        <div class="filter-group"><label class="check"><input type="checkbox" id="ff-bag" ${bag ? "checked" : ""}> ${tx("السعر الحقيقي مع الشنطة")}</label><span class="small muted">${tx("يضيف رسوم شنطة تقديرية لشركات الطيران الاقتصادي.")}</span></div>
      </aside>
      <section><div class="sortbar">${seg("fsort", [["best", tx("الأفضل")], ["cheap", tx("الأرخص")], ["fast", tx("الأسرع")]], F.sort)}
          <span class="row" style="align-items:center"><button type="button" class="btn btn-ghost btn-sm filters-toggle" id="ff-toggle">${ICON.filter} ${tx("الفلاتر")}</button><span class="count">${list.length} ${tx("من أصل")} ${P(all.length, "flight")} · ${esc(partyLabel(p))}</span></span></div>
        <div class="list">${list.map(t => flightCard(t, p, bag, t === bestT, t === cheapT)).join("") || `<div class="panel empty"><b>${tx("ما فيه رحلات بهالفلاتر")}</b>${tx("خفف الفلاتر شوي.")}</div>`}</div>
        <p class="small muted">${all.some(t => t.demo) ? tx("هذي أسعار تجريبية.") : tx("أسعار Aviasales محفوظة من عمليات بحث آخر أيام، وممكن تتغير. «احجز» يفتح لك البحث بالسعر الحالي ومواقع الحجز.")} ${tx("أسعار الأطفال والرضّع تقديرية (٧٥٪ و١٠٪ من سعر البالغ).")}</p>
      </section></div>`;
    bindSeg(box, "fsort", v => { F.sort = v; drawFlightResults(); });
    bindSeg(box, "stops", v => { f.stops = v === "" ? null : Number(v); drawFlightResults(); });
    $$("[data-slot]", box).forEach(b => b.addEventListener("click", () => { const v = b.dataset.slot; f.slots = (f.slots || []).includes(v) ? f.slots.filter(x => x !== v) : (f.slots || []).concat(v); drawFlightResults(); }));
    $$("[data-al]", box).forEach(c => c.addEventListener("change", () => { f.airlines = $$("[data-al]", box).filter(x => x.checked).map(x => x.dataset.al); drawFlightResults(); }));
    const pr = $("#ff-price", box); pr.addEventListener("input", () => { $("#ff-pv").textContent = sar(pr.value); }); pr.addEventListener("change", () => { f.maxPrice = Number(pr.value); drawFlightResults(); });
    const dr = $("#ff-dur", box); if (dr) { dr.addEventListener("input", () => { $("#ff-dv").textContent = dur(dr.value); }); dr.addEventListener("change", () => { f.maxDur = Number(dr.value); drawFlightResults(); }); }
    $("#ff-bag", box).addEventListener("change", e => { f.bag = e.target.checked; drawFlightResults(); });
    $("#ff-toggle", box).addEventListener("click", () => $("#f-filters").classList.toggle("open"));
    $$("[data-fact]", box).forEach(b => b.addEventListener("click", () => flightAction(b.dataset.fact, all[Number(b.dataset.i)], b)));
  }
  const flightId = t => `f:${t.origin}-${t.destination}-${(t.departure_at || "").slice(0, 16)}-${t.airline}${t.flight_number || ""}-${(t.return_at || "").slice(0, 10)}`;
  function flightCard(t, p, bag, best, cheap) {
    const gp = groupPrice(t, p, true), i = F.tickets.indexOf(t);
    const dep = (t.departure_at || "").slice(0, 10), ret = (t.return_at || "").slice(0, 10);
    const stops = n => n == null ? "" : `<span class="stops-${Math.min(2, n)}">${n === 0 ? tx("مباشر") : P(n, "stop")}</span>`;
    const leg = (date, time, from, to, d, n, title, arr) => `<div class="leg">
        <div class="airline"><span class="al-badge">${esc(t.airline || "")}</span><span><div class="al-name">${esc(airline(t.airline))}</div><div class="al-sub">${esc(title)} · ${esc(fmtDay(date))}</div></span></div>
        <div class="timeline"><div class="tl-point"><div class="tl-time">${esc(time || "—")}</div><div class="tl-code">${esc(from)}</div></div>
          <div class="tl-mid">${d ? dur(d) : ""}<br>${stops(n)}</div><div class="tl-point"><div class="tl-time">${esc(arr || "")}</div><div class="tl-code">${esc(to)}</div></div></div></div>`;
    const fee = baggage()[t.airline];
    return `<article class="panel fcard"><div class="legs">
        ${leg(dep, hhmm(t.departure_at), t.origin_airport || t.origin, t.destination_airport || t.destination, t.duration_to, t.transfers, tx("الذهاب"), hhmm(t.arrival_at))}
        ${t.return_at && hhmm(t.return_at) ? leg(ret, hhmm(t.return_at), t.destination_airport || t.destination, t.origin_airport || t.origin, t.duration_back, t.return_transfers, tx("العودة"), "") : ""}
        ${t.return_at && !hhmm(t.return_at) ? `<div class="leg-ret small"><b>${tx("العودة")}</b> · ${esc(fmtDay(ret))} · <span dir="ltr">${esc(t.destination_airport || t.destination)} → ${esc(t.origin_airport || t.origin)}</span><br><span class="muted">${tx("تختار وقت رحلة العودة في صفحة الحجز.")}</span></div>` : ""}
        <div class="badges">${best ? tx('<span class="badge best">الأفضل</span>') : ""}${cheap ? tx('<span class="badge cheap">الأرخص</span>') : ""}${F.compare ? `<span class="badge">${tx("من")} ${esc(placeName(t.origin))}</span>` : ""}${t.combo ? `<span class="badge warn">${tx("تذكرتين: ذهاب وعودة منفصلة")}</span>` : ""}${t.near_date ? `<span class="badge">${tx("يوم قريب من تاريخك")}</span>` : ""}<span class="badge">${esc(t.demo ? tx("تجريبي") : t.source)}${t.cached && !t.demo ? tx(" · سعر محفوظ") : ""}</span>${t.flight_number ? `<span class="badge">${tx("رحلة")} ${esc(t.airline)}${esc(t.flight_number)}</span>` : ""}</div>
      </div>
      <div class="pricebox"><div class="price-big">${sar(bag ? gp.withBag : gp.total)}</div>
        <div class="price-sub">${p.total > 1 ? `${tx("للمجموعة")}${gp.estimated ? tx(" (تقديري)") : ""} · ${sar(t.total_price ? t.price / p.total : t.price)} ${tx("للبالغ")}` : tx("للشخص")}</div>
        ${fee && !t.total_price ? `<div class="true-price" title="${tx("رسوم الشنطة تقديرية وتعدلها من الإعدادات")}">${bag ? tx("يشمل") : tx("مع الشنطة")}: ${sar(gp.withBag)}</div>` : ""}</div>
      <div class="card-actions">
        <a class="btn btn-primary btn-sm" href="${esc(t.link || gFlights(t.origin, t.destination, dep, ret))}" target="_blank" rel="noopener">${tx("احجز")} ${ICON.out}</a>
        <button type="button" class="btn btn-ghost btn-sm" data-fact="watch" data-i="${i}">${ICON.bell} ${tx("راقب")}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-fact="more" data-i="${i}">${tx("المزيد")} ⋯</button>
      </div></article>`;
  }
  function flightShare(t, p) {
    const gp = groupPrice(t, p, false);
    return [`${tx("رحلة من دروب")} ✈`, `${placeName(t.origin)} – ${placeName(t.destination)}`, `${tx("الذهاب")}: ${fmtDay((t.departure_at || "").slice(0, 10))} ${hhmm(t.departure_at)}`,
      t.return_at ? `${tx("العودة")}: ${fmtDay(t.return_at.slice(0, 10))}` : tx("ذهاب فقط"), `${airline(t.airline)} · ${t.transfers ? P(t.transfers, "stop") : tx("مباشر")}`,
      `${tx("السعر")}: ${sar(gp.total)}${p.total > 1 ? tx(" للمجموعة (") + partyLabel(p) + ")" : ""}`, t.link || ""].filter(Boolean).join("\n");
  }
  async function flightAction(kind, t, btn) {
    if (!t) return;
    const dep = (t.departure_at || "").slice(0, 10), ret = (t.return_at || "").slice(0, 10), p = party();
    const title = `${placeName(t.origin)} – ${placeName(t.destination)}`, sub = `${fmtDay(dep)}${ret ? tx(" · عودة ") + fmtDay(ret) : ""} · ${airline(t.airline)}`;
    if (kind === "fav") btn.setAttribute("aria-pressed", await toggleFav({ id: flightId(t), kind: "flight", title, sub, price: t.price, link: t.link }));
    else if (kind === "trip") addToTrip({ type: "flight", title, sub, price: groupPrice(t, p, false).total, link: t.link || gFlights(t.origin, t.destination, dep, ret), date: dep, city: t.destination });
    else if (kind === "watch") await addWatch({ id: `w:${t.origin}-${t.destination}-${dep}-${ret}`, kind: "flight", label: `${title} · ${fmtDay(dep)}${ret ? tx(" إلى ") + fmtDay(ret) : ""}`, last: t.price, params: { origin: t.origin, destination: t.destination, depart: dep, return: ret || "" } });
    else if (kind === "hist") {
      const h = await api("history", { kind: "flight", key: `${t.origin}-${t.destination}${ret ? "-RT" : ""}`, day: dep, current: t.price });
      openDrawer(historyView(`${title} · ${fmtDay(dep)}`, h, tx("للبالغ")));
    } else if (kind === "card") {
      D.showCard({ title, sub, lines: [`${tx("الذهاب")}: ${fmtDayLong(dep)} ${hhmm(t.departure_at)}`, ret ? `${tx("العودة")}: ${fmtDayLong(ret)}` : tx("ذهاب فقط"), `${t.transfers ? P(t.transfers, "stop") : tx("مباشر")} · ${partyLabel(p)}`], price: sar(groupPrice(t, p, false).total) });
    } else if (kind === "more") {
      D.actionsDrawer(title, [
        { icon: ICON.out, label: tx("قارن في قوقل فلايتس"), href: gFlights(t.origin, t.destination, dep, ret) },
        { icon: ICON.scroll, label: tx("أضف لملف رحلة"), onClick: () => flightAction("trip", t) },
        { icon: ICON.star, label: isFav(flightId(t)) ? tx("شيلها من المفضلة") : tx("أضف للمفضلة"), onClick: async () => { await flightAction("fav", t, { setAttribute() {} }); D.closeDrawer(); } },
        { icon: ICON.bell, label: tx("تاريخ السعر"), onClick: () => flightAction("hist", t) },
        { icon: ICON.share, label: tx("أرسلها بالواتساب"), href: waLink(flightShare(t, p)) },
        { icon: ICON.note, label: tx("بطاقة بصورة للمشاركة"), onClick: () => flightAction("card", t) }
      ]);
    }
  }

  D.setFlightMode = (mode, month) => { F.mode = mode; if (month) F.month = month; F.tickets = []; F.cal = null; };

  // ================================================================== HOTELS
  const H = { mode: "dates", hotels: [], sort: "value", filters: {}, view: "list", ctx: null, cal: null, sel: null, map: null };
  D.setHotelMode = m => { H.mode = m; H.hotels = []; H.cal = null; };
  D.page("hotels", root => {
    D.onLeave(() => { if (H.map) { try { H.map.remove(); } catch (e) { /* gone */ } H.map = null; } });
    const ph = S.prefs.hotels || { city: "g293993" };
    const ci0 = ph.ci && ph.ci >= today() ? ph.ci : addDays(today(), 14), co0 = ph.co && ph.co > ci0 ? ph.co : addDays(ci0, 3);
    const c = X.cities.find(x => x.id === ph.city) || X.cities[0];
    root.innerHTML = hero("hotels", tx("الفنادق")) + `
      <form class="panel framed search-form" id="hform" autocomplete="off">
        <div class="row">${seg("hmode", [["dates", tx("تواريخ محددة")], ["month", tx("تقويم الشهر")], ["year", tx("السنة كاملة")]], H.mode)}</div>
        <div class="fields">
          ${cityField("h-city", tx("المدينة"), c.id)}
          <div class="field" data-show="dates"><label for="h-ci">${tx("الدخول")}</label><input class="input" type="date" id="h-ci" min="${today()}" value="${ci0}"></div>
          <div class="field" data-show="dates"><label for="h-co">${tx("الخروج")}</label><input class="input" type="date" id="h-co" min="${today()}" value="${co0}"></div>
          <div class="field" data-show="month"><label for="h-month">${tx("الشهر")}</label><select class="input" id="h-month">${months12().map(m => `<option value="${m}" ${m === defaultMonth() ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field" data-show="month year"><label for="h-nights">${tx("كم ليلة")}</label><input class="input num" type="number" id="h-nights" min="1" max="30" value="${ph.nights || 3}"></div>
          ${travelersField("h-trav")}
        </div>
        ${D.more(`<div class="fields"><div class="field"><label for="h-rooms">${tx("الغرف")}</label><select class="input" id="h-rooms"></select></div>
          <div class="field"><label for="h-lm">${tx("قريب من")}</label><select class="input" id="h-lm"></select></div></div>`)}
        <div class="form-actions"><span class="small muted" id="h-hint"></span><button class="btn btn-primary" type="submit">${tx("دوّر على الفنادق")}</button></div>
      </form>
      <div id="h-info"></div><div id="h-cal"></div><div id="h-res"></div>`;
    const form = $("#hform", root);
    const fillLm = cid => { const cc = X.cities.find(x => x.id === cid) || c; $("#h-lm").innerHTML = cc.landmarks.map((l, i) => `<option value="${i}">${esc(L(l))}</option>`).join(""); if (ph.lm != null && cid === ph.city) $("#h-lm").value = ph.lm; };
    const fillRooms = () => { const p = party(), sug = Math.max(1, Math.ceil(p.beds / 3)); const cur = Number($("#h-rooms").value || ph.rooms || sug); $("#h-rooms").innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === (cur || sug) ? "selected" : ""}>${P(n, "room")}${n === sug ? tx(" (مقترح)") : ""}</option>`).join(""); };
    fillLm(c.id); fillRooms();
    bindCity(form, "h-city", cc => fillLm(cc.id));
    bindTravelers(form, "h-trav", () => { $("#h-rooms").value = ""; fillRooms(); });
    const vis = () => { const m = segVal(form, "hmode"); $$("[data-show]", form).forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(m); }); $("#h-hint").textContent = m === "month" ? tx("تقويم بمتوسط سعر الليلة لأشهر الفنادق في المدينة.") : m === "year" ? tx("متوسط سعر الليلة في كل شهر.") : ""; };
    bindSeg(form, "hmode", v => { H.mode = v; vis(); }); vis();
    form.addEventListener("submit", e => { e.preventDefault(); runHotels(root); });
    if (D.takeAutoRun("hotels")) { H.hotels = []; H.cal = null; return form.requestSubmit(); }
    if (H.hotels.length || H.cal) { drawHotelInfo(); drawHotelCal(root); drawHotelResults(); }
    else $("#h-res", root).innerHTML = `<div class="panel empty"><b>${tx("جاهز للبحث")}</b>${tx("اختر المدينة والتواريخ وعددكم، واضغط «دوّر».")}</div>`;
  });

  function hotelQuery(root, dayOverride) {
    const c = X.cities.find(x => x.id === $("#h-city", root).dataset.city);
    if (!c) throw new Error(tx("اختر المدينة من القائمة."));
    const lm = c.landmarks[Number($("#h-lm", root).value || 0)] || c.landmarks[0];
    const nights = Number($("#h-nights", root).value || 3);
    let ci = $("#h-ci", root).value, co = $("#h-co", root).value;
    if (dayOverride) { ci = dayOverride; co = addDays(dayOverride, nights); }
    const q = { city: c, lm, mode: dayOverride ? "dates" : segVal(root, "hmode"), ci, co, month: $("#h-month", root).value, nights, rooms: Number($("#h-rooms", root).value || 1), party: party() };
    if (q.mode === "dates" && (!ci || !co || co <= ci)) throw new Error(tx("تاريخ الخروج لازم يكون بعد الدخول."));
    S.prefs.hotels = { city: c.id, ci: q.mode === "dates" ? ci : (S.prefs.hotels || {}).ci, co: q.mode === "dates" ? co : (S.prefs.hotels || {}).co, nights, rooms: q.rooms, lm: $("#h-lm", root).value };
    save("prefs"); return q;
  }
  async function runHotels(root, dayOverride) {
    let q; try { q = hotelQuery(root, dayOverride); } catch (e) { toast(e.message); return; }
    const p = q.party; H.q = q; drawHotelInfo();
    try {
      if (q.mode === "dates") {
        H.sel = dayOverride || null;
        if (dayOverride) { $("#h-ci").value = q.ci; $("#h-co").value = q.co; }
        const res = await withLoad(tx("القافلة تمر على الخانات وتقارن الأسعار…"), () => api("hotels/search", { city: q.city.id, checkin: q.ci, checkout: q.co, adults: p.adults, children: p.childAges.join(","), rooms: q.rooms }));
        H.hotels = res.hotels; H.filters = {};
        H.ctx = { city: q.city, lm: q.lm, checkin: q.ci, checkout: q.co, nights: res.nights, rooms: res.rooms, perRoom: res.per_room, party: p, source: res.source, demo: res.demo, cityEn: q.city.en };
        if (!dayOverride) { H.cal = null; $("#h-cal").innerHTML = ""; }
        remember("hotel", `${L(q.city)} · ${fmtDay(q.ci)} (${P(res.nights, "night")})`, { city: q.city.id, ci: q.ci, co: q.co });
        drawHotelResults(); if (dayOverride) drawHotelCal(root);
      } else if (q.mode === "month") {
        const res = await withLoad(tx("القافلة تحسب أسعار ليالي الشهر…"), () => api("hotels/calendar", { city: q.city.id, month: q.month }));
        H.cal = { kind: "month", month: q.month, days: res.days, demo: res.demo, hotels: res.hotels, city: q.city };
        H.hotels = []; drawHotelCal(root); $("#h-res").innerHTML = `<div class="panel empty"><b>${tx("اختر يوم الدخول من التقويم")}</b>${tx("بنحسب")} ${P(q.nights, "night")} ${tx("من اليوم اللي تختاره.")}</div>`;
      } else {
        const res = await withLoad(tx("القافلة تلف على أشهر السنة…"), () => api("hotels/calendar", { city: q.city.id, year: 1 }));
        H.cal = { kind: "year", months: res.months, demo: res.demo, hotels: res.hotels, city: q.city };
        H.hotels = []; drawHotelCal(root); $("#h-res").innerHTML = "";
      }
    } catch (e) { $("#h-res").innerHTML = errorBox(e); }
  }
  function drawHotelInfo() {
    const q = H.q, box = $("#h-info"); if (!box || !q) return;
    box.innerHTML = infoStrip(q.city, (q.mode === "dates" ? q.ci : q.month || defaultMonth()).slice(0, 7), q.mode === "dates" ? diffDays(q.ci, q.co) : q.nights, q.party.total);
  }
  function drawHotelCal(root) {
    const box = $("#h-cal"); if (!box) return;
    if (!H.cal) { box.innerHTML = ""; return; }
    const note = `${H.cal.demo ? tx("أسعار تجريبية. ") : tx("متوسط سعر ليلة لغرفة شخصين في أشهر فنادق المدينة") + (H.cal.hotels && H.cal.hotels.length ? " (" + H.cal.hotels.slice(0, 3).map(esc).join(tx("، ")) + ")" : "") + tx("، ومحسوبة بالعينة لبعض الأيام. ")}${tx("الأيام بدون سعر ملونة حسب تقييم المصدر (رخيص / متوسط / غالي).")}`;
    if (H.cal.kind === "year") {
      box.innerHTML = yearCalendar(Object.fromEntries(Object.entries(H.cal.months).map(([m, c]) => [m, c && c.price != null ? { price: c.price, tag: tx("لليلة") } : null])), note);
      $$(".ycell", box).forEach(b => b.addEventListener("click", () => { $("#h-month").value = b.dataset.month; H.mode = "month"; setSeg(root, "hmode", "month"); runHotels(root); }));
      return;
    }
    box.innerHTML = monthCalendar(H.cal.month, H.cal.days || {}, { sel: H.sel, nav: true, note, unit: tx("سعر الليلة بالريال") });
    $$(".cal-day[data-day]", box).forEach(b => b.addEventListener("click", () => runHotels(root, b.dataset.day)));
    bindCalNav(box, H.cal.month, m => { $("#h-month").value = m; H.mode = "month"; setSeg(root, "hmode", "month"); runHotels(root); });
  }
  // Google Hotels prices cover the whole group; the free source prices one room.
  const isG = h => h.source === "Google Hotels";
  const mult = (h, ctx) => isG(h) ? 1 : ctx.rooms;
  function roomPlans(h, ctx) {
    const n = ctx.nights, p = ctx.party, base = h.night;
    if (isG(h)) return [{ main: true, label: `${tx("سعر قوقل لكل الأشخاص")} (${p.adults + p.childAges.length})`, total: base * n, note: tx("قوقل يختار الغرف المناسبة لعددكم، وتشوف تفاصيلها في موقع الحجز") }];
    const plans = [{ main: true, label: `${P(ctx.rooms, "room")} · ${ctx.perRoom} ${tx("بالغرفة")}`, total: base * ctx.rooms * n, note: tx("السعر من المصدر") }];
    if (p.beds >= 3 && ctx.rooms === 1) plans.push({ label: tx("غرفتين عاديتين (راحة أكثر)"), total: Math.round(base * 0.82) * 2 * n, note: tx("تقديري") });
    if (p.beds >= 3 && p.beds <= 5) plans.push({ label: tx("جناح أو غرفة عائلية"), total: Math.round(base * 1.3) * n, note: tx("تقديري · مو كل الفنادق فيها") });
    if (p.beds >= 4) plans.push({ label: tx("شقة فندقية"), total: Math.round(base * 1.15) * n, note: tx("تقديري · اختر «شقق» من الفلاتر") });
    return plans;
  }
  const typeAr = t => ({ hotel: tx("فندق"), Hotel: tx("فندق"), Apartment: tx("شقة"), "vacation rental": tx("شقة / بيت"), "Specialty Hotel": tx("فندق مميز"), "B&B / Inn": tx("نُزل"), Hostel: tx("سكن شبابي"), Resort: tx("منتجع") }[t] || t);
  function drawHotelResults() {
    const box = $("#h-res"); if (!box) return;
    const ctx = H.ctx, f = H.filters;
    if (!H.hotels.length) { box.innerHTML = H.cal ? "" : `<div class="panel empty"><b>${tx("ما لقينا أسعار بهالتواريخ")}</b>${tx("ممكن المصدر ما عنده أسعار لهالأيام. جرب تواريخ ثانية أو «تقويم الشهر».")}</div>`; return; }
    const lm = ctx.lm;
    H.hotels.forEach(h => { h._dist = h.lat != null ? km(lm.lat, lm.lng, h.lat, h.lng) : null; h._value = h.night / Math.pow(Math.max(2.5, h.rating || 3.5), 2.2); });
    const maxN = Math.max(...H.hotels.map(h => h.night)), minN = Math.min(...H.hotels.map(h => h.night));
    const dists = H.hotels.map(h => h._dist).filter(x => x != null), maxD = dists.length ? Math.ceil(Math.max(...dists)) : 0;
    const hasStars = H.hotels.some(h => h.stars), hasFc = H.hotels.some(h => h.free_cancel != null), hasBf = H.hotels.some(h => h.breakfast), types = Array.from(new Set(H.hotels.map(h => h.type)));
    const list = H.hotels.filter(h => (!f.maxN || h.night <= f.maxN) && (!f.rating || (h.rating || 0) >= f.rating) && (!f.maxD || h._dist == null || h._dist <= f.maxD)
      && (!f.stars || !f.stars.length || f.stars.includes(Number(h.stars))) && (!f.bf || h.breakfast) && (!f.fc || h.free_cancel) && (!f.type || h.type === f.type));
    list.sort(H.sort === "cheap" ? (a, b) => a.night - b.night : H.sort === "rating" ? (a, b) => (b.rating || 0) - (a.rating || 0) || a.night - b.night : H.sort === "near" ? (a, b) => (a._dist ?? 9e9) - (b._dist ?? 9e9) : (a, b) => a._value - b._value);
    const cheapest = list.slice().sort((a, b) => a.night - b.night)[0];
    box.innerHTML = `<div class="results">
      <aside class="panel filters" id="h-filters"><h3>${tx("الفلاتر")}</h3>
        <div class="filter-group"><span class="lbl"><span>${tx("أعلى سعر لليلة")}</span><b class="num" id="hf-pv">${sar(f.maxN || maxN)}</b></span><input type="range" id="hf-price" min="${minN}" max="${maxN}" step="5" value="${f.maxN || maxN}"></div>
        <div class="filter-group"><span class="lbl">${tx("التقييم")}</span>${seg("hrate", [["", tx("الكل")], ["3.5", "+3.5"], ["4", "+4"], ["4.5", "+4.5"]], f.rating ? String(f.rating) : "")}</div>
        ${maxD ? `<div class="filter-group"><span class="lbl"><span>${tx("البعد عن")} ${esc(L(lm))}</span><b id="hf-dv">${(f.maxD || maxD).toFixed(1)} ${tx("كم")}</b></span><input type="range" id="hf-dist" min="0.3" max="${maxD}" step="0.1" value="${f.maxD || maxD}"><span class="small muted" id="hf-walk">${tx("مشي تقريباً")} ${P(Math.round((f.maxD || maxD) / 4.5 * 60), "minute")}</span></div>` : ""}
        ${hasStars ? `<div class="filter-group"><span class="lbl">${tx("النجوم")}</span><div class="chip-set">${[2, 3, 4, 5].map(s => `<button type="button" class="chip" data-star="${s}" aria-pressed="${(f.stars || []).includes(s)}">${s} ${tx("نجوم")}</button>`).join("")}</div></div>` : `<div class="filter-group"><span class="lbl">${tx("النجوم")}</span><span class="small muted">${tx("تتوفر مع مفتاح SerpApi.")}</span></div>`}
        ${types.length > 1 ? `<div class="filter-group"><span class="lbl">${tx("نوع السكن")}</span><select class="input" id="hf-type"><option value="">${tx("الكل")}</option>${types.map(t => `<option value="${esc(t)}" ${f.type === t ? "selected" : ""}>${esc(typeAr(t))}</option>`).join("")}</select></div>` : ""}
        <div class="filter-group">${hasBf ? `<label class="check"><input type="checkbox" id="hf-bf" ${f.bf ? "checked" : ""}> ${tx("الفطور مشمول")}</label>` : ""}
          ${hasFc ? `<label class="check"><input type="checkbox" id="hf-fc" ${f.fc ? "checked" : ""}> ${tx("إلغاء مجاني")}</label>` : `<span class="small muted">${tx("فلتر الإلغاء المجاني يتوفر مع مفتاح SerpApi.")}</span>`}</div>
      </aside>
      <section><div class="sortbar">${seg("hsort", [["value", tx("أفضل قيمة")], ["cheap", tx("الأرخص")], ["rating", tx("الأعلى تقييم")], ["near", tx("الأقرب")]], H.sort)}
          <span class="row" style="align-items:center">${seg("hview", [["list", tx("قائمة")], ["map", tx("خريطة")]], H.view)}<button type="button" class="btn btn-ghost btn-sm filters-toggle" id="hf-toggle">${ICON.filter} ${tx("الفلاتر")}</button></span></div>
        <p class="count" style="margin:0 0 8px">${list.length} ${tx("من أصل")} ${P(H.hotels.length, "hotel")} · ${esc(L(ctx.city))} · ${esc(fmtDay(ctx.checkin))} – ${esc(fmtDay(ctx.checkout))} · ${P(ctx.nights, "night")} · ${esc(partyLabel(ctx.party))} · ${P(ctx.rooms, "room")}</p>
        <div id="h-body">${H.view === "map" ? `<div class="map" id="h-map"></div><p class="map-note">${tx("الأرقام سعر الليلة. اضغط على أي فندق يفتح لك المقارنة.")}</p>` : `<div class="list">${list.map(h => hotelCard(h, ctx, h === cheapest)).join("") || `<div class="panel empty"><b>${tx("ما فيه فنادق بهالفلاتر")}</b>${tx("خفف الفلاتر شوي.")}</div>`}</div>`}</div>
        <p class="small muted">${ctx.demo ? tx("أسعار وفنادق تجريبية. ") : `${tx("المصدر")}: ${esc(ctx.source === "Google Hotels" ? tx("Google Hotels عبر SerpApi") : tx("TripAdvisor عبر Xotelo"))}. `}${tx("السعر لليلة للغرفة.")} ${ctx.source !== "Google Hotels" && ctx.party.childAges.length ? tx("المصدر المجاني ما يحسب أعمار الأطفال، فحسبنا كل طفل فوق السنتين كشخص بالغرفة. ") : ""}${tx("تأكد من السعر النهائي والضرائب في موقع الحجز.")}</p>
      </section></div>`;
    bindSeg(box, "hsort", v => { H.sort = v; drawHotelResults(); });
    bindSeg(box, "hview", v => { H.view = v; drawHotelResults(); });
    bindSeg(box, "hrate", v => { f.rating = v ? Number(v) : null; drawHotelResults(); });
    const pr = $("#hf-price", box); pr.addEventListener("input", () => { $("#hf-pv").textContent = sar(pr.value); }); pr.addEventListener("change", () => { f.maxN = Number(pr.value); drawHotelResults(); });
    const dr = $("#hf-dist", box); if (dr) { dr.addEventListener("input", () => { $("#hf-dv").textContent = Number(dr.value).toFixed(1) + tx(" كم"); $("#hf-walk").textContent = `${tx("مشي تقريباً")} ${P(Math.round(dr.value / 4.5 * 60), "minute")}`; }); dr.addEventListener("change", () => { f.maxD = Number(dr.value); drawHotelResults(); }); }
    $$("[data-star]", box).forEach(b => b.addEventListener("click", () => { const s = Number(b.dataset.star); f.stars = (f.stars || []).includes(s) ? f.stars.filter(x => x !== s) : (f.stars || []).concat(s); drawHotelResults(); }));
    const ty = $("#hf-type", box); ty && ty.addEventListener("change", () => { f.type = ty.value || null; drawHotelResults(); });
    const bf = $("#hf-bf", box); bf && bf.addEventListener("change", () => { f.bf = bf.checked; drawHotelResults(); });
    const fc = $("#hf-fc", box); fc && fc.addEventListener("change", () => { f.fc = fc.checked; drawHotelResults(); });
    $("#hf-toggle", box).addEventListener("click", () => $("#h-filters").classList.toggle("open"));
    $$("[data-hotel]", box).forEach(el => el.addEventListener("click", e => { if (e.target.closest("a,button")) return; openHotel(H.hotels.find(h => h.id === el.dataset.hotel)); }));
    $$("[data-hopen]", box).forEach(b => b.addEventListener("click", () => openHotel(H.hotels.find(h => h.id === b.dataset.hopen))));
    if (H.view === "map") drawMap(list, cheapest);
  }
  function hotelCard(h, ctx, cheapest) {
    const others = h.rates.slice(1, 4);
    const img = h.image ? `<div class="himg"><img src="${esc(h.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sadu-ph');this.remove()"></div>` : `<div class="himg sadu-ph" aria-hidden="true">${esc(typeAr(h.type))}</div>`;
    return `<article class="panel hcard" data-hotel="${esc(h.id)}" tabindex="0">${img}
      <div class="hbody"><h3 class="hname">${esc(h.name)}</h3>
        <div class="row" style="gap:10px;align-items:center">${h.rating ? `<span class="rating"><b>${Number(h.rating).toFixed(1)}</b><span class="muted">${h.reviews ? P(h.reviews, "review") : ""}</span></span>` : ""}${h.stars ? `<span class="stars" aria-label="${h.stars} ${tx("نجوم")}">${"★".repeat(Math.round(h.stars))}</span>` : ""}<span class="small muted">${esc(typeAr(h.type))}</span></div>
        <div class="small">${h._dist != null ? `${h._dist < 1 ? Math.round(h._dist * 1000) + tx(" م") : h._dist.toFixed(1) + tx(" كم")} ${tx("عن")} ${esc(L(ctx.lm))}` : ""}</div>
        <div class="badges">${cheapest ? tx('<span class="badge cheap">الأرخص</span>') : ""}${h.breakfast ? tx('<span class="badge">فطور</span>') : ""}${h.free_cancel ? tx('<span class="badge">إلغاء مجاني</span>') : ""}${h.demo ? tx('<span class="badge">تجريبي</span>') : ""}</div>
        ${others.length ? `<div class="sites-mini">${others.map(r => `<span>${esc(r.site)} <b class="num">${sarShort(r.night)}</b></span>`).join("")}</div>` : ""}</div>
      <div class="pricebox"><span class="small muted">${h.rates[0] ? `${tx("أرخص موقع")}: <b>${esc(h.rates[0].site)}</b>` : isG(h) ? tx("يبدأ من (حسب قوقل)") : ""}</span>
        <div class="price-big">${sar(h.night)}<small> ${tx("/ليلة")}</small></div><div class="price-sub">${tx("المجموع")} ${sar(h.night * ctx.nights * mult(h, ctx))}</div>
        <button type="button" class="btn btn-primary btn-sm" data-hopen="${esc(h.id)}">${isG(h) && !h.checked ? tx("شوف السعر الفعلي") : tx("قارن المواقع")}</button></div></article>`;
  }
  function drawMap(list, cheapest) {
    const el = $("#h-map"); if (!el) return;
    if (!window.L) { el.innerHTML = `<div class="empty"><b>${tx("الخريطة تحتاج إنترنت")}</b>${tx("ما قدرنا نحمّل مكتبة الخرائط.")}</div>`; return; }
    const ctx = H.ctx, map = L.map(el).setView([ctx.lm.lat, ctx.lm.lng], 14);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    let tileErr = 0; tiles.on("tileerror", () => { if (++tileErr === 3) $(".map-note").textContent = tx("صور الخريطة ما تحمّلت هنا (في نسخة الجوال التجريبية تنحجب). مواقع الفنادق والأسعار ظاهرة، والخريطة كاملة في نسخة الكمبيوتر."); });
    const pin = (html, cls) => L.divIcon({ className: "leaflet-div-icon", html: `<span class="map-pin ${cls || ""}">${html}</span>`, iconSize: [0, 0] });
    L.marker([ctx.lm.lat, ctx.lm.lng], { icon: pin(esc(L(ctx.lm)), "lm"), zIndexOffset: 1000 }).addTo(map);
    const pts = [[ctx.lm.lat, ctx.lm.lng]];
    for (const h of list) { if (h.lat == null) continue; pts.push([h.lat, h.lng]); L.marker([h.lat, h.lng], { icon: pin(sarShort(h.night), h === cheapest ? "cheapest" : "") }).addTo(map).on("click", () => openHotel(h)); }
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    H.map = map;
  }
  async function openHotel(h) {
    if (!h) return;
    const ctx = H.ctx;
    const render = (rates, loadingRates) => {
      const plans = roomPlans(h, ctx);
      openDrawer(`<h2 id="drawer-title">${esc(h.name)}</h2>
        <div class="row" style="gap:10px;align-items:center">${h.rating ? `<span class="rating"><b>${Number(h.rating).toFixed(1)}</b><span class="muted">${h.reviews ? P(h.reviews, "review") : ""}</span></span>` : ""}${h.stars ? `<span class="stars">${"★".repeat(Math.round(h.stars))}</span>` : ""}${h._dist != null ? `<span class="small">${h._dist.toFixed(1)} ${tx("كم عن")} ${esc(L(ctx.lm))}</span>` : ""}</div>
        ${h.image ? `<div class="himg" style="aspect-ratio:16/8"><img src="${esc(h.image)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sadu-ph');this.remove()"></div>` : ""}
        ${h.images && h.images.length > 1 ? `<div class="gallery">${h.images.slice(1, 7).map(u => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`).join("")}</div>` : ""}
        <section><h3 class="sec">${tx("أرخص موقع تحجز منه")}</h3><p class="small muted" style="margin:0 0 6px">${esc(fmtDay(ctx.checkin))} – ${esc(fmtDay(ctx.checkout))} · ${P(ctx.nights, "night")} · ${esc(partyLabel(ctx.party))}</p>
          <div class="tbl-wrap"><table class="rates"><thead><tr><th>${tx("الموقع")}</th><th>${tx("لليلة")}</th><th>${isG(h) ? tx("المجموع") : `${tx("المجموع (")}${P(ctx.rooms, "room")})`}</th><th></th></tr></thead><tbody>
          ${rates.map((r, i) => `<tr class="${i === 0 ? "best" : ""}"><td>${esc(r.site)}${i === 0 ? tx(' <span class="badge cheap">الأرخص</span>') : ""}</td><td class="num">${sar(r.night)}</td><td class="num">${sar(r.night * ctx.nights * mult(h, ctx))}</td>
            <td><a class="btn ${i === 0 ? "btn-primary" : "btn-ghost"} btn-sm" href="${esc(r.link || otaLink(r.site, h, ctx))}" target="_blank" rel="noopener">${tx("احجز")} ${ICON.out}</a></td></tr>`).join("")}</tbody></table></div>
          ${loadingRates ? tx('<p class="small muted">نحدّث الأسعار…</p>') : ""}
          ${!loadingRates && isG(h) && !rates.length ? `<p class="small muted">${tx("قوقل ما عرض أسعار مواقع لهالفندق بعددكم وتواريخكم. افتحه في قوقل للفنادق تحت.")}</p>` : ""}
          ${h.listNight && rates[0] && rates[0].night > h.listNight * 1.1 ? `<p class="small" style="margin:6px 0 0">${tx("قوقل كان يعرض في القائمة")} <b class="num">${sar(h.listNight)}</b> ${tx("لليلة، وهذا أقل سعر عنده. السعر الفعلي لعددكم في المواقع فوق.")}</p>` : ""}
          ${rates.length > 1 && rates[rates.length - 1].night > rates[0].night ? `<p class="small" style="margin:6px 0 0">${tx("الفرق بين أرخص وأغلى موقع")}: <b class="num">${sar((rates[rates.length - 1].night - rates[0].night) * ctx.nights * mult(h, ctx))}</b> ${tx("على كامل الإقامة.")}</p>` : ""}</section>
        <section><h3 class="sec">${tx("الغرف المناسبة لعددكم")}</h3><div class="plan">${plans.map(pl => `<div class="plan-opt ${pl.main ? "pick" : ""}"><span><b>${esc(pl.label)}</b><br><span class="small muted">${esc(pl.note)}</span></span><b class="num">${sar(pl.total)}</b></div>`).join("")}</div>
          ${ctx.party.childAges.length ? `<p class="small muted" style="margin:6px 0 0">${tx("سياسة الأطفال (السكن المجاني أو السرير الإضافي) تختلف من فندق لفندق، تأكد منها في صفحة الحجز.")}</p>` : ""}</section>
        <section><h3 class="sec">${tx("شوفه في قوقل")}</h3><p class="small muted" style="margin:0 0 8px">${tx("قوقل ماب يعرض لك الفندق ومواقع الحجز وأسعارها مثل ما تعودت.")}</p>
          <div class="row"><a class="btn btn-ghost btn-sm" href="${esc(gMaps(h.name, ctx.city.en))}" target="_blank" rel="noopener">${ICON.map} ${tx("افتح في قوقل ماب")}</a>
          <a class="btn btn-ghost btn-sm" href="${esc(gHotels(h.name, ctx.city.en))}" target="_blank" rel="noopener">${tx("قارن في قوقل للفنادق")} ${ICON.out}</a>
          ${h.url ? `<a class="btn btn-ghost btn-sm" href="${esc(h.url)}" target="_blank" rel="noopener">${tx("التقييمات")} ${ICON.out}</a>` : ""}</div></section>
        <section class="panel panel-pad" style="display:grid;gap:10px"><h3 class="sec" style="margin:0">${tx("حجزت؟ خلنا نراقب لك")}</h3>
          <p class="small muted" style="margin:0">${tx("إذا حجزك فيه إلغاء مجاني، حط سعرك وآخر يوم للإلغاء. إذا نزل السعر بعدين نعلمك تلغي وتحجز من جديد.")}</p>
          <div class="row"><div class="field grow"><label for="bk-price">${tx("سعر الليلة اللي حجزت فيه")} (${I18N.curSym()})</label><input class="input num" type="number" id="bk-price" value="${Math.round(I18N.fromSAR(rates[0] ? rates[0].night : h.night))}"></div>
            <div class="field grow"><label for="bk-cancel">${tx("آخر يوم للإلغاء المجاني")}</label><input class="input" type="date" id="bk-cancel" value="${addDays(ctx.checkin, -2)}"></div>
            <button type="button" class="btn btn-ghost" id="bk-save">${ICON.bell} ${tx("راقب بعد الحجز")}</button></div></section>
        <div class="row">
          <button type="button" class="btn btn-ghost btn-sm" id="hd-trip">${ICON.scroll} ${tx("لملف رحلة")}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-fav" aria-pressed="${isFav("h:" + h.id + ctx.checkin)}">${ICON.star} ${tx("مفضلة")}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-watch">${ICON.bell} ${tx("راقب السعر")}</button>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-hist">${tx("تاريخ السعر")}</button>
          <a class="btn btn-ghost btn-sm" href="${esc(waLink(hotelShare(h, ctx, rates)))}" target="_blank" rel="noopener">${ICON.share} ${tx("واتساب")}</a>
          <button type="button" class="btn btn-ghost btn-sm" id="hd-card">${ICON.note} ${tx("بطاقة بصورة")}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-place="${esc(ctx.city.id)}" data-date="${esc(ctx.checkin)}">${tx("الصلاة والمساجد القريبة")}</button></div>`);
      $("#hd-card").addEventListener("click", () => D.showCard({ title: h.name, sub: `${L(ctx.city)} · ${P(ctx.nights, "night")}`, lines: [`${fmtDayLong(ctx.checkin)} – ${fmtDayLong(ctx.checkout)}`, `${tx("أرخص موقع")}: ${rates[0] ? rates[0].site : ""}`, partyLabel(ctx.party)], price: sar((rates[0] ? rates[0].night : h.night) * ctx.nights * mult(h, ctx)) }));
      const watchBase = { kind: "hotel", label: `${h.name} · ${fmtDay(ctx.checkin)} (${P(ctx.nights, "night")})`, last: h.night, params: Object.assign({ id: h.id, checkin: ctx.checkin, checkout: ctx.checkout, per_room: ctx.perRoom },
        isG(h) ? { token: h.token, query: `${h.name} ${ctx.city.en}`, adults: ctx.party.adults, children: ctx.party.childAges.join(",") } : {}) };
      $("#hd-fav").addEventListener("click", async e => { const btn = e.currentTarget; btn.setAttribute("aria-pressed", await toggleFav({ id: "h:" + h.id + ctx.checkin, kind: "hotel", title: h.name, sub: `${L(ctx.city)} · ${fmtDay(ctx.checkin)} · ${P(ctx.nights, "night")}`, price: h.night, link: gMaps(h.name, ctx.city.en) })); });
      $("#hd-trip").addEventListener("click", () => addToTrip({ type: "hotel", title: h.name, sub: `${L(ctx.city)} · ${fmtDay(ctx.checkin)} – ${fmtDay(ctx.checkout)} · ${P(ctx.rooms, "room")}`, price: (rates[0] ? rates[0].night : h.night) * ctx.nights * mult(h, ctx), link: gMaps(h.name, ctx.city.en), date: ctx.checkin, city: ctx.city.id }));
      $("#hd-watch").addEventListener("click", () => addWatch(Object.assign({ id: `w:h:${h.id}:${ctx.checkin}:${ctx.checkout}` }, watchBase)));
      $("#bk-save").addEventListener("click", () => addWatch(Object.assign({ id: `w:hb:${h.id}:${ctx.checkin}:${ctx.checkout}` }, watchBase, { label: tx("محجوز · ") + watchBase.label, booked: Math.round(I18N.toSAR(Number($("#bk-price").value))) || h.night, cancel_by: $("#bk-cancel").value || null })));
      $("#hd-hist").addEventListener("click", async () => { const hist = await api("history", { kind: "hotel", key: h.id, day: ctx.checkin, current: h.night }); openDrawer(historyView(`${h.name} · ${fmtDay(ctx.checkin)}`, hist, tx("سعر الليلة."))); });
    };
    render(h.rates, !h.demo);
    if (h.demo) return;
    try {
      const r = await api("hotels/rates", { id: h.id, token: h.token, name: h.name, query: `${h.name} ${ctx.city.en}`, checkin: ctx.checkin, checkout: ctx.checkout, adults: ctx.party.adults, children: ctx.party.childAges.join(","), rooms: ctx.rooms });
      if (!$("#drawer").hidden && $("#drawer-title") && $("#drawer-title").textContent === h.name) { if (isG(h) && !h.checked) { h.checked = true; h.listNight = h.night; }
        if (r.rates && r.rates.length) { h.rates = r.rates; h.night = r.rates[0].night; }
        render(h.rates, false); if (isG(h)) drawHotelResults(); }
    } catch (e) { if (!$("#drawer").hidden) render(h.rates, false); }
  }
  function hotelShare(h, ctx, rates) {
    return [`${tx("فندق من دروب")} 🏨`, h.name, `${L(ctx.city)} · ${fmtDay(ctx.checkin)} – ${fmtDay(ctx.checkout)} (${P(ctx.nights, "night")})`,
      `${tx("أرخص سعر")}: ${sar(rates[0] ? rates[0].night : h.night)} ${tx("لليلة في")} ${rates[0] ? rates[0].site : ""}`, `${tx("المجموع تقريباً")}: ${sar((rates[0] ? rates[0].night : h.night) * ctx.nights * mult(h, ctx))}`,
      gMaps(h.name, ctx.city.en)].join("\n");
  }
})();
