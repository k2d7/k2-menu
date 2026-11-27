/* Duroob — language, direction, plurals and currency. Loaded before everything else. */
(function () {
  "use strict";
  const store = {
    get(k, d) { try { const v = localStorage.getItem("duroob:" + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("duroob:" + k, v); } catch (e) { /* storage blocked */ } }
  };
  const LANG = store.get("lang", "ar") === "en" ? "en" : "ar";
  const RTL = LANG === "ar";
  document.documentElement.lang = LANG;
  document.documentElement.dir = RTL ? "rtl" : "ltr";
  const DICT = window.DUROOB_EN || {};
  const t = s => (LANG === "en" && DICT[s] != null ? DICT[s] : s);

  // Plurals. Arabic: 1 يوم واحد · 2 يومين · 3–10 أيام · 11+ يوم.
  const AR = {
    day: ["يوم واحد", "يومين", "أيام", "يوم"], night: ["ليلة وحدة", "ليلتين", "ليالي", "ليلة"], room: ["غرفة وحدة", "غرفتين", "غرف", "غرفة"],
    stop: ["توقف واحد", "توقفين", "توقفات", "توقف"], flight: ["رحلة وحدة", "رحلتين", "رحلات", "رحلة"], dest: ["وجهة وحدة", "وجهتين", "وجهات", "وجهة"],
    item: ["عنصر واحد", "عنصرين", "عناصر", "عنصر"], traveler: ["مسافر واحد", "مسافرين", "مسافرين", "مسافر"], person: ["شخص واحد", "شخصين", "أشخاص", "شخص"],
    minute: ["دقيقة وحدة", "دقيقتين", "دقائق", "دقيقة"], hour: ["ساعة وحدة", "ساعتين", "ساعات", "ساعة"], review: ["تقييم واحد", "تقييمين", "تقييمات", "تقييم"], hotel: ["فندق واحد", "فندقين", "فنادق", "فندق"],
    adult: ["بالغ واحد", "2 بالغين", "بالغين", "بالغ"], child: ["طفل واحد", "طفلين", "أطفال", "طفل"], infant: ["رضيع واحد", "رضيعين", "رضّع", "رضيع"]
  };
  const EN = {
    day: ["day", "days"], night: ["night", "nights"], room: ["room", "rooms"], stop: ["stop", "stops"], flight: ["flight", "flights"],
    dest: ["destination", "destinations"], item: ["item", "items"], traveler: ["traveler", "travelers"], person: ["person", "people"],
    minute: ["minute", "minutes"], hour: ["hour", "hours"], review: ["review", "reviews"], hotel: ["hotel", "hotels"], adult: ["adult", "adults"], child: ["child", "children"], infant: ["infant", "infants"]
  };
  const arRules = new Intl.PluralRules("ar"), num = n => Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 });
  function P(n, key) {
    n = Number(n) || 0;
    if (LANG === "en") return `${num(n)} ${EN[key][n === 1 ? 0 : 1]}`;
    const f = AR[key], r = arRules.select(n);
    if (r === "one") return f[0];
    if (r === "two") return f[1].includes("2") ? f[1] : f[1];
    if (r === "few" || r === "zero") return `${num(n)} ${f[2]}`;
    return `${num(n)} ${f[3]}`;
  }
  // The word only, for layouts that show the number separately (big figures).
  function Pw(n, key) {
    n = Number(n) || 0;
    if (LANG === "en") return EN[key][n === 1 ? 0 : 1];
    const f = AR[key], r = arRules.select(n);
    return r === "few" || r === "zero" ? f[2] : r === "two" ? f[1] : f[3];
  }
  // Pick the right language from a data record ({ar, en}).
  const L = o => o ? (LANG === "en" ? (o.en || o.ar) : (o.ar || o.en)) : "";

  // Currency. Prices inside the app are SAR; they are converted only for display and input.
  const CURRENCIES = {
    SAR: ["ر.س", "SAR"], AED: ["د.إ", "AED"], KWD: ["د.ك", "KWD"], QAR: ["ر.ق", "QAR"], BHD: ["د.ب", "BHD"], OMR: ["ر.ع", "OMR"],
    USD: ["$", "$"], EUR: ["€", "€"], GBP: ["£", "£"], EGP: ["ج.م", "EGP"], TRY: ["₺", "₺"], MYR: ["رينغيت", "MYR"]
  };
  const CUR_NAMES = {
    SAR: ["ريال سعودي", "Saudi riyal"], AED: ["درهم إماراتي", "UAE dirham"], KWD: ["دينار كويتي", "Kuwaiti dinar"], QAR: ["ريال قطري", "Qatari riyal"],
    BHD: ["دينار بحريني", "Bahraini dinar"], OMR: ["ريال عماني", "Omani rial"], USD: ["دولار أمريكي", "US dollar"], EUR: ["يورو", "Euro"],
    GBP: ["جنيه إسترليني", "British pound"], EGP: ["جنيه مصري", "Egyptian pound"], TRY: ["ليرة تركية", "Turkish lira"], MYR: ["رينغيت ماليزي", "Malaysian ringgit"]
  };
  // Units of each currency per 1 SAR. Gulf currencies are pegged; the rest are refreshed from the internet when possible.
  const FX_FALLBACK = { SAR: 1, AED: 0.9793, KWD: 0.0819, QAR: 0.9707, BHD: 0.1003, OMR: 0.1027, USD: 0.2667, EUR: 0.23, GBP: 0.2, EGP: 13, TRY: 11.5, MYR: 1.15 };
  let CUR = store.get("cur", "SAR"); if (!CURRENCIES[CUR]) CUR = "SAR";
  let FX = Object.assign({}, FX_FALLBACK), FX_LIVE = false;
  const rate = () => FX[CUR] || 1;
  const fromSAR = v => v == null || isNaN(v) ? v : v * rate();
  const toSAR = v => v == null || isNaN(v) ? v : v / rate();
  const curSym = () => CURRENCIES[CUR][RTL ? 0 : 1];
  function digits(v) { const a = Math.abs(v); return a >= 100 ? 0 : a >= 10 ? 1 : 2; }
  function money(n) {
    if (n == null || isNaN(n)) return "—";
    const v = fromSAR(n), s = v.toLocaleString("en-US", { maximumFractionDigits: digits(v), minimumFractionDigits: 0 });
    if (!RTL && ["$", "€", "£"].includes(curSym())) return curSym() + s;
    return RTL ? `${s} ${curSym()}` : `${curSym()} ${s}`;
  }
  function moneyShort(n) {
    if (n == null || isNaN(n)) return "";
    const v = fromSAR(n);
    return v >= 10000 ? (v / 1000).toFixed(v >= 100000 ? 0 : 1) + "k" : v.toLocaleString("en-US", { maximumFractionDigits: digits(v) });
  }
  function setFx(r, live) { if (r) { FX = Object.assign({}, FX_FALLBACK, r); FX_LIVE = !!live; } }

  window.I18N = {
    LANG, RTL, t, P, Pw, L, store, CURRENCIES, CUR_NAMES, money, moneyShort, fromSAR, toSAR, curSym, setFx,
    get CUR() { return CUR; }, get FX_LIVE() { return FX_LIVE; },
    LOC_G: RTL ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB-u-ca-gregory",
    LOC_H: RTL ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-GB-u-ca-islamic-umalqura",
    setLang(l) { store.set("lang", l); location.reload(); },
    setCur(c) { store.set("cur", c); CUR = c; }
  };
  Object.assign(window, { tx: t, P, Pw, L });
  // Static text in index.html carries data-t; translate it once the page is parsed.
  document.addEventListener("DOMContentLoaded", () => {
    if (LANG === "ar") return;
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.textContent.trim()); });
    document.querySelectorAll("[data-t-aria]").forEach(el => el.setAttribute("aria-label", t(el.getAttribute("aria-label"))));
  });
})();
