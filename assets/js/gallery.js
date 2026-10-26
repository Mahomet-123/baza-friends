/* Переиспользуемый компонент галереи фото.
   Генерирует #gallery-${suffix} и умеет листать кадры + открывать лайтбокс.
   Используется и в модалке (suffix 'modal'), и на странице объекта (suffix 'detail'). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  BF.galleryHTML = function (u, suffix) {
    const imgs = u.photos.map(p => `<img class="g-img" src="${p.svg}" alt="${BF.t(p.labelKey)}">`).join('');
    const thumbs = u.photos.map((p, i) => `<button class="g-thumb active" data-i="${i}"><img src="${p.svg}" alt=""></button>`).join('');
    return `<div class="gallery" id="gallery-${suffix}">
      <div class="g-view">
        <button class="g-nav prev" data-dir="-1" aria-label="prev">‹</button>
        <div class="g-track">${imgs}</div>
        <button class="g-nav next" data-dir="1" aria-label="next">›</button>
        <button class="g-fs" data-fs aria-label="fullscreen" title="${BF.t('fullscreen')}">⤢</button>
        <span class="g-cap" id="gcap-${suffix}"></span>
      </div>
      <div class="g-thumbs">${thumbs}</div>
    </div>`;
  };

  BF.setGallery = function (suffix, unitId, idx) {
    const u = BF.getUnit(unitId); if (!u) return;
    S.gIdx[suffix] = idx;
    const g = document.getElementById('gallery-' + suffix); if (!g) return;
    g.querySelector('.g-track').style.transform = 'translateX(' + (-idx * 100) + '%)';
    g.querySelectorAll('.g-thumb').forEach((b, i) => b.classList.toggle('active', i === idx));
    const cap = document.getElementById('gcap-' + suffix);
    if (cap) cap.textContent = BF.t(u.photos[idx].labelKey) + ' ' + (idx + 1) + '/' + u.photos.length;
  };

  BF.wireGallery = function (suffix, unitId) {
    const g = document.getElementById('gallery-' + suffix); if (!g) return;
    const u = BF.getUnit(unitId);
    g.querySelectorAll('.g-nav').forEach(b => b.onclick = () => {
      const d = parseInt(b.dataset.dir, 10);
      BF.setGallery(suffix, unitId, (S.gIdx[suffix] + d + u.photos.length) % u.photos.length);
    });
    g.querySelectorAll('.g-thumb').forEach(b => b.onclick = () => BF.setGallery(suffix, unitId, parseInt(b.dataset.i, 10)));
    const fs = g.querySelector('.g-fs'); if (fs) fs.onclick = () => BF.openLightbox(BF.unitPhotos(u), S.gIdx[suffix]);
    BF.addSwipe(g.querySelector('.g-view'),
      () => BF.setGallery(suffix, unitId, (S.gIdx[suffix] - 1 + u.photos.length) % u.photos.length),
      () => BF.setGallery(suffix, unitId, (S.gIdx[suffix] + 1) % u.photos.length));
  };
})();
