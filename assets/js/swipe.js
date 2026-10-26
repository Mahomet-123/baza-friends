/* Свайп для тач-устройств. guard(e) позволяет игнорировать жест,
   если он начался внутри элемента, который сам обрабатывает свайп
   (например, фото внутри галереи в модалке — там свайп листает фото,
   а свайп по остальной части модалки листает объекты). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};

  BF.addSwipe = function (el, left, right, guard) {
    if (!el) return;
    let x0 = null;
    el.addEventListener('touchstart', e => {
      if (guard && guard(e)) { x0 = null; return; }
      x0 = e.touches[0].clientX;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { if (dx < 0) right(); else left(); }
      x0 = null;
    });
  };
})();
