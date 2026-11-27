/* Duroob — plan hub, "my budget" trips, best time to visit. */
(function () {
  "use strict";
  const { META, X, S, ICON, $, $$, esc, sar, addDays, today, fmtDay, fmtDayLong, fmtMonth, monthName, airline, months12, defaultMonth,
    api, save, withLoad, toast, errorBox, hero, party, partyLabel, travelersField, bindTravelers, placeField, bindPlace, codeOf, placeName,
    cityField, bindCity, climateOf, feel, visaOf, dailyCost, seasons, addToTrip, gFlights, gMaps, perGroup, remember } = window.D;

  // ================================================================== PLAN HUB
  D.page("plan", root => {
    const tools = [
      ["#trip", ICON.wallet, tx("رحلة كاملة"), tx("طيران وفندق ومصروف لكل فترة، مرتبة بالمجموع")],
      ["#budget", ICON.wallet, tx("ميزانيتي"), tx("قل كم معك، ونطلع لك رحلات كاملة داخلها")],
      ["#where", ICON.route, tx("وين أروح؟"), tx("أرخص الوجهات من مدينتك حسب الجو والتأشيرة")],
      ["#best", ICON.sun, tx("أفضل وقت للسفر"), tx("أي شهر أحلى جو وأرخص سعر لوجهتك")],
      ["#multi", ICON.route, tx("متعددة المدن"), tx("أكثر من مدينة بأرخص ترتيب")],
      ["#umrah", ICON.kaaba, tx("العمرة"), tx("أيام أخف زحمة وفنادق قريبة من الحرم")],
      ["#holidays", ICON.moon, tx("الإجازات"), tx("أطول رحلة بأقل أيام إجازة")]
    ];
    root.innerHTML = hero("trip", tx("خطّط")) + `<div class="hub">${tools.map(([h, ic, t, sub]) => `<a class="panel" href="${h}"><span class="h-icon">${ic}</span><b>${t}</b><span class="small">${sub}</span></a>`).join("")}</div>`;
  });

  // ================================================================== MY BUDGET
  const B = { res: null };
  D.page("budget", root => {
    const pb = S.prefs.budget || { nights: 5 };
    const home = S.settings.home || "RUH";
    root.innerHTML = hero("where", tx("ميزانيتي"), "", ["#plan", tx("خطّط")]) + `
      <form class="panel search-form" id="bform" autocomplete="off">
        <div class="fields">
          <div class="field"><label for="b-amt">${tx("كم ميزانيتك للرحلة كاملة؟")} (${I18N.curSym()})</label><input class="input num" type="number" id="b-amt" min="0" step="500" value="${pb.amount ? Math.round(I18N.fromSAR(pb.amount)) : ""}" placeholder="${tx("مثلاً 8000")}"></div>
          ${placeField("b-o", tx("من"), pb.o || { code: home, name: placeName(home) })}
          <div class="field"><label for="b-month">${tx("الشهر")}</label><select class="input" id="b-month">${months12().map(m => `<option value="${m}" ${m === (pb.month || defaultMonth()) ? "selected" : ""}>${esc(fmtMonth(m))}</option>`).join("")}</select></div>
          <div class="field"><label for="b-n">${tx("كم ليلة")}</label><input class="input num" type="number" id="b-n" min="1" max="30" value="${pb.nights}"></div>
          ${travelersField("b-trav")}
        </div>
        <div class="form-actions"><span class="small muted">${tx("نحسب الطيران ذهاب وعودة، وأرخص فندق من أشهر الفنادق، والمصروف اليومي.")}</span><button class="btn btn-primary" type="submit">${tx("وريني وش أقدر")}</button></div>
      </form><div id="b-res"></div>`;
    const form = $("#bform", root);
    bindPlace(form, "b-o"); bindTravelers(form, "b-trav");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const amount = Math.round(I18N.toSAR(Number($("#b-amt").value || 0))), o = codeOf($("#b-o")), month = $("#b-month").value, nights = Number($("#b-n").value || 5);
      if (!amount) return toast(tx("اكتب ميزانيتك."));
      if (!o) return toast(tx("اختر مدينتك."));
      S.prefs.budget = { amount, o: { code: o, name: placeName(o) }, month, nights }; save("prefs");
      const p = party();
      try {
        const res = await withLoad(tx("القافلة تحسب وش تقدر توصل بميزانيتك…"), () => api("budget", { origin: o, month, nights, adults: p.adults, children: p.childAges.join(","), rooms: Math.max(1, Math.ceil(p.beds / 3)) }));
        B.res = { options: res.options || [], amount, p, demo: res.demo };
        remember("budget", `${tx("ميزانيتي")} ${sar(amount)} · ${fmtMonth(month)}`, { o, month });
        draw();
      } catch (err) { $("#b-res").innerHTML = errorBox(err); }
    });
    setTimeout(() => { if (D.takeAutoRun("budget")) form.requestSubmit(); }, 0);
    if (B.res) draw();
  });
  function draw() {
    const { options, amount, p, demo } = B.res, box = $("#b-res");
    const rows = options.map(x => {
      const c = X.cities.find(y => y.id === x.city), fl = perGroup(x.flight.price, p), ht = x.hotel.night * x.nights * x.rooms, sp = (dailyCost(c.country) || 0) * x.nights * p.total;
      return Object.assign(x, { c, fl, ht, sp, total: fl + ht + sp });
    }).sort((a, b) => a.total - b.total);
    const inside = rows.filter(r => r.total <= amount), over = rows.filter(r => r.total > amount).slice(0, 3);
    const card = r => `<article class="panel dcard">
        ${r.hotel.image ? `<div class="himg" style="aspect-ratio:16/9"><img src="${esc(r.hotel.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sadu-ph');this.remove()"></div>` : ""}
        <h3>${esc(L(r.c))}</h3><div class="meta"><span>${esc(fmtDay(r.depart))} – ${esc(fmtDay(r.return))}</span><span>${P(r.nights, "night")}</span></div>
        <div class="price-big">${sar(r.total)}</div>
        <span class="small ${r.total <= amount ? "stops-0" : "stops-2"}">${r.total <= amount ? tx("يبقى لك") + " " + sar(amount - r.total) : tx("يزيد عن ميزانيتك") + " " + sar(r.total - amount)}</span>
        <div class="small muted">${tx("طيران")} ${sar(r.fl)} · ${tx("فندق")} ${sar(r.ht)} · ${tx("مصروف")} ${sar(r.sp)}</div>
        <div class="small muted">${esc(r.hotel.name)} · ${esc(airline(r.flight.airline))}</div>
        <div class="row" style="gap:6px"><a class="btn btn-primary btn-sm" href="${esc(r.flight.link || gFlights(r.flight.origin, r.flight.destination, r.depart, r.return))}" target="_blank" rel="noopener">${tx("الطيران")} ${ICON.out}</a>
          <a class="btn btn-ghost btn-sm" href="${esc(gMaps(r.hotel.name, r.c.en))}" target="_blank" rel="noopener">${tx("الفندق")} ${ICON.out}</a>
          <button type="button" class="btn btn-ghost btn-sm" data-badd="${rows.indexOf(r)}">${ICON.scroll}</button></div></article>`;
    box.innerHTML = `${inside.length ? `<h2 class="sec">${tx("داخل ميزانيتك")} (${sar(amount)})</h2><div class="cards">${inside.map(card).join("")}</div>` : `<div class="panel empty"><b>${tx("ما لقينا رحلة كاملة داخل الميزانية")}</b>${tx("جرب ليالي أقل أو شهر ثاني، أو شوف أقرب الخيارات تحت.")}</div>`}
      ${over.length ? `<h2 class="sec" style="margin-top:12px">${tx("أقرب الخيارات فوق الميزانية")}</h2><div class="cards">${over.map(card).join("")}</div>` : ""}
      <p class="small muted">${demo ? tx("أسعار تجريبية. ") : ""}${options.some(x => x.flight && x.flight.source === "Google Flights") ? tx("الطيران من قوقل فلايتس، والفندق أرخص سعر من أشهر ستة فنادق، والمصروف تقديري. أسعار الأطفال تقديرية.") : tx("الطيران من أسعار محفوظة، والفندق أرخص سعر من أشهر ستة فنادق، والمصروف تقديري. أسعار الأطفال تقديرية.")}</p>`;
    $$("[data-badd]", box).forEach(b => b.addEventListener("click", () => {
      const r = rows[Number(b.dataset.badd)];
      addToTrip({ type: "plan", title: `${L(r.c)}: ${fmtDay(r.depart)} – ${fmtDay(r.return)}`, sub: `${tx("طيران")} ${sar(r.fl)} · ${r.hotel.name} ${sar(r.ht)}`, price: r.total, link: r.flight.link, date: r.depart, city: r.c.id });
    }));
  }

  // ================================================================== BEST TIME TO VISIT
  const BT = { res: null };
  D.page("best", root => {
    const pb = S.prefs.best || { city: "g294195" };
    const home = S.settings.home || "RUH";
    root.innerHTML = hero("where", tx("أفضل وقت للسفر"), "", ["#plan", tx("خطّط")]) + `
      <form class="panel search-form" id="btform" autocomplete="off">
        <div class="fields">${cityField("bt-city", tx("الوجهة"), pb.city)}${placeField("bt-o", tx("من"), pb.o || { code: home, name: placeName(home) })}</div>
        <div class="form-actions"><span class="small muted">${tx("نجمع الجو وسعر الطيران وسعر الفندق والمواسم لكل شهر في السنة الجاية.")}</span><button class="btn btn-primary" type="submit">${tx("وش أفضل شهر؟")}</button></div>
      </form><div id="bt-res"></div>`;
    const form = $("#btform", root);
    bindCity(form, "bt-city"); bindPlace(form, "bt-o");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const c = X.cities.find(x => x.id === $("#bt-city").dataset.city), o = codeOf($("#bt-o"));
      if (!c || !o) return toast(tx("اختر الوجهة ومدينتك."));
      S.prefs.best = { city: c.id, o: { code: o, name: placeName(o) } }; save("prefs");
      try {
        const [fl, ht] = await withLoad(tx("القافلة تمر على أشهر السنة وتقارن الجو والأسعار…"), () => Promise.all([
          api("flights/calendar", { origin: o, destination: c.iata, year: 1, one_way: 0, nights: 5 }).catch(() => ({ months: {} })),
          api("hotels/calendar", { city: c.id, year: 1 }).catch(() => ({ months: {} }))]));
        BT.res = { c, fl: fl.months || {}, ht: ht.months || {}, demo: fl.demo || ht.demo };
        remember("best", `${tx("أفضل وقت")}: ${L(c)}`, { city: c.id });
        drawBest();
      } catch (err) { $("#bt-res").innerHTML = errorBox(err); }
    });
    setTimeout(() => { if (D.takeAutoRun("best")) form.requestSubmit(); }, 0);
    if (BT.res) drawBest();
  });
  function drawBest() {
    const { c, fl, ht, demo } = BT.res, box = $("#bt-res"), ms = months12();
    const flP = ms.map(m => fl[m] && fl[m].price).filter(Boolean), htP = ms.map(m => ht[m] && ht[m].price).filter(Boolean);
    const norm = (v, arr) => v == null || !arr.length ? 0.5 : (Math.max(...arr) - v) / Math.max(1, Math.max(...arr) - Math.min(...arr));
    const holy = c.id === "g293993" || c.id === "g298551";
    const rows = ms.map(m => {
      const cl = climateOf(c.id, m), avg = cl ? (cl.hi + cl.lo) / 2 : 24;
      const weather = cl ? Math.max(0, 1 - Math.abs(avg - 24) / 14) - Math.min(0.4, cl.rain / 25) : 0.5;
      const ss = seasons().filter(s => s.from.slice(0, 7) <= m && s.to.slice(0, 7) >= m);
      const crowd = ss.some(s => s.kind === "hajj" || (holy && s.kind === "ramadan")) ? 1 : ss.some(s => s.kind === "holiday" || s.kind === "high") ? 0.5 : 0;
      const price = (norm(fl[m] && fl[m].price, flP) + norm(ht[m] && ht[m].price, htP)) / 2;
      const score = Math.round((0.4 * weather + 0.45 * price + 0.15 * (1 - crowd)) * 100);
      return { m, cl, ss, fl: fl[m] && fl[m].price, ht: ht[m] && ht[m].price, score };
    });
    const top = rows.slice().sort((a, b) => b.score - a.score).slice(0, 3).map(r => r.m), best = rows.find(r => r.m === top[0]);
    const max = Math.max(...rows.map(r => r.score), 1);
    box.innerHTML = `<section class="panel panel-pad" style="display:grid;gap:12px">
        <h2 class="sec" style="margin:0">${tx("أفضل شهر لـ")}${esc(L(c))}: ${esc(monthName(best.m))}</h2>
        <p style="margin:0">${best.cl ? `${esc(feel(best.cl))} ${best.cl.lo}°–${best.cl.hi}°` : ""}${best.fl ? ` · ${tx("طيران من")} ${sar(best.fl)}` : ""}${best.ht ? ` · ${tx("الفندق حوالي")} ${sar(best.ht)} ${tx("لليلة")}` : ""}</p>
        <div class="best-bars">${rows.map(r => `<div class="bb ${top.includes(r.m) ? "top" : ""}" title="${esc(fmtMonth(r.m))}: ${r.score}"><i style="height:${Math.round(r.score / max * 150)}px"></i><span>${esc(monthName(r.m).slice(0, I18N.RTL ? 5 : 3))}</span></div>`).join("")}</div>
      </section>
      <div class="panel tbl-wrap"><table class="rates"><thead><tr><th>${tx("الشهر")}</th><th>${tx("الجو")}</th><th>${tx("الطيران (ذهاب وعودة)")}</th><th>${tx("الفندق لليلة")}</th><th>${tx("ملاحظة")}</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="${top.includes(r.m) ? "best" : ""}"><td>${esc(fmtMonth(r.m))}</td><td>${r.cl ? `${esc(feel(r.cl))} ${r.cl.lo}°–${r.cl.hi}°` : "—"}</td><td class="num">${r.fl ? sar(r.fl) : "—"}</td><td class="num">${r.ht ? sar(r.ht) : "—"}</td><td class="small">${esc(r.ss.map(s => s.name).join(tx("، ")))}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="small muted">${demo ? tx("أسعار تجريبية. ") : ""}${tx("التقييم: الجو ٤٠٪، السعر ٤٥٪، الزحمة والمواسم ١٥٪. الجو متوسط ثلاث سنوات.")}</p>`;
  }
})();
