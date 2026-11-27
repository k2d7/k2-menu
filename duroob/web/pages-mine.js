/* Duroob — home, trip files (with expense splitting), watches, settings. Starts the app. */
(function () {
  "use strict";
  const { META, X, S, ICON, $, $$, esc, sar, addDays, today, fmtDay, fmtDayLong, fmtMonth, uid, api, save, withLoad, toast, openDrawer, closeDrawer,
    seg, bindSeg, hero, party, partyLabel, placeName, seasons, baggage, airline, applySeasons, applyTheme, autoCheckWatches, VERDICT, sparkline, waLink, go } = window.D;

  // ================================================================== HOME (المجلس)
  const LORE = [
    [tx("درب زبيدة"), tx("طريق الحجاج من الكوفة إلى مكة، نحو ١٤٠٠ كم، عمّرت فيه زبيدة زوجة هارون الرشيد برك الماء والمنازل للحجاج.")],
    [tx("طريق البخور"), tx("كان ينقل اللبان والمرّ من جنوب الجزيرة العربية إلى الشام ومصر، ومن محطاته نجران والحِجر في العلا.")],
    [tx("درب الحاج الشامي"), tx("طريق الحجاج من دمشق إلى المدينة ومكة، ويمر بتبوك والعلا.")],
    [tx("طريق الحرير"), tx("شبكة طرق تجارية ربطت الصين بالشرق الأوسط وأوروبا أكثر من ألف سنة.")],
    [tx("نجوم الدليل"), tx("كان الدليل يهتدي بالجدي في الشمال وسهيل في الجنوب، ويعرف بها الطريق في الليل.")],
    [tx("السدو"), tx("نسيج بدوي تقليدي بألوانه الحمراء والسوداء، مسجّل في قائمة اليونسكو للتراث غير المادي عام ٢٠٢٠.")]
  ];
  D.page("home", root => {
    const h = new Date().getHours(), greet = h < 12 ? tx("صباح الخير") : tx("مساء الخير");
    const lore = LORE[new Date().getDate() % LORE.length];
    const ph = S.prefs.holidays || { sector: "private", leave: 2 };
    const bridge = (D.planBridges((S.holidays && S.holidays[ph.sector]) || META.holidays[ph.sector], ph.leave) || [])[0];
    const watches = (S.watches || []).slice(0, 3);
    root.innerHTML = `
      <section class="sky-hero" aria-label="${tx("دروب")}">
        <div class="stars-bg"></div><div class="moon"></div>
        <div class="greet">${greet}${tx("، ")}${tx("يا مسافر")}</div>
        <h1>${tx("وين وجهتك الجاية؟")}</h1>
        <p>${esc(META.lore.home[1])}</p>
        <svg class="scene" viewBox="0 0 1200 160" preserveAspectRatio="xMinYMax slice" aria-hidden="true">
          <path class="sc-d1" d="M0 96 C180 56 330 64 520 90 S860 124 1200 74 L1200 160 L0 160Z"/>
          <path class="trail" d="M60 104 C240 78 420 84 600 96 S920 110 1140 84" style="animation-duration:3s"/>
          <g class="sc-camel"><use href="#s-camel" x="150" y="54" width="60" height="45"/><use href="#s-camel" x="206" y="60" width="52" height="39"/><use href="#s-camel" x="254" y="66" width="46" height="35"/></g>
          <path class="sc-d2" d="M0 126 C220 100 400 110 640 124 S1000 142 1200 116 L1200 160 L0 160Z"/>
        </svg>
      </section>
      <div class="quick">
        ${[["#flights", ICON.plane, tx("الطيران"), tx("أرخص الأيام والطرق")], ["#hotels", ICON.bed, tx("الفنادق"), tx("قارن مواقع الحجز")], ["#umrah", ICON.kaaba, tx("العمرة"), tx("أيام أخف وفنادق قريبة")],
          ["#where", ICON.route, tx("وين أروح؟"), tx("حسب ميزانيتك وجوّك")], ["#trip", ICON.wallet, tx("رحلة كاملة"), tx("طيران وفندق ومصروف")], ["#holidays", ICON.moon, tx("الإجازات"), tx("أطول رحلة بأقل إجازة")]]
          .map(([href, icon, t, sub]) => `<a class="panel" href="${href}">${icon.replace('class="icon"', 'class="icon q-icon"')}<span class="q-title">${t}</span><span class="q-sub">${sub}</span></a>`).join("")}
      </div>
      <div class="home-grid">
        <div style="display:grid;gap:16px">
          ${bridge ? `<section class="panel panel-pad framed" style="display:grid;gap:8px"><span class="eyebrow">${tx("أقرب فرصة سفر")}</span>
            <h2 class="sec" style="margin:0">${esc(bridge.name)}: ${P(bridge.length, "day")}</h2>
            <p style="margin:0">${esc(fmtDayLong(bridge.from))} – ${esc(fmtDayLong(bridge.to))}${bridge.leave ? ` · ${tx("تاخذ")} ${P(bridge.leave, "day")} ${tx("إجازة")}` : tx(" · بدون إجازة")}</p>
            <div class="row"><button type="button" class="btn btn-primary btn-sm" id="home-where">${tx("وين أروح فيها؟")}</button><a class="btn btn-ghost btn-sm" href="#holidays">${tx("كل الإجازات")}</a></div></section>` : ""}
          <section class="panel panel-pad" style="display:grid;gap:8px"><div class="file-head"><h2 class="sec" style="margin:0">${tx("عين الدليل")}</h2><a class="btn btn-ghost btn-sm" href="#watch">${tx("كل المتابعات")}</a></div>
            ${watches.length ? watches.map(w => `<div class="settle-row"><span>${esc(w.label)}</span><b class="num">${sar(w.last)}</b></div>`).join("") : `<p class="muted" style="margin:0">${tx("ما تراقب شي للحين. اضغط «راقب» على أي رحلة أو فندق، ونعلمك إذا نزل سعره.")}</p>`}</section>
        </div>
        <div style="display:grid;gap:16px">
          <section class="panel lore-card"><span class="eyebrow">${tx("من دروب التاريخ")}</span><blockquote>${esc(lore[1])}</blockquote><cite>${esc(lore[0])}</cite></section>
          <section class="panel panel-pad" style="display:grid;gap:8px"><h2 class="sec" style="margin:0">${tx("مصادر الأسعار")}</h2>
            <div class="settle-row"><span><span class="status-dot ${X.mode === "live" ? "on" : ""}"></span> ${tx("الفنادق (Xotelo)")}</span><span class="small muted">${X.mode === "live" ? tx("شغال") : tx("تجريبي")}</span></div>
            <div class="settle-row"><span><span class="status-dot ${S.settings.has_tp ? "on" : ""}"></span> ${tx("الطيران (Travelpayouts)")}</span><span class="small muted">${S.settings.has_tp ? tx("شغال") : tx("يحتاج مفتاح")}</span></div>
            <div class="settle-row"><span><span class="status-dot ${S.settings.has_serp ? "on" : ""}"></span> ${tx("قوقل (SerpApi، اختياري)")}</span><span class="small muted">${S.settings.has_serp ? tx("شغال") : tx("غير مفعّل")}</span></div>
            <div class="settle-row"><span><span class="status-dot ${S.settings.alerts_on ? "on" : ""}"></span> ${tx("تنبيهات الجوال")}</span><span class="small muted">${S.settings.alerts_on ? tx("مفعّلة") : tx("غير مفعّلة")}</span></div>
            <a class="btn btn-ghost btn-sm" href="#setup" style="justify-self:start">${tx("الإعدادات")}</a></section>
        </div>
      </div>`;
    const hw = $("#home-where"); hw && hw.addEventListener("click", () => { S.prefs.whereWindow = { from: bridge.from, to: bridge.to }; go("#where"); });
  });

  // ================================================================== TRIP FILES + EXPENSES
  let openId = null;
  D.page("trips", root => {
    const t = (S.trips || []).find(x => x.id === openId);
    if (t) return drawTripFile(root, t);
    root.innerHTML = hero("trips", tx("ملفات الرحلات")) + `
      <section class="panel framed search-form"><div class="row"><div class="field grow"><label for="tf-name">${tx("ملف رحلة جديد")}</label><input class="input" id="tf-name" placeholder="${tx("مثلاً: صيف إسطنبول مع العائلة")}"></div><button type="button" class="btn btn-primary" id="tf-add">${tx("أنشئ الملف")}</button></div>
        <p class="small muted" style="margin:0">${tx("من أي رحلة أو فندق أو خطة، اضغط «لملف رحلة» وينضاف هنا. وفي كل ملف تقدر تقسم المصاريف على المسافرين.")}</p></section>
      <div class="cards">${(S.trips || []).map(t => {
        const total = t.items.reduce((s, i) => s + (i.price || 0), 0) + (t.expenses || []).reduce((s, e) => s + (e.fromItem ? 0 : e.amount), 0);
        return `<article class="panel dcard"><span class="small muted">${P(t.items.length, "item")} · ${P((t.members || []).length, "traveler")}</span><h3>${esc(t.name)}</h3><div class="price-big">${sar(total)}</div>
          <div class="row" style="gap:6px"><button type="button" class="btn btn-primary btn-sm" data-open="${t.id}">${tx("افتح الملف")}</button></div></article>`; }).join("") || `<div class="panel empty"><b>${tx("ما عندك ملفات للحين")}</b>${tx("أنشئ ملف، أو أضف له من صفحات البحث.")}</div>`}</div>`;
    $("#tf-add").addEventListener("click", async () => {
      const name = $("#tf-name").value.trim() || tx("رحلتي");
      const tr = { id: uid(), name, created: Date.now(), items: [], members: party().names, expenses: [] };
      S.trips = [tr].concat(S.trips || []); await save("trips"); openId = tr.id; go("#trips");
    });
    $$("[data-open]", root).forEach(b => b.addEventListener("click", () => { openId = b.dataset.open; go("#trips"); }));
  });
  const ITEM_ICON = { flight: ICON.plane, hotel: ICON.bed, plan: ICON.route, note: ICON.note };
  function settle(t) {
    const bal = Object.fromEntries((t.members || []).map(m => [m, 0]));
    for (const e of t.expenses || []) {
      const who = (e.split && e.split.length ? e.split : t.members) || [];
      if (!who.length) continue;
      const share = e.amount / who.length;
      bal[e.paidBy] = (bal[e.paidBy] || 0) + e.amount;
      for (const m of who) bal[m] = (bal[m] || 0) - share;
    }
    const pos = Object.entries(bal).filter(([, v]) => v > 0.5).map(([m, v]) => [m, v]).sort((a, b) => b[1] - a[1]);
    const neg = Object.entries(bal).filter(([, v]) => v < -0.5).map(([m, v]) => [m, -v]).sort((a, b) => b[1] - a[1]);
    const moves = [];
    let i = 0, j = 0;
    while (i < neg.length && j < pos.length) {
      const amt = Math.min(neg[i][1], pos[j][1]);
      moves.push({ from: neg[i][0], to: pos[j][0], amount: Math.round(amt) });
      neg[i][1] -= amt; pos[j][1] -= amt;
      if (neg[i][1] < 0.5) i++; if (pos[j][1] < 0.5) j++;
    }
    return { bal, moves };
  }
  function drawTripFile(root, t) {
    t.members = t.members && t.members.length ? t.members : party().names; t.expenses = t.expenses || [];
    const itemsTotal = t.items.reduce((s, i) => s + (i.price || 0), 0), spent = t.expenses.reduce((s, e) => s + e.amount, 0);
    const { bal, moves } = settle(t);
    root.innerHTML = `<header class="hero"><svg class="orn" aria-hidden="true"><use href="#s-khatam"/></svg><span class="eyebrow">${tx("تحفة النظار")}</span><h1>${esc(t.name)}</h1>
        <div class="hero-actions"><button type="button" class="btn btn-ghost btn-sm" id="tf-back">‹ ${tx("كل الملفات")}</button><a class="btn btn-ghost btn-sm" id="tf-share" target="_blank" rel="noopener">${ICON.share} ${tx("شارك بالواتساب")}</a><button type="button" class="btn btn-ghost btn-sm" id="tf-del">${tx("احذف الملف")}</button></div></header>
      <section class="panel panel-pad" style="display:grid;gap:10px"><div class="file-head"><h2 class="sec" style="margin:0">${tx("محتوى الرحلة")}</h2><b class="num">${sar(itemsTotal)}</b></div>
        <div class="file-items">${t.items.map(i => `<div class="file-item"><span class="k">${ITEM_ICON[i.type] || ICON.note}</span><span style="min-width:0"><b>${esc(i.title)}</b><br><span class="small muted">${esc(i.sub || "")}</span></span>
          <span style="text-align:end">${i.price ? `<b class="num">${sar(i.price)}</b><br>` : ""}${i.link ? `<a class="small" href="${esc(i.link)}" target="_blank" rel="noopener">${tx("افتح")}</a> · ` : ""}<button type="button" class="btn-link small" data-idel="${i.id}" style="background:none;border:0;color:var(--high);cursor:pointer;padding:0">${tx("شيل")}</button></span></div>`).join("") || `<p class="muted" style="margin:0">${tx("فاضي. أضف من صفحات البحث بزر «لملف رحلة».")}</p>`}</div>
        <div class="row"><div class="field grow"><label for="tf-note">${tx("ملاحظة")}</label><input class="input" id="tf-note" placeholder="${tx("مثلاً: نبي فندق فيه مسبح للعيال")}"></div><button type="button" class="btn btn-ghost" id="tf-addnote">${tx("أضف")}</button></div></section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><div class="file-head"><h2 class="sec" style="margin:0">${tx("تقسيم المصاريف")}</h2><span class="muted">${tx("المصروف")} ${sar(spent)}</span></div>
        <div class="field"><label for="tf-members">${tx("المسافرون (افصل بينهم بفاصلة)")}</label><input class="input" id="tf-members" value="${esc(t.members.join(tx("، ")))}"></div>
        <div class="fields"><div class="field"><label for="ex-title">${tx("المصروف")}</label><input class="input" id="ex-title" placeholder="${tx("مثلاً: الفندق")}"></div>
          <div class="field"><label for="ex-amount">${tx("المبلغ")} (${I18N.curSym()})</label><input class="input num" type="number" id="ex-amount" min="0"></div>
          <div class="field"><label for="ex-by">${tx("دفعه")}</label><select class="input" id="ex-by">${t.members.map(m => `<option>${esc(m)}</option>`).join("")}</select></div></div>
        <div class="field"><span class="lbl">${tx("على مين؟")}</span><div class="chip-set" id="ex-split">${t.members.map(m => `<button type="button" class="chip" data-m="${esc(m)}" aria-pressed="true">${esc(m)}</button>`).join("")}</div></div>
        <div class="row"><button type="button" class="btn btn-primary" id="ex-add">${tx("أضف المصروف")}</button>${t.items.some(i => i.price) ? `<button type="button" class="btn btn-ghost" id="ex-items">${tx("حوّل عناصر الرحلة لمصاريف")}</button>` : ""}</div>
        ${t.expenses.length ? `<div class="tbl-wrap"><table class="rates"><thead><tr><th>${tx("المصروف")}</th><th>${tx("دفعه")}</th><th>${tx("على")}</th><th>${tx("المبلغ")}</th><th></th></tr></thead><tbody>${t.expenses.map(e => `<tr><td>${esc(e.title)}</td><td>${esc(e.paidBy)}</td><td class="small">${esc((e.split && e.split.length ? e.split : t.members).join(tx("، ")))}</td><td class="num">${sar(e.amount)}</td><td><button type="button" class="icon-btn" data-edel="${e.id}" aria-label="${tx("حذف")}">✕</button></td></tr>`).join("")}</tbody></table></div>` : ""}
        ${t.expenses.length ? `<h3 class="sub">${tx("التسوية")}</h3><div class="settle">${moves.length ? moves.map(m => `<div class="settle-row"><span><b>${esc(m.from)}</b> ${tx("يحوّل لـ")} <b>${esc(m.to)}</b></span><b class="num">${sar(m.amount)}</b></div>`).join("") : `<p class="muted" style="margin:0">${tx("كل واحد دفع حصته بالضبط.")}</p>`}</div>
          <p class="small muted" style="margin:0">${Object.entries(bal).map(([m, v]) => `${esc(m)}: ${v >= 0 ? tx("له") : tx("عليه")} ${sar(Math.abs(v))}`).join(" · ")}</p>` : ""}
      </section>`;
    const persist = async () => { await save("trips"); drawTripFile(root, t); };
    $("#tf-back").addEventListener("click", () => { openId = null; go("#trips"); });
    $("#tf-del").addEventListener("click", () => openDrawer(`<h2 id="drawer-title">${tx("تحذف «")}${esc(t.name)}${tx("»؟")}</h2><p class="muted" style="margin:0">${tx("بيروح الملف بكل عناصره ومصاريفه.")}</p><div class="row"><button type="button" class="btn btn-primary" id="tf-del-yes">${tx("احذف")}</button><button type="button" class="btn btn-ghost" data-close>${tx("لا، خلّه")}</button></div>`) || $("#tf-del-yes").addEventListener("click", async () => { S.trips = S.trips.filter(x => x.id !== t.id); await save("trips"); closeDrawer(); openId = null; go("#trips"); }));
    $("#tf-share").href = waLink([`${tx("ملف رحلة من دروب")}: ${t.name}`, ...t.items.map(i => `• ${i.title}${i.sub ? " — " + i.sub : ""}${i.price ? " — " + sar(i.price) : ""}`),
      itemsTotal ? `${tx("المجموع")}: ${sar(itemsTotal)}` : "", ...moves.map(m => `${m.from} ${tx("يحوّل لـ")} ${m.to}: ${sar(m.amount)}`)].filter(Boolean).join("\n"));
    $$("[data-idel]", root).forEach(b => b.addEventListener("click", () => { t.items = t.items.filter(i => i.id !== b.dataset.idel); persist(); }));
    $$("[data-edel]", root).forEach(b => b.addEventListener("click", () => { t.expenses = t.expenses.filter(e => e.id !== b.dataset.edel); persist(); }));
    $("#tf-addnote").addEventListener("click", () => { const v = $("#tf-note").value.trim(); if (!v) return; t.items.push({ id: uid(), type: "note", title: v, added: Date.now() }); persist(); });
    $("#tf-members").addEventListener("change", e => { t.members = e.target.value.split(/[،,]/).map(x => x.trim()).filter(Boolean); persist(); });
    $("#ex-split").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
    $("#ex-add").addEventListener("click", () => {
      const amount = Math.round(I18N.toSAR(Number($("#ex-amount").value || 0))), title = $("#ex-title").value.trim() || tx("مصروف");
      if (!amount) return toast(tx("اكتب المبلغ."));
      t.expenses.push({ id: uid(), title, amount, paidBy: $("#ex-by").value, split: $$("#ex-split [aria-pressed=true]").map(x => x.dataset.m) }); persist();
    });
    const ei = $("#ex-items"); ei && ei.addEventListener("click", () => {
      for (const i of t.items.filter(i => i.price && !t.expenses.some(e => e.item === i.id))) t.expenses.push({ id: uid(), item: i.id, title: i.title, amount: i.price, paidBy: t.members[0], split: [] });
      persist(); toast(tx("انضافت على اسم ") + t.members[0] + tx(". غيّر الدافع لو تبي بحذفها وإضافتها من جديد."));
    });
  }

  // ================================================================== WATCHES
  D.page("watch", root => {
    root.innerHTML = hero("watch", tx("متابعاتي"), `<button type="button" class="btn btn-primary" id="w-check">${tx("افحص الأسعار الحين")}</button>${X.mode === "live" && "Notification" in window && Notification.permission === "default" ? tx('<button type="button" class="btn btn-ghost" id="w-notif">تنبيهات الكمبيوتر</button>') : ""}<a class="btn btn-ghost" href="#setup">${tx("تنبيهات الجوال")}</a>`) + `
      <section><h2 class="sec">${tx("الأسعار اللي أراقبها")}</h2><div class="cards" id="w-list"></div></section>
      <section><h2 class="sec">${tx("المفضلة")}</h2><div class="cards" id="fav-list"></div></section>
      <section><h2 class="sec">${tx("آخر عمليات البحث")}</h2><div class="panel" id="hist-list"></div></section>`;
    const draw = results => {
      const byId = Object.fromEntries((results || []).map(r => [r.id, r]));
      $("#w-list").innerHTML = (S.watches || []).map(w => {
        const r = byId[w.id], v = r && r.history ? VERDICT[r.history.verdict] || VERDICT.few : null;
        return `<article class="panel dcard"><span class="small muted">${w.kind === "flight" ? tx("طيران") : tx("فندق")}${w.booked ? tx(" · محجوز") : ""}</span><h3 style="font-size:20px">${esc(w.label)}</h3>
          <div class="price-big">${sar(w.last)}${w.kind === "hotel" ? tx("<small> /ليلة</small>") : ""}</div>
          ${w.booked ? `<span class="small">${tx("سعر حجزك")} ${sar(w.booked)}${w.cancel_by ? ` · ${tx("الإلغاء المجاني لين")} ${esc(fmtDay(w.cancel_by))}` : ""}</span>` : ""}
          ${r && r.alert ? `<span class="small stops-0">${esc(r.alert)}</span>` : r && r.prev && r.price && r.price !== r.prev ? `<span class="small ${r.price < r.prev ? "stops-0" : "stops-2"}">${r.price < r.prev ? tx("نزل") : tx("طلع")} ${sar(Math.abs(r.price - r.prev))}</span>` : ""}
          ${v ? `<span class="verdict ${v[0]}">${v[1]}</span>${sparkline(r.history.points)}` : ""}${r && r.error ? `<span class="small stops-2">${esc(r.error)}</span>` : ""}
          <div class="field"><label for="tg-${esc(w.id)}">${tx("نبهني إذا صار أقل من")}</label><input class="input num" type="number" id="tg-${esc(w.id)}" data-target="${esc(w.id)}" value="${w.target ? Math.round(I18N.fromSAR(w.target)) : ""}" placeholder="${tx("مثلاً")} ${Math.round(I18N.fromSAR((w.last || 1000) * 0.9))}"></div>
          <span class="small muted">${w.checked ? tx("آخر فحص: ") + new Date(w.checked * 1000).toLocaleString(I18N.LOC_G, { dateStyle: "medium", timeStyle: "short" }) : tx("ما انفحص للحين")}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-unwatch="${esc(w.id)}">${tx("شيل المتابعة")}</button></article>`;
      }).join("") || `<div class="panel empty"><b>${tx("ما تراقب شي للحين")}</b>${tx("اضغط «راقب» على أي رحلة أو فندق.")}</div>`;
      $("#fav-list").innerHTML = (S.favorites || []).map(f => `<article class="panel dcard"><span class="small muted">${f.kind === "flight" ? tx("طيران") : tx("فندق")}</span><h3 style="font-size:20px">${esc(f.title)}</h3><span class="small muted">${esc(f.sub || "")}</span><div class="price-big">${sar(f.price)}</div>
        <div class="row" style="gap:6px">${f.link ? `<a class="btn btn-ghost btn-sm" href="${esc(f.link)}" target="_blank" rel="noopener">${tx("افتح")} ${ICON.out}</a>` : ""}<button type="button" class="btn btn-ghost btn-sm" data-unfav="${esc(f.id)}">${tx("شيلها")}</button></div></article>`).join("") || `<div class="panel empty"><b>${tx("المفضلة فاضية")}</b>${tx("اضغط «مفضلة» على أي خيار يعجبك عشان تقارن بعدين.")}</div>`;
      $("#hist-list").innerHTML = (S.history || []).length ? `<div class="tbl-wrap"><table class="rates"><tbody>${S.history.map((h, i) => `<tr><td>${esc(h.label)}</td><td class="small muted">${new Date(h.at).toLocaleDateString(I18N.LOC_G)}</td><td><button type="button" class="btn btn-ghost btn-sm" data-rerun="${i}">${tx("افتح")}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">${tx("ما فيه عمليات بحث للحين.")}</div>`;
    };
    draw(S.lastWatchResults);
    $("#w-check").addEventListener("click", async () => { const res = await withLoad(tx("عين الدليل تفحص أسعارك…"), () => autoCheckWatches(true)); if (res) { S.lastWatchResults = res.results; draw(res.results); } });
    const nb = $("#w-notif"); nb && nb.addEventListener("click", () => Notification.requestPermission().then(() => nb.remove()));
    root.addEventListener("change", async e => { const id = e.target.dataset.target; if (!id) return; const w = S.watches.find(x => x.id === id); if (w) { w.target = Number(e.target.value) ? Math.round(I18N.toSAR(Number(e.target.value))) : null; await save("watches"); toast(tx("انحفظ السعر المطلوب")); } });
    root.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.unwatch) { S.watches = S.watches.filter(w => w.id !== b.dataset.unwatch); await save("watches"); draw(S.lastWatchResults); }
      if (b.dataset.unfav) { S.favorites = S.favorites.filter(f => f.id !== b.dataset.unfav); await save("favorites"); draw(S.lastWatchResults); }
      if (b.dataset.rerun != null) { const h = S.history[Number(b.dataset.rerun)]; go("#" + ({ flight: "flights", hotel: "hotels" }[h.kind] || h.kind)); }
    });
  });

  // ================================================================== SETTINGS
  D.page("setup", root => {
    const st = S.settings, bag = baggage();
    if (!S.prefs.ntfyTopic) { S.prefs.ntfyTopic = st.ntfy_topic || "duroob-" + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8); save("prefs"); }
    const topic = st.ntfy_topic || S.prefs.ntfyTopic;
    root.innerHTML = hero("setup", tx("الإعدادات")) + `
      ${X.mode === "demo" ? `<div class="panel panel-pad small">${tx("هذي نسخة التجربة. المفاتيح والتنبيهات تشتغل في نسخة الكمبيوتر، وتنحفظ على جهازك بس.")}</div>` : ""}
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec"><span class="status-dot ${st.has_tp ? "on" : ""}"></span> ${tx("أسعار الطيران · Travelpayouts (مجاني)")}</h2>
        <ol class="steps small"><li>${tx("افتح")} <a href="https://www.travelpayouts.com/" target="_blank" rel="noopener">travelpayouts.com</a> ${tx("وسجّل حساب مجاني بإيميلك.")}</li><li>${tx("إذا سألك عن مشروعك، جاوب إنه برنامج شخصي للبحث عن أسعار الطيران.")}</li>
          <li>${tx("من قائمة البرامج (Programs) دوّر على")} <b>Aviasales</b> ${tx("واضغط انضمام (Join).")}</li><li>${tx("روح لصفحة")} <b>API</b> ${tx("في حسابك (غالباً من قائمة Tools)، وانسخ")} <b>API token</b>.</li><li>${tx("الصقه هنا واضغط «احفظ». إذا تغيّرت أسماء القوائم، دوّر في الموقع على «API token».")}</li></ol>
        <div class="row"><div class="field grow"><label for="s-tp">API token</label><input class="input" id="s-tp" type="password" placeholder="${st.has_tp ? tx("محفوظ ✓ (اكتب مفتاح جديد لو تبي تغيّره)") : tx("الصق المفتاح هنا")}"></div><button type="button" class="btn btn-primary" data-savekey="tp">${tx("احفظ")}</button></div></section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec"><span class="status-dot ${st.alerts_on ? "on" : ""}"></span> ${tx("تنبيهات الجوال")}</h2>
        <p class="small muted" style="margin:0">${tx("إذا نزل سعر شي تراقبه يوصلك إشعار على جوالك عن طريق تطبيق ntfy المجاني، بدون حساب. ولو فعّلت «مع ويندوز» يكمل دروب يراقب حتى لو قفلت النافذة.")}</p>
        <ol class="steps small"><li>${tx("نزّل تطبيق")} <b>ntfy</b> ${tx("على جوالك")}: <a href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">${tx("أندرويد")}</a> ${tx("أو")} <a href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">${tx("آيفون")}</a>.</li>
          <li>${tx("افتحه واضغط")} <b>+</b> ${tx("(Subscribe to topic) واكتب هالاسم بالضبط")}: <code id="s-topic">${esc(topic)}</code> <button type="button" class="btn btn-ghost btn-sm" id="s-copy">${tx("انسخ")}</button></li>
          <li>${tx("اضغط «جرّب» هنا، ولازم يوصلك إشعار.")}</li></ol>
        <p class="small muted" style="margin:0">${tx("الاسم عشوائي وما يعرفه غيرك، بس التنبيهات تمر على خادم ntfy العام، فلا تشارك الاسم.")}</p>
        <div class="row"><button type="button" class="btn btn-ghost" id="s-test">${tx("جرّب التنبيه")}</button>
          <label class="check"><input type="checkbox" id="s-alerts" ${st.alerts_on ? "checked" : ""}> ${tx("فعّل تنبيهات الجوال")}</label>
          ${st.can_autostart ? `<label class="check"><input type="checkbox" id="s-auto" ${st.autostart ? "checked" : ""}> ${tx("شغّل المراقبة مع ويندوز")}</label>` : `<span class="small muted">${tx("«المراقبة مع ويندوز» تظهر في نسخة الويندوز.")}</span>`}</div></section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec"><span class="status-dot ${st.has_serp ? "on" : ""}"></span> ${tx("نتائج قوقل · SerpApi (اختياري)")}</h2>
        <p class="small muted" style="margin:0">${tx("يجيب نفس الأسعار اللي تشوفها في قوقل ماب لكل موقع حجز، ويحسب أعمار الأطفال بدقة، ويضيف فلتر النجوم والإلغاء المجاني. الخطة المجانية فيها حوالي 250 بحث بالشهر.")}</p>
        <ol class="steps small"><li>${tx("سجّل مجاناً في")} <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener">serpapi.com</a>.</li><li>${tx("من لوحة التحكم (Dashboard) انسخ")} <b>Private API Key</b>.</li><li>${tx("الصقه هنا واحفظ.")}</li></ol>
        <div class="row"><div class="field grow"><label for="s-serp">SerpApi key</label><input class="input" id="s-serp" type="password" placeholder="${st.has_serp ? tx("محفوظ ✓") : tx("اختياري")}"></div><button type="button" class="btn btn-primary" data-savekey="serp">${tx("احفظ")}</button></div>
        <div class="checks"><label class="check"><input type="checkbox" id="s-sh" ${st.use_serp_hotels !== false ? "checked" : ""}> ${tx("استخدمه للفنادق")}</label><label class="check"><input type="checkbox" id="s-sf" ${st.use_serp_flights ? "checked" : ""}> ${tx("استخدمه للطيران بالتاريخ المحدد (أسعار مباشرة)")}</label></div></section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec">${tx("عام")}</h2>
        <div class="fields"><div class="field"><label for="s-home">${tx("مدينتك (مطار الإقلاع المعتاد)")}</label><select class="input" id="s-home">${META.homeAirports.map(a => `<option value="${a.code}" ${a.code === (st.home || "RUH") ? "selected" : ""}>${a.name} (${a.code})</option>`).join("")}</select></div>
          <div class="field"><span class="lbl">${tx("المظهر")}</span>${seg("theme", [["", tx("حسب الجهاز")], ["light", tx("نهار")], ["dark", tx("ليل")]], S.prefs.theme || "")}</div></div>
        ${st.data_dir ? `<p class="small muted" style="margin:0">${tx("بياناتك محفوظة على جهازك في")}: <code>${esc(st.data_dir)}</code></p>` : ""}</section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec">${tx("المواسم على التقويم")}</h2>
        <p class="small muted" style="margin:0">${tx("التواريخ الهجرية تقريبية حسب رؤية الهلال، وتواريخ الإجازات تقريبية. عدّلها أو زِد مواسمك. تأثر على التقويم وزحمة العمرة.")}</p>
        <div class="tbl-wrap"><table class="rates"><thead><tr><th>${tx("الموسم")}</th><th>${tx("من")}</th><th>${tx("إلى")}</th><th>${tx("النوع")}</th><th></th></tr></thead><tbody>
          ${seasons().map((s, i) => `<tr><td><input class="input" data-si="${i}" data-sk="name" value="${esc(s.name)}"></td><td><input class="input" type="date" data-si="${i}" data-sk="from" value="${s.from}"></td><td><input class="input" type="date" data-si="${i}" data-sk="to" value="${s.to}"></td>
            <td><select class="input" data-si="${i}" data-sk="kind">${[["holiday", tx("إجازة / عيد")], ["high", tx("موسم مزدحم")], ["ramadan", tx("رمضان")], ["hajj", tx("حج")]].map(([v, l]) => `<option value="${v}" ${s.kind === v ? "selected" : ""}>${l}</option>`).join("")}</select></td><td><button type="button" class="icon-btn" data-sdel="${i}" aria-label="${tx("حذف")}">✕</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="s-sadd">${tx("+ موسم جديد")}</button><button type="button" class="btn btn-ghost btn-sm" id="s-sreset">${tx("رجّع الافتراضي")}</button></div></section>
      <section class="panel panel-pad" style="display:grid;gap:12px"><h2 class="sec">${tx("رسوم الشنطة (للسعر الحقيقي)")}</h2>
        <p class="small muted" style="margin:0">${tx("سعر شنطة وحدة (حوالي ٢٠ كيلو) لكل اتجاه بالريال، لشركات الطيران الاقتصادي. الأرقام تقديرية، عدّلها حسب آخر أسعارهم.")}</p>
        <div class="kv">${Object.entries(bag).map(([c, v]) => `<div class="field"><label for="bg-${c}">${esc(airline(c))} (${c}) · ${I18N.curSym()}</label><input class="input num" type="number" id="bg-${c}" data-bag="${c}" value="${Math.round(I18N.fromSAR(v))}"></div>`).join("")}</div></section>
      <section class="panel panel-pad" style="display:grid;gap:10px"><h2 class="sec">${tx("المجموعات المحفوظة")}</h2>
        <div class="chip-set">${(S.groups || []).map((g, i) => `<span class="chip">${esc(g.name)} · ${esc(partyLabel(party(g.people)))} <button type="button" class="icon-btn" style="width:24px;height:24px" data-gdel="${i}" aria-label="${tx("حذف")}">✕</button></span>`).join("") || tx('<span class="small muted">تحفظ المجموعات من زر «المسافرون» في أي بحث.</span>')}</div></section>`;
    const again = () => D.go("#setup");
    root.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.savekey) {
        const isTp = b.dataset.savekey === "tp", val = $(isTp ? "#s-tp" : "#s-serp").value.trim();
        if (!val) return toast(tx("الصق المفتاح أول."));
        S.settings = await api("settings", null, isTp ? { tp_token: val } : { serp_key: val }); toast(tx("انحفظ المفتاح ✓"), "good"); again();
      }
      if (b.id === "s-copy") { try { await navigator.clipboard.writeText(topic); toast(tx("انسخ ✓")); } catch (err) { const r = document.createRange(); r.selectNodeContents($("#s-topic")); getSelection().removeAllRanges(); getSelection().addRange(r); toast(tx("حددته لك، انسخه")); } }
      if (b.id === "s-test") {
        if (X.mode === "demo") return toast(tx("في نسخة التجربة ما نرسل تنبيهات. جربها من الكمبيوتر."));
        try { await api("notify/test", null, { topic }); toast(tx("أرسلنا تنبيه لجوالك. وصل؟"), "good"); } catch (err) { toast(err.message); }
      }
      if (b.dataset.sdel != null) { const l = seasons().slice(); l.splice(Number(b.dataset.sdel), 1); S.seasons = l; await save("seasons"); applySeasons(); again(); }
      if (b.id === "s-sadd") { S.seasons = seasons().concat([{ name: tx("موسم جديد"), from: today(), to: addDays(today(), 7), kind: "holiday" }]); await save("seasons"); applySeasons(); again(); }
      if (b.id === "s-sreset") { S.seasons = null; await save("seasons"); applySeasons(); again(); }
      if (b.dataset.gdel != null) { S.groups.splice(Number(b.dataset.gdel), 1); await save("groups"); again(); }
    });
    root.addEventListener("change", async e => {
      const t = e.target;
      if (t.dataset.si != null) { const l = seasons().map(s => Object.assign({}, s)); l[Number(t.dataset.si)][t.dataset.sk] = t.value; S.seasons = l; await save("seasons"); applySeasons(); }
      if (t.dataset.bag) { S.baggage = Object.assign({}, baggage(), { [t.dataset.bag]: Math.round(I18N.toSAR(Number(t.value) || 0)) }); await save("baggage"); }
      if (t.id === "s-home") { S.settings = await api("settings", null, { home: t.value }); toast(tx("تم")); }
      if (t.id === "s-sh" || t.id === "s-sf") S.settings = await api("settings", null, { use_serp_hotels: $("#s-sh").checked, use_serp_flights: $("#s-sf").checked });
      if (t.id === "s-alerts") { S.settings = await api("settings", null, { alerts_on: t.checked, ntfy_topic: topic }); toast(t.checked ? tx("تنبيهات الجوال مفعّلة") : tx("وقفنا تنبيهات الجوال")); }
      if (t.id === "s-auto") { try { const r = await api("autostart", null, { on: t.checked }); toast(r.autostart ? tx("دروب بيشتغل مع ويندوز ويراقب الأسعار") : tx("ما عاد يشتغل مع ويندوز")); } catch (err) { toast(err.message); t.checked = !t.checked; } }
    });
    bindSeg(root, "theme", v => { S.prefs.theme = v; applyTheme(v); save("prefs"); });
  });

  D.start();
})();
