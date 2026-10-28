'use strict';

const LANGS = ['ru', 'en'];
const LANG_NAMES = { ru: 'РУС', en: 'ENG' };

/* ---------- движок ---------- */
let LANG = (() => {
  try {
    const s = localStorage.getItem('hostel_lang');
    if (LANGS.includes(s)) return s;
  } catch(e){}
  return 'ru';
})();

function t(key, vars){
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.ru[key] ?? key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
const tMonths = () => I18N[LANG].months;
const tMonthsShort = () => I18N[LANG].monthsShort;

function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('app_title');
}

function setLang(lang, rerender = true){
  if (!LANGS.includes(lang)) return;
  LANG = lang;
  try { localStorage.setItem('hostel_lang', lang); } catch(e){}
  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  applyStaticI18n();
  if (rerender && typeof render === 'function' && typeof state !== 'undefined' && state) {
    if (typeof setAuthMode === 'function' && typeof authMode !== 'undefined') setAuthMode(authMode);
    render();
  } else if (typeof setAuthMode === 'function' && typeof authMode !== 'undefined') {
    setAuthMode(authMode);
  }
}
