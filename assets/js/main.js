/* Точка входа сайта: делегирование кликов, переключение языка,
   hash-роутинг и стартовая инициализация. Грузится последним,
   после всех модулей window.BF. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  /* одно делегирование на весь документ — не зависим от того, какая страница отрисована */
  function onClick(e) {
    const t = e.target;

    /* язык */
    const langBtn = t.closest && t.closest('.lang-btn');
    if (langBtn) {
      S.lang = langBtn.dataset.lang;
      localStorage.setItem('bf_lang', S.lang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b === langBtn));
      BF.applyLang();
      BF.route(); // перерисовываем текущую страницу на новом языке
      return;
    }

    /* плитка категории → раскрыть/свернуть и прокрутить к карточкам */
    const tile = t.closest && t.closest('[data-tile]');
    if (tile) {
      const id = tile.dataset.tile;
      BF.setCatOpen(id, S.openCat !== id);
      if (S.openCat === id) BF.scrollToCat(id);
      return;
    }

    /* «Подробнее» на карточке → модалка объекта */
    const det = t.closest && t.closest('[data-details]');
    if (det) { BF.openModal(det.dataset.details); return; }

    /* «Отправить заявку» на странице объекта или в модалке → форма */
    const book = t.closest && t.closest('[data-book]');
    if (book) { BF.openForm(book.dataset.book); return; }

    /* фото территории → лайтбокс */
    const terr = t.closest && t.closest('[data-terr]');
    if (terr) {
      const i = Number(terr.dataset.terr);
      const x = (typeof TERRITORY !== 'undefined') && TERRITORY[i];
      if (x) BF.openLightbox([{ src: x.photo, label: S.lang === 'ru' ? x.name_ru : x.name_en }], 0);
      return;
    }
  }

  function init() {
    BF.applySettings();
    BF.applyLang();
    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', BF.route);
    window.addEventListener('scroll', () => BF.updatePin(), { passive: true });
    BF.route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
