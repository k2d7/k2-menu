/* Reference data for Duroob: airlines, low-cost baggage fees, seasons, airports. */
window.DUROOB_META = {
  airlines: {
    SV: tx("السعودية"), XY: tx("طيران ناس"), F3: tx("طيران أديل"), EK: tx("طيران الإمارات"), QR: tx("القطرية"),
    EY: tx("الاتحاد"), GF: tx("طيران الخليج"), KU: tx("الكويتية"), WY: tx("الطيران العماني"), MS: tx("مصر للطيران"),
    RJ: tx("الملكية الأردنية"), ME: tx("طيران الشرق الأوسط"), TK: tx("الخطوط التركية"), PC: tx("بيغاسوس"),
    FZ: tx("فلاي دبي"), G9: tx("العربية للطيران"), "3L": tx("العربية أبوظبي"), E5: tx("العربية مصر"), J9: tx("طيران الجزيرة"),
    BA: tx("البريطانية"), AF: tx("الفرنسية"), LH: tx("لوفتهانزا"), KL: tx("الهولندية"), AZ: tx("إيتا الإيطالية"),
    IB: tx("إيبيريا"), OS: tx("النمساوية"), LX: tx("السويسرية"), AT: tx("الملكية المغربية"), TU: tx("التونسية"),
    MH: tx("الماليزية"), GA: tx("جارودا"), TG: tx("التايلاندية"), SQ: tx("السنغافورية"), W6: tx("ويز إير"),
    "6E": tx("إنديغو"), AI: tx("طيران الهند"), UL: tx("السريلانكية"), ET: tx("الإثيوبية"), KQ: tx("الكينية"),
    JL: tx("اليابانية"), NH: tx("إيه إن إيه"), KE: tx("الكورية"), CX: tx("كاثي باسيفيك"), CA: tx("طيران الصين"),
    VN: tx("الفيتنامية"), PK: tx("الباكستانية"), A3: tx("إيجيان"), J2: tx("أزال"), SU: tx("إيروفلوت"), FR: tx("رايان إير"),
    U2: tx("إيزي جت"), VF: tx("أجيت"), OV: tx("طيران السلام"), "9P": tx("فلاي جناح"), QP: tx("أكاسا"), AK: tx("طيران آسيا"),
    D7: tx("طيران آسيا إكس"), TR: tx("سكوت"), VY: tx("فويلنغ"), HV: tx("ترانسافيا"), XQ: tx("صن إكسبرس"), IA: tx("العراقية"),
    RB: tx("السورية"), NE: tx("نسما"), "5W": tx("ويز إير أبوظبي")
  },
  // Approximate price of one checked bag (about 20kg), one direction, in SAR. Editable in settings.
  baggage: {
    XY: 120, F3: 120, FZ: 140, G9: 140, "3L": 140, E5: 140, J9: 130, PC: 150, W6: 190, "5W": 160,
    "6E": 150, FR: 220, U2: 190, VF: 130, OV: 120, AK: 110, D7: 130, TR: 140, VY: 170, HV: 170, XQ: 140, NE: 120
  },
  // Hijri-based dates are approximate (moon sighting); school dates are approximate. Editable in settings.
  seasons: [
    { name: tx("رأس السنة الميلادية"), from: "2026-12-20", to: "2027-01-03", kind: "high", note: tx("زحمة سفر عالمية") },
    { name: tx("يوم التأسيس"), from: "2027-02-21", to: "2027-02-23", kind: "holiday", note: tx("إجازة رسمية") },
    { name: tx("رمضان"), from: "2027-02-08", to: "2027-03-09", kind: "ramadan", note: tx("تقريبي · العشر الأواخر غالية في مكة والمدينة") },
    { name: tx("عيد الفطر"), from: "2027-03-10", to: "2027-03-16", kind: "holiday", note: tx("تقريبي · ذروة سفر") },
    { name: tx("موسم الحج"), from: "2027-05-08", to: "2027-05-21", kind: "hajj", note: tx("تقريبي · فنادق مكة في أعلى أسعارها") },
    { name: tx("عيد الأضحى"), from: "2027-05-16", to: "2027-05-20", kind: "holiday", note: tx("تقريبي · ذروة سفر") },
    { name: tx("إجازة الصيف"), from: "2027-06-24", to: "2027-08-28", kind: "high", note: tx("تقريبي · الطلب عالي") },
    { name: tx("اليوم الوطني"), from: "2027-09-22", to: "2027-09-24", kind: "holiday", note: tx("إجازة رسمية") },
    { name: tx("رأس السنة الميلادية"), from: "2027-12-20", to: "2028-01-03", kind: "high", note: tx("زحمة سفر عالمية") }
  ],
  homeAirports: [
    { code: "RUH", name: tx("الرياض") }, { code: "JED", name: tx("جدة") }, { code: "DMM", name: tx("الدمام") },
    { code: "MED", name: tx("المدينة المنورة") }, { code: "AHB", name: tx("أبها") }, { code: "TIF", name: tx("الطائف") },
    { code: "ELQ", name: tx("القصيم") }, { code: "TUF", name: tx("تبوك") }, { code: "HAS", name: tx("حائل") },
    { code: "GIZ", name: tx("جازان") }, { code: "YNB", name: tx("ينبع") }, { code: "ULH", name: tx("العلا") }, { code: "HOF", name: tx("الأحساء") }
  ],
  regions: {
    "الخليج": ["SA", "AE", "QA", "BH", "KW", "OM"],
    "العالم العربي": ["EG", "JO", "LB", "IQ", "MA", "TN", "SY", "DZ", "SD"],
    "تركيا والقوقاز": ["TR", "AZ", "GE", "BA", "RU"],
    "أوروبا": ["GB", "IE", "FR", "IT", "ES", "AT", "CZ", "DE", "CH", "NL", "HU", "PL", "GR", "BG"],
    "آسيا": ["MY", "ID", "TH", "SG", "JP", "KR", "HK", "CN", "VN", "MV", "LK", "IN"],
    "أفريقيا": ["TZ", "KE", "ZA"],
    "أمريكا وأستراليا": ["US", "AU"]
  }
};

/* Entry rules for a Saudi passport (tourism). Rules change: every entry carries `sure`, and the UI always says "تأكد قبل السفر". Last reviewed: mid 2026. */
window.DUROOB_META.visa = {
  updated: tx("منتصف 2026"),
  kinds: {
    id: [tx("بالهوية الوطنية"), "easy"], free: [tx("بدون تأشيرة"), "easy"], arrival: [tx("تأشيرة عند الوصول"), "easy"],
    evisa: [tx("تأشيرة إلكترونية"), "mid"], eta: [tx("تصريح سفر إلكتروني"), "mid"], schengen: [tx("تأشيرة شنغن مسبقة"), "hard"], required: [tx("تأشيرة مسبقة"), "hard"]
  },
  countries: {
    AE: ["id", true], QA: ["id", true], BH: ["id", true], KW: ["id", true], OM: ["id", true],
    EG: ["arrival", true], JO: ["arrival", false], LB: ["arrival", false], IQ: ["arrival", false], MA: ["free", true], TN: ["free", true],
    TR: ["evisa", false], AZ: ["evisa", false], GE: ["free", true], BA: ["free", false], RU: ["evisa", false],
    GB: ["eta", true], IE: ["required", false], FR: ["schengen", true], IT: ["schengen", true], ES: ["schengen", true], AT: ["schengen", true],
    CZ: ["schengen", true], DE: ["schengen", true], CH: ["schengen", true], NL: ["schengen", true], HU: ["schengen", true], PL: ["schengen", true],
    GR: ["schengen", true], BG: ["schengen", true],
    MY: ["free", true], ID: ["arrival", true], TH: ["free", true], SG: ["required", false], JP: ["evisa", false], KR: ["eta", false],
    HK: ["free", false], CN: ["free", false], VN: ["evisa", true], MV: ["arrival", true], LK: ["eta", true], IN: ["evisa", true],
    TZ: ["evisa", false], KE: ["eta", false], ZA: ["required", false], US: ["required", true], AU: ["evisa", false]
  },
  countryNames: {
    AE: tx("الإمارات"), QA: tx("قطر"), BH: tx("البحرين"), KW: tx("الكويت"), OM: tx("عُمان"), EG: tx("مصر"), JO: tx("الأردن"), LB: tx("لبنان"), IQ: tx("العراق"), MA: tx("المغرب"),
    TN: tx("تونس"), TR: tx("تركيا"), AZ: tx("أذربيجان"), GE: tx("جورجيا"), BA: tx("البوسنة"), RU: tx("روسيا"), GB: tx("بريطانيا"), IE: tx("أيرلندا"), FR: tx("فرنسا"), IT: tx("إيطاليا"),
    ES: tx("إسبانيا"), AT: tx("النمسا"), CZ: tx("التشيك"), DE: tx("ألمانيا"), CH: tx("سويسرا"), NL: tx("هولندا"), HU: tx("المجر"), PL: tx("بولندا"), GR: tx("اليونان"), BG: tx("بلغاريا"),
    MY: tx("ماليزيا"), ID: tx("إندونيسيا"), TH: tx("تايلاند"), SG: tx("سنغافورة"), JP: tx("اليابان"), KR: tx("كوريا الجنوبية"), HK: tx("هونغ كونغ"), CN: tx("الصين"), VN: tx("فيتنام"),
    MV: tx("المالديف"), LK: tx("سريلانكا"), IN: tx("الهند"), TZ: tx("تنزانيا"), KE: tx("كينيا"), ZA: tx("جنوب أفريقيا"), US: tx("أمريكا"), AU: tx("أستراليا"), SA: tx("السعودية")
  }
};
/* Rough daily spend per person (food + local transport, mid-range), SAR. Estimates only. */
window.DUROOB_META.dailyCost = {
  SA: 180, AE: 250, QA: 230, BH: 180, KW: 200, OM: 170, EG: 110, JO: 160, LB: 180, IQ: 120, MA: 130, TN: 110, TR: 170, AZ: 140, GE: 130,
  BA: 120, RU: 170, GB: 330, IE: 300, FR: 300, IT: 270, ES: 240, AT: 260, CZ: 180, DE: 270, CH: 400, NL: 280, HU: 170, PL: 160, GR: 210,
  BG: 130, MY: 130, ID: 120, TH: 130, SG: 280, JP: 240, KR: 220, HK: 260, CN: 170, VN: 100, MV: 300, LK: 100, IN: 90, TZ: 160, KE: 150,
  ZA: 160, US: 380, AU: 320
};
/* Official holidays used by the leave planner. Hijri-based dates are approximate. */
window.DUROOB_META.holidays = {
  private: [
    { name: tx("يوم التأسيس"), from: "2027-02-22", to: "2027-02-22" },
    { name: tx("إجازة عيد الفطر"), from: "2027-03-09", to: "2027-03-12" },
    { name: tx("إجازة عيد الأضحى"), from: "2027-05-15", to: "2027-05-18" },
    { name: tx("اليوم الوطني"), from: "2027-09-23", to: "2027-09-23" },
    { name: tx("يوم التأسيس"), from: "2028-02-22", to: "2028-02-22" }
  ],
  government: [
    { name: tx("يوم التأسيس"), from: "2027-02-22", to: "2027-02-22" },
    { name: tx("إجازة عيد الفطر"), from: "2027-03-05", to: "2027-03-20" },
    { name: tx("إجازة عيد الأضحى"), from: "2027-05-12", to: "2027-05-23" },
    { name: tx("اليوم الوطني"), from: "2027-09-23", to: "2027-09-23" },
    { name: tx("يوم التأسيس"), from: "2028-02-22", to: "2028-02-22" }
  ]
};
/* The old routes each section is named after (shown as the section's epigraph). */
window.DUROOB_META.lore = {
  home: [tx("مجلس دروب"), tx("كانت القوافل تهتدي بالنجوم، بالجدي في الشمال وسهيل في الجنوب. وهنا تهتدي لأرخص الطرق.")],
  flights: [tx("على خطى الملاحين بالنجوم"), tx("قبل الطائرات، كان الدليل يقرأ السماء ليعرف الطريق. اليوم تقرأ الأسعار يوماً بيوم.")],
  hotels: [tx("الخانات والمنازل"), tx("على طرق القوافل كانت الخانات تستقبل المسافرين ليلة بعد ليلة. قارن منازلك قبل ما تنزل.")],
  trip: [tx("من أول الدرب لآخره"), tx("الطيران والفندق والمصروف في حساب واحد، مثل ما كان التاجر يحسب رحلته قبل المسير.")],
  multi: [tx("طريق الحرير"), tx("شبكة طرق ربطت الصين بالشام وأوروبا أكثر من ألف سنة، والقافلة تنتقل فيها من مدينة لمدينة.")],
  where: [tx("طريق البخور"), tx("كان ينقل اللبان والمرّ من جنوب الجزيرة إلى الشام ومصر، ومن محطاته نجران والحِجر في العلا.")],
  umrah: [tx("درب زبيدة"), tx("طريق الحجاج من الكوفة إلى مكة، نحو ١٤٠٠ كم، وينسب لزبيدة زوجة هارون الرشيد اللي عمّرت برك الماء والمنازل عليه.")],
  holidays: [tx("مواسم المسير"), tx("القوافل كانت تختار وقت مسيرها مع المواسم. اختر إجازتك بحيث تطلع بأطول رحلة بأقل أيام.")],
  trips: [tx("تحفة النظار"), tx("دوّن ابن بطوطة رحلته في «تحفة النظار في غرائب الأمصار». دوّن رحلتك هنا وقسّم مصاريفها.")],
  watch: [tx("عين الدليل"), tx("الدليل يراقب الطريق وينبه القافلة. دروب يراقب الأسعار وينبهك إذا نزلت.")],
  setup: [tx("عُدّة المسافر"), tx("مفاتيح المصادر، وتنبيهات الجوال، ومواسمك ورسوم الشنط.")]
};
