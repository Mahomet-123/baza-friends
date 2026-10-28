/* Состояние сайта + хранилище + языковые helpers.
   Единое пространство имён window.BF (IIFE), чтобы модули без бандлера
   резолвились по имени в момент вызова (порядок загрузки некритичен). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  /* мутабельное состояние — один объект, чтобы не плодить глобальные переменные */
  BF.state = {
    lang: localStorage.getItem('bf_lang') || 'ru',
    settings: Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem('bf_settings') || '{}')),
    openCat: 'room',
    dates: { checkin: '', checkout: '' },    // выбранный диапазон в каталоге (для «занято»)
    gIdx: { detail: 0, modal: 0 },          // текущий кадр галереи по контексту
    lb: { list: [], idx: 0 },                // состояние лайтбокса (полный экран)
    modalList: [],
    modalIdx: 0
  };

  /* русская плюрализация: one / few / many */
  BF.plural = function (n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  };

  BF.unitWord = function (n) {
    return BF.state.lang === 'ru'
      ? BF.plural(n, 'объект', 'объекта', 'объектов')
      : (n === 1 ? 'unit' : 'units');
  };

  /* поиск объекта по id (UNITS — глобал из data.js, может быть перезаписан CRM) */
  BF.getUnit = function (id) { return UNITS.find(u => String(u.id) === String(id)); };
})();
