/* Интернационализация и применение настроек базы (белый лейбл). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  /* перевод по ключу; fallback — сам ключ */
  BF.t = function (k) {
    const s = BF.state;
    const dict = (typeof I18N !== 'undefined' && I18N[s.lang]) ? I18N[s.lang] : {};
    return dict[k] || k;
  };

  /* белый лейбл: цвет акцента, название и контакт берём из настроек, не из кода */
  BF.applySettings = function () {
    document.documentElement.style.setProperty('--sea-600', BF.state.settings.primaryColor);
    const b = document.getElementById('brandName'); if (b) b.textContent = BF.state.settings.brandName;
    const f = document.getElementById('footerText');
    if (f) f.innerHTML = '© ' + BF.state.settings.brandName + ' · ' + BF.state.settings.contactPhone;
  };

  /* подставляет переводы во все элементы с data-i18n и меняет lang документа */
  BF.applyLang = function () {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = BF.t(el.dataset.i18n); });
    document.documentElement.lang = BF.state.lang;
  };
})();
