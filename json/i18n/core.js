/* i18n 引擎：加载语言包并应用到带 data-i18n 属性的元素 */
(function () {
  "use strict";
  window.I18N = {
    KEY: "hnbc-locale",
    current: (function () {
      try { return localStorage.getItem("hnbc-locale") || "zh"; }
      catch (e) { return "zh"; }
    })(),
    t: function (key) {
      var packs = window.I18N_DATA || {};
      var cur = packs[this.current];
      if (cur && cur[key] != null) return cur[key];
      var fallback = packs["zh"];
      return (fallback && fallback[key] != null) ? fallback[key] : key;
    },
    apply: function (lang) {
      var packs = window.I18N_DATA || {};
      if (!packs[lang]) lang = "zh";
      this.current = lang;
      try { localStorage.setItem(this.KEY, lang); } catch (e) {}
      document.documentElement.lang = (lang === "zh-TW") ? "zh-Hant" : lang;

      document.querySelectorAll("[data-i18n]").forEach(function (el) {
        var v = window.I18N.t(el.getAttribute("data-i18n"));
        if (v != null) el.textContent = v;
      });
      document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        var v = window.I18N.t(el.getAttribute("data-i18n-title"));
        if (v != null) el.title = v;
      });
      document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
        var v = window.I18N.t(el.getAttribute("data-i18n-aria"));
        if (v != null) el.setAttribute("aria-label", v);
      });
      document.querySelectorAll(".lang-btn").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-lang") === lang);
      });

      if (typeof window.onI18nApplied === "function") window.onI18nApplied(lang);
      try { window.dispatchEvent(new CustomEvent("i18n:applied", { detail: lang })); } catch (e) {}
    },
    init: function () {
      var self = this;
      document.querySelectorAll(".lang-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          self.apply(btn.getAttribute("data-lang"));
        });
      });
      this.apply(this.current);
    }
  };
})();
