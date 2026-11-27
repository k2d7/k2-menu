/* Duroob — planning pages: full trip, multi-city, where to go, umrah, holidays. */
(function () {
  "use strict";
  const { META, X, S, ICON, $, $$, esc, sar, addDays, diffDays, today, fmtDay, fmtDayLong, fmtMonth, monthName, hhmm, airline, months12, defaultMonth, km, uid,
    api, save, withLoad, toast, errorBox, openDrawer, seg, bindSeg, segVal, hero, party, partyLabel, travelersField, bindTravelers, placeField, bindPlace, codeOf,
    placeName, cityByIata, countryOfCode, cityField, bindCity, climateOf, feel, visaOf, dailyCost, infoStrip, seasons, monthCalendar, remember, addToTrip,
    gFlights, gMaps, groupPrice, perGroup, go } = window.D;

  // ================================================================== FULL TRIP
  const T = { res: null };
  D.page("trip", root => {
    const pt = S.prefs.trip || { city: "g293974", nights: 5, months: months12().slice(1, 3) };
    const home = S.settings.home || "RUH";
    root.innerHTML = hero("trip", "رحلة كاملة") + `
      <form class="panel framed search-form" id="tform" autocomplete="off">
        <div class="fields">
          ${placeField("t-o", "من", pt.o || { code: home, name: placeName(home) })}
          ${cityField("t-city", "الوجهة", pt.city)}
          <div class="field"><label for="t-n">كم ليلة</label><input class="input num" type="number" id="t-n" min="1" max="30" value="${pt.nights}"></div>
          ${travelersField("t-trav")}
          <div class="field"><label for="t-rooms">الغرف</label><select class="input" id="t-rooms">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === (pt.rooms || Math.max(1, Math.ceil(party().beds / 3))) ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        </div>
        <div class="field"><span class="lbl">الأشهر (اختر شهر أو أكثر)</span><div class="chip-set" id="t-months">${months12().map(m => `<button type="button" class="chip" data-m="${m}" aria-pressed="${pt.months.includes(m)}">${esc(fmtMonth(m))}</button>`).join("")}</div>
          <div class="chip-set" style="margin-top:6px"><button type="button" class="chip" data-preset="summer">الصيف</button><button type="button" class="chip" data-preset="winter">الشتاء</button><button type="button" class="chip" data-preset="next3">الثلاث أشهر الجاية</button></div></div>
        <div class="form-actions"><span class="small muted">نختار أرخص ستة مواعيد طيران، ونلقى لكل واحد أرخص فندق من أشهر فنادق المدينة، ونضيف المصروف اليومي.</span><button class="btn btn-primary" type="submit">احسب أرخص رحلة</button></div>
      </form><div id="t-info"></div><div id="t-res"></div>`;
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
      const o = codeOf($("#t-o")), c = X.cities.find(x => x.id === $("#t-city").dataset.city);
      const months = $$("[data-m][aria-pressed=true]", form).map(x => x.dataset.m), nights = Number($("#t-n").value || 5), rooms = Number($("#t-rooms").value || 1);
      if (!o || !c) return toast("اختر مدينة الإقلاع والوجهة.");
      if (!months.length) return toast("اختر شهر واحد على الأقل.");
      S.prefs.trip = { o: { code: o, name: placeName(o) }, city: c.id, nights, months, rooms }; save("prefs");
      const p = party();
      try {
        const res = await withLoad("القافلة تحسب الطيران والفندق لكل فترة…", () => api("trip", { origin: o, city: c.id, destination: c.iata, months: months.join(","), nights, adults: p.adults, children: p.childAges.join(","), rooms }));
        T.res = { windows: res.windows, c, p, o, demo: res.demo, months, nights };
        remember("trip", `رحلة كاملة: ${c.ar} · ${nights} ليالي`, { o, cid: c.id, months, nights });
        drawTrip();
      } catch (err) { $("#t-res").innerHTML = errorBox(err); }
    });
    if (T.res) drawTrip();
  });
  function drawTrip() {
    const { windows, c, p, o, demo } = T.res, box = $("#t-res");
    $("#t-info").innerHTML = infoStrip(c, (windows[0] ? windows[0].depart : T.res.months[0] + "-01").slice(0, 7), T.res.nights, p.total);
    if (!windows.length) { box.innerHTML = `<div class="panel empty"><b>ما لقينا مواعيد كاملة</b>جرب أشهر ثانية أو عدد ليالي مختلف.</div>`; return; }
    const daily = dailyCost(c.country) || 0;
    const rows = windows.map(w => { const fl = groupPrice(w.flight, p, false).total, ht = w.hotel.night * w.nights * w.rooms, sp = daily * w.nights * p.total; return Object.assign(w, { fl, ht, sp, total: fl + ht + sp }); }).sort((a, b) => a.total - b.total);
    box.innerHTML = `<div class="list">${rows.map((w, i) => `<article class="panel trip-row">
        <div><div class="trip-rank">${i === 0 ? "الأرخص بالمجموع" : "الخيار " + (i + 1)}</div><b>${esc(fmtDay(w.depart))} ← ${esc(fmtDay(w.return))}</b><div class="small muted">${w.nights} ليالي · ${esc(partyLabel(p))}</div></div>
        <div><div class="lbl">الطيران · ${esc(airline(w.flight.airline))}</div><b class="num">${sar(w.fl)}</b><div class="small muted">${w.flight.transfers ? w.flight.transfers + " توقف" : "مباشر"}</div></div>
        <div><div class="lbl">الفندق · ${esc(w.hotel.site || "")}</div><b>${esc(w.hotel.name)}</b><div class="small muted num">${sar(w.hotel.night)} لليلة${w.rooms > 1 ? " × " + w.rooms + " غرف" : ""}${daily ? ` · مصروف ${sar(w.sp)}` : ""}</div></div>
        <div class="pricebox"><div class="price-big">${sar(w.total)}</div><div class="price-sub">${sar(w.total / p.total)} للشخص · شامل المصروف</div>
          <div class="row" style="gap:6px"><a class="btn btn-primary btn-sm" href="${esc(w.flight.link || gFlights(o, c.iata, w.depart, w.return))}" target="_blank" rel="noopener">الطيران ${ICON.out}</a><a class="btn btn-ghost btn-sm" href="${esc(gMaps(w.hotel.name, c.en))}" target="_blank" rel="noopener">الفندق ${ICON.out}</a>
          <button type="button" class="btn btn-ghost btn-sm" data-tadd="${i}">${ICON.scroll} لملف رحلة</button></div></div>
      </article>`).join("")}</div>
      <p class="small muted">${demo ? "أسعار تجريبية. " : ""}الطيران من أسعار محفوظة، والفندق أرخص سعر من أشهر عشرة فنادق في ${esc(c.ar)} لنفس الليالي، والمصروف اليومي تقديري (${sar(daily)} للشخص). أسعار الأطفال تقديرية.</p>`;
    $$("[data-tadd]", box).forEach(b => b.addEventListener("click", () => {
      const w = rows[Number(b.dataset.tadd)];
      addToTrip({ type: "plan", title: `رحلة ${c.ar}: ${fmtDay(w.depart)} ← ${fmtDay(w.return)}`, sub: `طيران ${sar(w.fl)} · ${w.hotel.name} ${sar(w.ht)} · مصروف ${sar(w.sp)}`, price: w.total, link: w.flight.link, date: w.depart, city: c.id });
    }));
  }

  // ================================================================== MULTI-CITY
  const M = { res: null };
  D.page("multi", root => {
    const pm = S.prefs.multi || { cities: [{ code: "IST", name: "إسطنبول", nights: 4 }, { code: "TZX", name: "طرابزون", nights: 3 }], start: addDays(today(), 30) };
    const home = S.settings.home || "RUH";
    root.innerHTML = hero("multi", "متعددة المدن") + `
      <form class="panel framed search-form" id="mform" autocomplete="off">
        <div class="fields">${placeField("m-o", "تبدأ من", pm.o || { code: home, name: placeName(home) })}
          <div class="field"><label for="m-start">تاريخ البداية</label><input class="input" type="date" id="m-start" min="${today()}" value="${pm.start >= today() ? pm.start : addDays(today(), 30)}"></div>
          ${travelersField("m-trav")}</div>
        <div class="field"><span class="lbl">المدن بالترتيب وكم ليلة بكل وحدة</span><div class="city-list" id="m-cities"></div>
          <div class="row" style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" id="m-add">+ مدينة</button></div></div>
        <div class="checks"><label class="check"><input type="checkbox" id="m-back" ${pm.back !== false ? "checked" : ""}> أرجع لمدينتي في الآخر</label>
          <label class="check"><input type="checkbox" id="m-opt" ${pm.optimize !== false ? "checked" : ""}> رتّب لي المدن بأرخص ترتيب</label></div>
        <div class="form-actions"><span class="small muted">حتى خمس مدن. الترتيب الأرخص يتحسب لأربع مدن أو أقل.</span><button class="btn btn-primary" type="submit">خطط الرحلة</button></div>
      </form><div id="m-res"></div>`;
    const form = $("#mform", root);
    bindPlace(form, "m-o"); bindTravelers(form, "m-trav");
    let rows = pm.cities.map(c => Object.assign({ id: uid() }, c));
    const drawRows = () => {
      $("#m-cities").innerHTML = rows.map((r, i) => `<div class="city-row">${placeField("mc-" + r.id, `المدينة ${i + 1}`, r)}
        <div class="field"><label for="mn-${r.id}">ليالي</label><input class="input num" type="number" min="1" max="30" id="mn-${r.id}" value="${r.nights}"></div>
        <button type="button" class="icon-btn" data-mdel="${r.id}" aria-label="حذف" style="align-self:end">✕</button></div>`).join("");
      rows.forEach(r => bindPlace(form, "mc-" + r.id));
    };
    const sync = () => rows.forEach(r => { const el = $("#mc-" + r.id); r.code = codeOf(el); r.name = el.dataset.name || placeName(r.code); r.nights = Number($("#mn-" + r.id).value || 3); });
    drawRows();
    $("#m-add").addEventListener("click", () => { sync(); if (rows.length >= 5) return toast("حتى خمس مدن بس."); rows.push({ id: uid(), nights: 3 }); drawRows(); });
    $("#m-cities").addEventListener("click", e => { const b = e.target.closest("[data-mdel]"); if (!b) return; sync(); if (rows.length <= 1) return; rows = rows.filter(r => r.id !== b.dataset.mdel); drawRows(); });
    form.addEventListener("submit", async e => {
      e.preventDefault(); sync();
      const o = codeOf($("#m-o")), cs = rows.filter(r => r.code);
      if (!o || !cs.length) return toast("اختر مدينة البداية والمدن.");
      const start = $("#m-start").value, back = $("#m-back").checked, optimize = $("#m-opt").checked;
      S.prefs.multi = { o: { code: o, name: placeName(o) }, cities: cs.map(({ code, name, nights }) => ({ code, name, nights })), start, back, optimize }; save("prefs");
      try {
        const res = await withLoad("القافلة ترسم طريق الحرير حقك…", () => api("multicity", { origin: o, cities: cs.map(r => r.code).join(","), nights: cs.map(r => r.nights).join(","), start, return: back ? 1 : 0, optimize: optimize ? 1 : 0 }));
        M.res = Object.assign(res, { o, input: cs.map(r => r.code) });
        remember("multi", `${placeName(o)} ← ${cs.map(r => placeName(r.code)).join(" ← ")}`, { o, cs: cs.map(r => r.code) });
        drawMulti();
      } catch (err) { $("#m-res").innerHTML = errorBox(err); }
    });
    if (M.res) drawMulti();
  });
  function drawMulti() {
    const r = M.res, p = party(), box = $("#m-res");
    const total = r.legs.reduce((s, l) => s + (l.ticket ? perGroup(l.ticket.price, p) : 0), 0);
    const changed = r.optimized && r.orders.length && r.orders[0].order.join() !== r.input.join();
    box.innerHTML = `<section class="panel panel-pad" style="display:grid;gap:8px">
        <div class="file-head"><h2 class="sec" style="margin:0">طريقك</h2><div class="price-big">${sar(total)}<small> للمجموعة${r.complete ? "" : " (ناقص)"}</small></div></div>
        ${changed ? `<p class="small" style="margin:0">رتبنا المدن بترتيب أرخص من ترتيبك: <b>${r.orders[0].order.map(placeName).map(esc).join(" ← ")}</b></p>` : ""}
        <div class="legs-plan">${r.legs.map(l => { const c = cityByIata(l.to), cl = c ? climateOf(c.id, l.date.slice(0, 7)) : null, v = visaOf(countryOfCode(l.to)); return `<div class="mc-leg"><span class="mc-dot"></span>
          <div><b>${esc(placeName(l.from))} ← ${esc(placeName(l.to))}</b><div class="small muted">${esc(fmtDayLong(l.date))}${l.ticket ? ` · ${esc(airline(l.ticket.airline))} · ${l.ticket.transfers ? l.ticket.transfers + " توقف" : "مباشر"}` : ""}${l.month_guide ? " · أرخص سعر بالشهر (اليوم نفسه ما فيه سعر محفوظ)" : ""}</div>
            <div class="small muted">${cl ? `${esc(feel(cl))} ${cl.lo}°–${cl.hi}°` : ""}${v ? ` · <span class="${v.cls}">${esc(v.label)}</span>` : ""}</div></div>
          <div style="text-align:end">${l.ticket ? `<b class="num">${sar(perGroup(l.ticket.price, p))}</b><br><a class="btn btn-ghost btn-sm" href="${esc(l.ticket.link || gFlights(l.from, l.to, l.date))}" target="_blank" rel="noopener">احجز ${ICON.out}</a>` : `<span class="small muted">ما فيه سعر</span><br><a class="btn btn-ghost btn-sm" href="${esc(gFlights(l.from, l.to, l.date))}" target="_blank" rel="noopener">قوقل ${ICON.out}</a>`}</div></div>`; }).join("")}</div>
        <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="m-trip">${ICON.scroll} لملف رحلة</button></div>
      </section>
      ${r.optimized && r.orders.length > 1 ? `<section class="panel panel-pad"><h2 class="sec">الترتيبات الممكنة</h2><div class="tbl-wrap"><table class="rates"><thead><tr><th>الترتيب</th><th>تقدير للبالغ</th></tr></thead><tbody>${r.orders.map((x, i) => `<tr class="${i === 0 ? "best" : ""}"><td>${x.order.map(placeName).map(esc).join(" ← ")}</td><td class="num">${sar(x.estimate)}</td></tr>`).join("")}</tbody></table></div><p class="small muted" style="margin:6px 0 0">التقدير من أرخص سعر بالشهر لكل رحلة، والأسعار فوق للتواريخ نفسها.</p></section>` : ""}
      <p class="small muted">${r.demo ? "أسعار تجريبية. " : "أسعار محفوظة وتقديرية. "}كل رحلة تذكرة لحالها.</p>`;
    $("#m-trip").addEventListener("click", () => addToTrip({ type: "plan", title: `رحلة متعددة: ${r.legs.map(l => placeName(l.to)).join(" ← ")}`, sub: `من ${fmtDay(r.legs[0].date)} · ${r.legs.length} رحلات`, price: total, date: r.legs[0].date }));
  }

  // ================================================================== WHERE TO GO
  const W = { res: null, region: "", weather: "", easyVisa: false };
  D.page("where", root => {
    const pw = S.prefs.where || {}, home = S.settings.home || "RUH", hol = S.prefs.whereWindow;
    root.innerHTML = hero("where", "وين أروح؟") + `
      ${hol ? `<div class="panel panel-pad small">إجازتك: <b>${esc(fmtDayLong(hol.from))} ← ${esc(fmtDayLong(hol.to))}</b> (${diffDays(hol.from, hol.to) + 1} يوم). اخترنا لك شهرها.</div>` : ""}
      <form class="panel framed search-form" id="wform" autocomplete="off">
        <div class="fields">${placeField("w-o", "من", pw.o || { code: home, name: placeName(home) })}
          <div class="field"><label for="w-month">الشهر</label><select class="input" id="w-month">${months12().map(m => `<option value="${m}" ${m === (hol ? hol.from.slice(0, 7) : pw.month || defaultMonth()) ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field"><label for="w-budget">الميزانية للشخص (طيران)</label><input class="input num" type="number" id="w-budget" min="0" step="100" placeholder="مثلاً 2000" value="${pw.budget || ""}"></div>
          <div class="field"><label for="w-type">نوع الرحلة</label><select class="input" id="w-type"><option value="1">ذهاب فقط</option><option value="0" ${pw.rt ? "selected" : ""}>ذهاب وعودة</option></select></div></div>
        <div class="form-actions"><span></span><button class="btn btn-primary" type="submit">وريني الوجهات</button></div>
      </form><div id="w-res"></div>`;
    const form = $("#wform", root);
    bindPlace(form, "w-o");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const o = codeOf($("#w-o")); if (!o) return toast("اختر مدينتك.");
      const month = $("#w-month").value, budget = Number($("#w-budget").value || 0), rt = $("#w-type").value === "0";
      S.prefs.where = { o: { code: o, name: placeName(o) }, month, budget, rt }; save("prefs");
      try {
        const res = await withLoad("القافلة تستكشف الوجهات على طريق البخور…", () => api("flights/anywhere", { origin: o, month, one_way: rt ? 0 : 1 }));
        W.res = { tickets: res.tickets, budget, month, o, demo: res.demo };
        remember("where", `وين أروح من ${placeName(o)} · ${fmtMonth(month)}`, { o, month });
        drawWhere();
      } catch (err) { $("#w-res").innerHTML = errorBox(err); }
    });
    if (W.res) drawWhere();
  });
  function drawWhere() {
    const { tickets, budget, demo, month } = W.res, box = $("#w-res");
    const enrich = t => { const c = cityByIata(t.destination), cc = countryOfCode(t.destination); return { t, c, cc, cl: c ? climateOf(c.id, month) : null, v: visaOf(cc), dc: dailyCost(cc) }; };
    let list = tickets.filter(t => !budget || t.price <= budget).map(enrich);
    if (W.region) list = list.filter(x => (META.regions[W.region] || []).includes(x.cc));
    if (W.weather) list = list.filter(x => x.cl && (W.weather === "cold" ? (x.cl.hi + x.cl.lo) / 2 < 15 : W.weather === "mild" ? ((x.cl.hi + x.cl.lo) / 2 >= 15 && (x.cl.hi + x.cl.lo) / 2 < 28) : W.weather === "hot" ? (x.cl.hi + x.cl.lo) / 2 >= 28 : x.cl.rain < 4));
    if (W.easyVisa) list = list.filter(x => !x.v || x.v.ease === "easy");
    const chips = (name, opts, cur) => `<div class="chip-set">${opts.map(([v, l]) => `<button type="button" class="chip" data-${name}="${esc(v)}" aria-pressed="${cur === v}">${esc(l)}</button>`).join("")}</div>`;
    box.innerHTML = `<section class="panel panel-pad" style="display:grid;gap:10px">
        ${chips("region", [["", "كل الوجهات"], ...Object.keys(META.regions).map(r => [r, r])], W.region)}
        <div class="row" style="align-items:center">${chips("weather", [["", "أي جو"], ["cold", "بارد"], ["mild", "معتدل"], ["hot", "حار"], ["dry", "قليل المطر"]], W.weather)}
          <label class="check"><input type="checkbox" id="w-visa" ${W.easyVisa ? "checked" : ""}> دخول سهل (بدون تأشيرة أو عند الوصول)</label></div>
        <span class="count">${list.length} وجهة${budget ? " ضمن " + sar(budget) : ""} · الجو في ${esc(monthName(month))}</span></section>
      <div class="cards">${list.slice(0, 60).map(({ t, c, cl, v, dc }) => `<article class="panel dcard">
        <h3>${esc(placeName(t.destination))}</h3>
        <div class="meta"><span>${esc(fmtDay((t.departure_at || "").slice(0, 10)))}</span><span>${esc(airline(t.airline))}</span><span>${t.transfers ? t.transfers + " توقف" : "مباشر"}</span></div>
        <div class="price-big">${sar(t.price)}</div><span class="small muted">للشخص${t.return_at ? " · ذهاب وعودة" : ""}</span>
        <div class="meta">${cl ? `<span>${ICON.sun.replace('class="icon"', 'class="icon" style="width:14px;height:14px;vertical-align:-2px"')} ${esc(feel(cl))} ${cl.lo}°–${cl.hi}°</span>` : ""}${v ? `<span class="${v.cls}">${esc(v.label)}${v.sure ? "" : " (تأكد)"}</span>` : ""}${dc ? `<span>مصروف ${sar(dc)}/يوم</span>` : ""}</div>
        <div class="row" style="gap:6px"><a class="btn btn-primary btn-sm" href="${esc(t.link || gFlights(t.origin, t.destination, (t.departure_at || "").slice(0, 10)))}" target="_blank" rel="noopener">الرحلة ${ICON.out}</a>
        ${c ? `<button type="button" class="btn btn-ghost btn-sm" data-goh="${esc(c.id)}" data-day="${esc((t.departure_at || "").slice(0, 10))}">فنادقها</button><button type="button" class="btn btn-ghost btn-sm" data-gotrip="${esc(c.id)}">رحلة كاملة</button>` : ""}</div></article>`).join("") || `<div class="panel empty"><b>ما فيه وجهات بهالشروط</b>خفف الفلاتر أو زِد الميزانية.</div>`}</div>
      <p class="small muted">${demo ? "أسعار تجريبية. " : "أسعار محفوظة من عمليات بحث آخر أيام. "}الجو متوسط ثلاث سنوات، والتأشيرة إرشادية (تحديث ${esc(META.visa.updated)}).</p>`;
    $$("[data-region]", box).forEach(b => b.addEventListener("click", () => { W.region = b.dataset.region; drawWhere(); }));
    $$("[data-weather]", box).forEach(b => b.addEventListener("click", () => { W.weather = b.dataset.weather; drawWhere(); }));
    $("#w-visa").addEventListener("change", e => { W.easyVisa = e.target.checked; drawWhere(); });
    $$("[data-goh]", box).forEach(b => b.addEventListener("click", () => { const d = b.dataset.day >= today() ? b.dataset.day : addDays(today(), 7); S.prefs.hotels = Object.assign({}, S.prefs.hotels, { city: b.dataset.goh, ci: d, co: addDays(d, 3), lm: 0 }); go("#hotels"); }));
    $$("[data-gotrip]", box).forEach(b => b.addEventListener("click", () => { S.prefs.trip = Object.assign({ nights: 5 }, S.prefs.trip, { city: b.dataset.gotrip, months: [month] }); go("#trip"); }));
  }

  // ================================================================== UMRAH
  const U = { res: null, month: null };
  const CROWD = [["خفيفة", "crowd-0"], ["متوسطة", "crowd-1"], ["عالية", "crowd-2"], ["شديدة", "crowd-3"]];
  function crowdOf(day) {
    let level = 0; const why = [];
    for (const s of seasons()) if (day >= s.from && day <= s.to) {
      if (s.kind === "ramadan") { const last10 = day >= addDays(s.to, -9); level = Math.max(level, last10 ? 3 : 2); why.push(last10 ? "العشر الأواخر" : "رمضان"); }
      else if (s.kind === "hajj") { level = 3; why.push("موسم الحج"); }
      else if (s.kind === "holiday") { level = Math.max(level, 2); why.push(s.name); }
      else { level = Math.max(level, 1); why.push(s.name); }
    }
    const wd = new Date(day + "T12:00:00").getDay(); if (wd === 4 || wd === 5) level = Math.max(level, 1);
    return { level, why };
  }
  D.page("umrah", root => {
    const pu = S.prefs.umrah || { makkah: 4, madinah: 3, first: "makkah" };
    const home = S.settings.home || "RUH";
    U.month = U.month || pu.month || defaultMonth();
    root.innerHTML = hero("umrah", "العمرة") + `
      <form class="panel framed search-form" id="uform" autocomplete="off">
        <div class="fields">${placeField("u-o", "من", pu.o || { code: home, name: placeName(home) })}
          <div class="field"><label for="u-month">الشهر</label><select class="input" id="u-month">${months12().map(m => `<option value="${m}" ${m === U.month ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field"><label for="u-mk">ليالي مكة</label><input class="input num" type="number" id="u-mk" min="1" max="20" value="${pu.makkah}"></div>
          <div class="field"><label for="u-md">ليالي المدينة</label><input class="input num" type="number" id="u-md" min="0" max="20" value="${pu.madinah}"></div>
          ${travelersField("u-trav")}
          <div class="field"><span class="lbl">تبدأ بـ</span>${seg("ufirst", [["makkah", "مكة"], ["madinah", "المدينة"]], pu.first)}</div></div>
        <div class="form-actions"><span class="small muted">نختار أيام أرخص وأخف زحمة، ونقارن الوصول على جدة أو المدينة، ونجيب فنادق قريبة من الحرم والمسجد النبوي.</span><button class="btn btn-primary" type="submit">خطط عمرتي</button></div>
      </form><div id="u-cal"></div><div id="u-res"></div>`;
    const form = $("#uform", root);
    bindPlace(form, "u-o"); bindTravelers(form, "u-trav");
    const drawCal = () => {
      const cells = {}, m = $("#u-month").value;
      const days = new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
      for (let d = 1; d <= days; d++) { const k = `${m}-${String(d).padStart(2, "0")}`, c = crowdOf(k); cells[k] = { label: CROWD[c.level][0] }; }
      $("#u-cal").innerHTML = monthCalendar(m, cells, { marker: day => `<span class="season ${CROWD[crowdOf(day).level][1]}" title="${esc(crowdOf(day).why.join("، "))}"></span>`,
        legend: `<div class="legend">${CROWD.map(([l, c]) => `<span><i class="sw ${c}"></i>زحمة ${l}</span>`).join("")}<span>الخميس والجمعة أزحم عادة</span></div>`,
        note: "تقدير الزحمة من المواسم (تعدلها من الإعدادات)، مو من أرقام رسمية. العمرة تتوقف عادة قبل الحج وبعده بفترة، تأكد من «نسك»." });
      $$(".cal-day", $("#u-cal")).forEach(b => b.disabled = true);
    };
    drawCal(); $("#u-month").addEventListener("change", drawCal);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const o = codeOf($("#u-o")); if (!o) return toast("اختر مدينتك.");
      const month = $("#u-month").value, mk = Number($("#u-mk").value || 4), md = Number($("#u-md").value || 0), first = segVal(form, "ufirst");
      S.prefs.umrah = { o: { code: o, name: placeName(o) }, month, makkah: mk, madinah: md, first }; save("prefs"); U.month = month;
      const p = party();
      try {
        const res = await withLoad("القافلة على درب زبيدة… نجهز لك أفضل أيام العمرة", () => api("umrah", { origin: o, month, makkah: mk, madinah: md, first, adults: p.adults, children: p.childAges.join(","), rooms: Math.max(1, Math.ceil(p.beds / 3)) }));
        U.res = Object.assign(res, { o, p, month });
        remember("umrah", `عمرة من ${placeName(o)} · ${fmtMonth(month)}`, { o, month });
        drawUmrah();
      } catch (err) { $("#u-res").innerHTML = errorBox(err); }
    });
    if (U.res) drawUmrah();
  });
  function drawUmrah() {
    const r = U.res, p = r.p, box = $("#u-res");
    if (!r.windows.length) { box.innerHTML = `<div class="panel empty"><b>ما لقينا مواعيد مناسبة</b>جرب شهر ثاني.</div>`; return; }
    const nm = r.nights.makkah, nd = r.nights.madinah;
    const rows = r.windows.map(w => {
      const fl = (w.in ? perGroup(w.in.price, p) : 0) + (w.out ? perGroup(w.out.price, p) : 0);
      const mk = w.makkah ? w.makkah.night * nm * r.rooms : 0, md = w.madinah ? w.madinah.night * nd * r.rooms : 0, tr = (w.train || 0) * p.total;
      return Object.assign(w, { fl, mk, md, tr, total: fl + mk + md + tr });
    });
    const hotelCell = (h, label, n) => h ? `<div><div class="lbl">${label} · ${n} ليالي</div><b>${esc(h.name)}</b><div class="small muted">${Math.round(h.km * 1000)} م عن ${label === "مكة" ? "الحرم" : "المسجد النبوي"} · ${sar(h.night)}/ليلة · ${esc(h.site)}</div></div>` : `<div><div class="lbl">${label}</div><span class="small muted">${n ? "ما لقينا سعر" : "—"}</span></div>`;
    box.innerHTML = `<div class="list">${rows.map((w, i) => `<article class="panel umrah-row">
        <div><div class="trip-rank">${i === 0 ? "أنسب موعد" : "الخيار " + (i + 1)}</div><b>${esc(fmtDay(w.start))} ← ${esc(fmtDay(w.end))}</b>
          <div class="crowd-pill"><i class="${CROWD[w.crowd.level][1]}"></i>زحمة ${CROWD[w.crowd.level][0]}${w.crowd.why.length ? " · " + esc(w.crowd.why.join("، ")) : ""}</div>
          <div class="small muted">${r.no_flights ? "أسعار الطيران تحتاج مفتاح Travelpayouts" : `وصول ${esc(placeName(w.in_airport))} · عودة من ${esc(placeName(w.out_airport))}${w.fl ? " · طيران " + sar(w.fl) : ""}`}</div></div>
        ${hotelCell(w.makkah, "مكة", nm)}${nd ? hotelCell(w.madinah, "المدينة", nd) : "<div></div>"}
        <div class="pricebox"><div class="price-big">${sar(w.total)}</div><div class="price-sub">${nd ? `يشمل قطار الحرمين تقريباً ${sar(w.tr)} · ` : ""}${esc(partyLabel(p))}</div>
          <div class="row" style="gap:6px">${w.in && w.in.link ? `<a class="btn btn-primary btn-sm" href="${esc(w.in.link)}" target="_blank" rel="noopener">الطيران ${ICON.out}</a>` : ""}
          ${w.makkah ? `<a class="btn btn-ghost btn-sm" href="${esc(gMaps(w.makkah.name, "Makkah"))}" target="_blank" rel="noopener">فندق مكة ${ICON.out}</a>` : ""}
          <button type="button" class="btn btn-ghost btn-sm" data-uadd="${i}">${ICON.scroll} لملف رحلة</button></div></div></article>`).join("")}</div>
      <p class="small muted">${r.demo ? "أسعار تجريبية. " : ""}الفنادق: أرخص سعر من أعلى الفنادق تقييماً ضمن ١٫٥ كم. قطار الحرمين ${sar(160)} للشخص تقريباً (سياحي، اتجاه واحد). احجز تصريح العمرة من تطبيق «نسك».</p>`;
    $$("[data-uadd]", box).forEach(b => b.addEventListener("click", () => {
      const w = rows[Number(b.dataset.uadd)];
      addToTrip({ type: "plan", title: `عمرة: ${fmtDay(w.start)} ← ${fmtDay(w.end)}`, sub: [w.makkah && w.makkah.name, w.madinah && w.madinah.name].filter(Boolean).join(" · "), price: w.total, date: w.start, city: "g293993" });
    }));
  }

  // ================================================================== HOLIDAYS (leave planner)
  D.page("holidays", root => {
    const ph = S.prefs.holidays || { sector: "private", leave: 2 };
    root.innerHTML = hero("holidays", "الإجازات") + `
      <section class="panel framed search-form">
        <div class="row" style="align-items:center;gap:16px"><div class="field"><span class="lbl">وين تشتغل؟</span>${seg("hsec", [["private", "قطاع خاص"], ["government", "حكومي أو مدارس"]], ph.sector)}</div>
          <div class="field"><label for="hl-leave">أقصى أيام إجازة تبي تاخذها</label><select class="input" id="hl-leave">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === ph.leave ? "selected" : ""}>${n === 0 ? "بدون إجازة" : n + " " + (n === 1 ? "يوم" : n === 2 ? "يومين" : "أيام")}</option>`).join("")}</select></div></div>
        <p class="small muted" style="margin:0">العطلة الأسبوعية الجمعة والسبت. مواعيد الأعياد تقريبية حسب رؤية الهلال، وإجازة الحكومي والمدارس تقريبية بعد.</p>
      </section><div id="hl-res" class="list"></div>`;
    const draw = () => {
      const sector = segVal(root, "hsec"), leave = Number($("#hl-leave").value);
      S.prefs.holidays = { sector, leave }; save("prefs");
      const bridges = planBridges((S.holidays && S.holidays[sector]) || META.holidays[sector], leave);
      $("#hl-res").innerHTML = bridges.map(b => `<article class="panel bridge">
        <div class="bridge-days"><b>${b.length}</b><span class="small muted">يوم سفر</span></div>
        <div><b style="font:700 22px var(--f-display)">${esc(b.name)}</b><div>${esc(fmtDayLong(b.from))} ← ${esc(fmtDayLong(b.to))}</div>
          <div class="small ${b.leave ? "" : "stops-0"}">${b.leave ? `خذ ${b.leave} ${b.leave === 1 ? "يوم" : b.leave === 2 ? "يومين" : "أيام"} إجازة: ${b.leaveDays.map(fmtDay).map(esc).join("، ")}` : "بدون ما تاخذ ولا يوم إجازة"}</div>
          <div class="bridge-strip" aria-hidden="true">${b.days.map(d => `<i class="${d.type}" title="${esc(fmtDay(d.day))}">${new Date(d.day + "T12:00:00").getDate()}</i>`).join("")}</div></div>
        <div class="row" style="gap:6px;flex-direction:column;align-items:stretch"><button type="button" class="btn btn-primary btn-sm" data-hwhere="${b.from}|${b.to}">وين أروح؟</button><button type="button" class="btn btn-ghost btn-sm" data-htrip="${b.from}|${b.to}">رحلة كاملة</button></div>
      </article>`).join("") + `<div class="legend"><span><i class="sw" style="background:var(--cheap-bg)"></i>عطلة أسبوعية</span><span><i class="sw" style="background:var(--gold)"></i>إجازة رسمية</span><span><i class="sw" style="background:#0d1030;border:1px solid #84641c"></i>يوم تاخذه إجازة</span></div>`;
      $$("[data-hwhere]").forEach(b => b.addEventListener("click", () => { const [from, to] = b.dataset.hwhere.split("|"); S.prefs.whereWindow = { from, to }; go("#where"); }));
      $$("[data-htrip]").forEach(b => b.addEventListener("click", () => { const [from, to] = b.dataset.htrip.split("|"); S.prefs.trip = Object.assign({}, S.prefs.trip, { nights: Math.max(1, diffDays(from, to)), months: [from.slice(0, 7)] }); if (!S.prefs.trip.city) S.prefs.trip.city = "g293974"; go("#trip"); }));
    };
    bindSeg(root, "hsec", draw); $("#hl-leave").addEventListener("change", draw);
    draw();
  });
  D.planBridges = planBridges;
  function planBridges(holidays, maxLeave) {
    const hol = new Set(); const t = today();
    for (const h of holidays) for (let d = h.from; d <= h.to; d = addDays(d, 1)) hol.add(d);
    const isWeekend = d => { const w = new Date(d + "T12:00:00").getDay(); return w === 5 || w === 6; };
    const off = d => hol.has(d) || isWeekend(d);
    const out = [];
    for (const h of holidays) {
      if (h.to < t) continue;
      let best = null;
      for (let s = addDays(h.from, -9); s <= h.from; s = addDays(s, 1)) {
        for (let e = h.to; e <= addDays(h.to, 9); e = addDays(e, 1)) {
          if (s < t || diffDays(s, e) > 20) continue;
          const days = []; let leave = 0;
          for (let d = s; d <= e; d = addDays(d, 1)) { const o = off(d); if (!o) leave++; days.push({ day: d, type: hol.has(d) ? "hol" : isWeekend(d) ? "off" : "leave" }); }
          if (leave > maxLeave) continue;
          const len = days.length, score = len - leave * 0.6;
          if (!best || score > best.score || (score === best.score && leave < best.leave)) best = { name: h.name, from: s, to: e, length: len, leave, days, score, leaveDays: days.filter(d => d.type === "leave").map(d => d.day) };
        }
      }
      if (best && !out.some(b => b.from === best.from && b.to === best.to)) out.push(best);
    }
    return out.sort((a, b) => a.from < b.from ? -1 : 1);
  }
})();
