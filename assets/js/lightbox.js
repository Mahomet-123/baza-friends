/* Лайтбокс — полноэкранный просмотр любого списка фото {src, label}.
   Работает и для фото объектов, и для фото территории. Лениво создаёт DOM. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  /* список фото объекта в формате лайтбокса */
  BF.unitPhotos = function (u) {
    return u.photos.map(p => ({ src: p.svg, label: BF.t(p.labelKey) }));
  };

  BF.openLightbox = function (list, idx) {
    S.lb.list = list || []; S.lb.idx = idx || 0;
    let el = document.getElementById('lightbox');
    if (!el) {
      el = document.createElement('div'); el.id = 'lightbox'; el.className = 'lightbox hidden';
      el.innerHTML =
        '<div class="lb-back"></div>' +
        '<span class="lb-counter"></span>' +
        '<button class="lb-close" aria-label="close">×</button>' +
        '<button class="lb-nav prev" aria-label="prev">‹</button>' +
        '<img class="lb-img" src="" alt="">' +
        '<button class="lb-nav next" aria-label="next">›</button>' +
        '<span class="lb-cap"></span>';
      document.body.appendChild(el);
      el.querySelector('.lb-back').onclick = BF.closeLightbox;
      el.querySelector('.lb-close').onclick = BF.closeLightbox;
      el.querySelector('.lb-nav.prev').onclick = () => BF.lbStep(-1);
      el.querySelector('.lb-nav.next').onclick = () => BF.lbStep(1);
      BF.addSwipe(el.querySelector('.lb-img'), () => BF.lbStep(-1), () => BF.lbStep(1));
      document.addEventListener('keydown', BF.lbKey);
    }
    BF.renderLightbox();
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  BF.lbStep = function (d) {
    if (!S.lb.list.length) return;
    S.lb.idx = (S.lb.idx + d + S.lb.list.length) % S.lb.list.length;
    BF.renderLightbox();
  };

  BF.renderLightbox = function () {
    const el = document.getElementById('lightbox');
    if (!el || !S.lb.list.length) return;
    const p = S.lb.list[S.lb.idx];
    el.querySelector('.lb-img').src = p.src;
    el.querySelector('.lb-cap').textContent = p.label;
    el.querySelector('.lb-counter').textContent = (S.lb.idx + 1) + ' / ' + S.lb.list.length;
  };

  BF.closeLightbox = function () {
    const el = document.getElementById('lightbox'); if (el) el.classList.add('hidden');
    const m = document.getElementById('modal');
    if (!m || m.classList.contains('hidden')) document.body.style.overflow = '';
  };

  BF.lbKey = function (e) {
    const el = document.getElementById('lightbox'); if (!el || el.classList.contains('hidden')) return;
    if (e.key === 'Escape') BF.closeLightbox();
    else if (e.key === 'ArrowLeft') BF.lbStep(-1);
    else if (e.key === 'ArrowRight') BF.lbStep(1);
  };
})();
