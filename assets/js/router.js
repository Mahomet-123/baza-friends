/* Роутинг по hash: #/ — главная, #/unit/:id — объект, #/manager — админка.
   При смене страницы закрываем все всплывающие окна. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  /* при смене страницы все оверлеи закрываем, чтобы не висели поверх новой */
  BF.closeOverlays = function () {
    ['modal', 'formOverlay', 'lightbox'].forEach(id => {
      const el = document.getElementById(id); if (el) el.classList.add('hidden');
    });
    document.body.style.overflow = '';
  };

  BF.route = function () {
    BF.closeOverlays();
    const h = location.hash || '#/';
    if (h.indexOf('#/unit/') === 0) { BF.renderUnit(h.split('/')[2]); return; }
    if (h.indexOf('#/manager') === 0) { BF.renderManager(); return; }
    BF.renderHome();
    /* навигация по якорям #catalog / #territory — прокручиваем к нужной секции
       (после того, как renderHome отрисовал страницу и создал эти элементы) */
    if (h === '#catalog' || h === '#territory') {
      const el = document.getElementById(h.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 0);
    }
  };
})();
