/* Reference data for Duroob: airlines, low-cost baggage fees, seasons, airports. */
window.DUROOB_META = {
  airlines: {
    SV: "السعودية", XY: "طيران ناس", F3: "طيران أديل", EK: "طيران الإمارات", QR: "القطرية",
    EY: "الاتحاد", GF: "طيران الخليج", KU: "الكويتية", WY: "الطيران العماني", MS: "مصر للطيران",
    RJ: "الملكية الأردنية", ME: "طيران الشرق الأوسط", TK: "الخطوط التركية", PC: "بيغاسوس",
    FZ: "فلاي دبي", G9: "العربية للطيران", "3L": "العربية أبوظبي", E5: "العربية مصر", J9: "طيران الجزيرة",
    BA: "البريطانية", AF: "الفرنسية", LH: "لوفتهانزا", KL: "الهولندية", AZ: "إيتا الإيطالية",
    IB: "إيبيريا", OS: "النمساوية", LX: "السويسرية", AT: "الملكية المغربية", TU: "التونسية",
    MH: "الماليزية", GA: "جارودا", TG: "التايلاندية", SQ: "السنغافورية", W6: "ويز إير",
    "6E": "إنديغو", AI: "طيران الهند", UL: "السريلانكية", ET: "الإثيوبية", KQ: "الكينية",
    JL: "اليابانية", NH: "إيه إن إيه", KE: "الكورية", CX: "كاثي باسيفيك", CA: "طيران الصين",
    VN: "الفيتنامية", PK: "الباكستانية", A3: "إيجيان", J2: "أزال", SU: "إيروفلوت", FR: "رايان إير",
    U2: "إيزي جت", VF: "أجيت", OV: "طيران السلام", "9P": "فلاي جناح", QP: "أكاسا", AK: "طيران آسيا",
    D7: "طيران آسيا إكس", TR: "سكوت", VY: "فويلنغ", HV: "ترانسافيا", XQ: "صن إكسبرس", IA: "العراقية",
    RB: "السورية", NE: "نسما", "5W": "ويز إير أبوظبي"
  },
  // Approximate price of one checked bag (about 20kg), one direction, in SAR. Editable in settings.
  baggage: {
    XY: 120, F3: 120, FZ: 140, G9: 140, "3L": 140, E5: 140, J9: 130, PC: 150, W6: 190, "5W": 160,
    "6E": 150, FR: 220, U2: 190, VF: 130, OV: 120, AK: 110, D7: 130, TR: 140, VY: 170, HV: 170, XQ: 140, NE: 120
  },
  // Hijri-based dates are approximate (moon sighting); school dates are approximate. Editable in settings.
  seasons: [
    { name: "رأس السنة الميلادية", from: "2026-12-20", to: "2027-01-03", kind: "high", note: "زحمة سفر عالمية" },
    { name: "يوم التأسيس", from: "2027-02-21", to: "2027-02-23", kind: "holiday", note: "إجازة رسمية" },
    { name: "رمضان", from: "2027-02-08", to: "2027-03-09", kind: "ramadan", note: "تقريبي · العشر الأواخر غالية في مكة والمدينة" },
    { name: "عيد الفطر", from: "2027-03-10", to: "2027-03-16", kind: "holiday", note: "تقريبي · ذروة سفر" },
    { name: "موسم الحج", from: "2027-05-08", to: "2027-05-21", kind: "hajj", note: "تقريبي · فنادق مكة في أعلى أسعارها" },
    { name: "عيد الأضحى", from: "2027-05-16", to: "2027-05-20", kind: "holiday", note: "تقريبي · ذروة سفر" },
    { name: "إجازة الصيف", from: "2027-06-24", to: "2027-08-28", kind: "high", note: "تقريبي · الطلب عالي" },
    { name: "اليوم الوطني", from: "2027-09-22", to: "2027-09-24", kind: "holiday", note: "إجازة رسمية" },
    { name: "رأس السنة الميلادية", from: "2027-12-20", to: "2028-01-03", kind: "high", note: "زحمة سفر عالمية" }
  ],
  homeAirports: [
    { code: "RUH", name: "الرياض" }, { code: "JED", name: "جدة" }, { code: "DMM", name: "الدمام" },
    { code: "MED", name: "المدينة المنورة" }, { code: "AHB", name: "أبها" }, { code: "TIF", name: "الطائف" },
    { code: "ELQ", name: "القصيم" }, { code: "TUF", name: "تبوك" }, { code: "HAS", name: "حائل" },
    { code: "GIZ", name: "جازان" }, { code: "YNB", name: "ينبع" }, { code: "ULH", name: "العلا" }, { code: "HOF", name: "الأحساء" }
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
  updated: "منتصف 2026",
  kinds: {
    id: ["بالهوية الوطنية", "easy"], free: ["بدون تأشيرة", "easy"], arrival: ["تأشيرة عند الوصول", "easy"],
    evisa: ["تأشيرة إلكترونية", "mid"], eta: ["تصريح سفر إلكتروني", "mid"], schengen: ["تأشيرة شنغن مسبقة", "hard"], required: ["تأشيرة مسبقة", "hard"]
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
    AE: "الإمارات", QA: "قطر", BH: "البحرين", KW: "الكويت", OM: "عُمان", EG: "مصر", JO: "الأردن", LB: "لبنان", IQ: "العراق", MA: "المغرب",
    TN: "تونس", TR: "تركيا", AZ: "أذربيجان", GE: "جورجيا", BA: "البوسنة", RU: "روسيا", GB: "بريطانيا", IE: "أيرلندا", FR: "فرنسا", IT: "إيطاليا",
    ES: "إسبانيا", AT: "النمسا", CZ: "التشيك", DE: "ألمانيا", CH: "سويسرا", NL: "هولندا", HU: "المجر", PL: "بولندا", GR: "اليونان", BG: "بلغاريا",
    MY: "ماليزيا", ID: "إندونيسيا", TH: "تايلاند", SG: "سنغافورة", JP: "اليابان", KR: "كوريا الجنوبية", HK: "هونغ كونغ", CN: "الصين", VN: "فيتنام",
    MV: "المالديف", LK: "سريلانكا", IN: "الهند", TZ: "تنزانيا", KE: "كينيا", ZA: "جنوب أفريقيا", US: "أمريكا", AU: "أستراليا", SA: "السعودية"
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
    { name: "يوم التأسيس", from: "2027-02-22", to: "2027-02-22" },
    { name: "إجازة عيد الفطر", from: "2027-03-09", to: "2027-03-12" },
    { name: "إجازة عيد الأضحى", from: "2027-05-15", to: "2027-05-18" },
    { name: "اليوم الوطني", from: "2027-09-23", to: "2027-09-23" },
    { name: "يوم التأسيس", from: "2028-02-22", to: "2028-02-22" }
  ],
  government: [
    { name: "يوم التأسيس", from: "2027-02-22", to: "2027-02-22" },
    { name: "إجازة عيد الفطر", from: "2027-03-05", to: "2027-03-20" },
    { name: "إجازة عيد الأضحى", from: "2027-05-12", to: "2027-05-23" },
    { name: "اليوم الوطني", from: "2027-09-23", to: "2027-09-23" },
    { name: "يوم التأسيس", from: "2028-02-22", to: "2028-02-22" }
  ]
};
/* The old routes each section is named after (shown as the section's epigraph). */
window.DUROOB_META.lore = {
  home: ["مجلس دروب", "كانت القوافل تهتدي بالنجوم، بالجدي في الشمال وسهيل في الجنوب. وهنا تهتدي لأرخص الطرق."],
  flights: ["على خطى الملاحين بالنجوم", "قبل الطائرات، كان الدليل يقرأ السماء ليعرف الطريق. اليوم تقرأ الأسعار يوماً بيوم."],
  hotels: ["الخانات والمنازل", "على طرق القوافل كانت الخانات تستقبل المسافرين ليلة بعد ليلة. قارن منازلك قبل ما تنزل."],
  trip: ["من أول الدرب لآخره", "الطيران والفندق والمصروف في حساب واحد، مثل ما كان التاجر يحسب رحلته قبل المسير."],
  multi: ["طريق الحرير", "شبكة طرق ربطت الصين بالشام وأوروبا أكثر من ألف سنة، والقافلة تنتقل فيها من مدينة لمدينة."],
  where: ["طريق البخور", "كان ينقل اللبان والمرّ من جنوب الجزيرة إلى الشام ومصر، ومن محطاته نجران والحِجر في العلا."],
  umrah: ["درب زبيدة", "طريق الحجاج من الكوفة إلى مكة، نحو ١٤٠٠ كم، وينسب لزبيدة زوجة هارون الرشيد اللي عمّرت برك الماء والمنازل عليه."],
  holidays: ["مواسم المسير", "القوافل كانت تختار وقت مسيرها مع المواسم. اختر إجازتك بحيث تطلع بأطول رحلة بأقل أيام."],
  trips: ["تحفة النظار", "دوّن ابن بطوطة رحلته في «تحفة النظار في غرائب الأمصار». دوّن رحلتك هنا وقسّم مصاريفها."],
  watch: ["عين الدليل", "الدليل يراقب الطريق وينبه القافلة. دروب يراقب الأسعار وينبهك إذا نزلت."],
  setup: ["عُدّة المسافر", "مفاتيح المصادر، وتنبيهات الجوال، ومواسمك ورسوم الشنط."]
};
