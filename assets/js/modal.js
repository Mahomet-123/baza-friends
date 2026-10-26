/* Модалка объекта: листание объектов своей категории (‹ › снизу),
   галерея внутри, кнопка «Забронировать» ведёт к форме. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  BF.openModal = function (unitId) {
    const u = BF.getUnit(unitId);
    if (!u) return;
    S.modalList = UNITS.filter(x => x.category === u.category);
    S.modalIdx = S.modalList.findIndex(x => x.id === unitId);
    BF.showModal();
    document.body.style.overflow = 'hidden';
  };

  BF.showModal = function () {
    const u = S.modalList[S.modalIdx];
    if (!u) return;
    const name = S.lang === 'ru' ? u.name_ru : u.name_en;
    const desc = S.lang === 'ru' ? u.desc_ru : u.desc_en;
    const amen = u.amenities.map(a => `<li>${a}</li>`).join('');
    let m = document.getElementById('modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'modal'; m.className = 'modal hidden';
      m.innerHTML = `<div class="modal-back"></div><div class="modal-box">
        <button class="modal-close" aria-label="close">×</button>
        <div class="modal-content"></div></div>`;
      document.body.appendChild(m);
      m.querySelector('.modal-back').onclick = BF.closeModal;
      m.querySelector('.modal-close').onclick = BF.closeModal;
    }
    m.querySelector('.modal-content').innerHTML = `
      ${BF.galleryHTML(u, 'modal')}
      <h3 style="margin-top:14px">${name}</h3>
      <p>${desc}</p>
      <ul class="amen">${amen}</ul>
      <div class="card-meta"><span>${BF.t('capacity')}: ${u.capacity}</span><span>${BF.t('beds')}: ${u.beds}</span><span class="price">${u.price.toLocaleString('ru-RU')} ${BF.t('per_night')}</span></div>
      <button class="btn" data-book="${u.id}" style="margin-top:14px">${BF.t('book')}</button>
      <div class="modal-nav">
        <button class="mnav prev" aria-label="prev">‹</button>
        <span class="mnav-label">${S.modalIdx + 1} / ${S.modalList.length} · ${name}</span>
        <button class="mnav next" aria-label="next">›</button>
      </div>`;
    BF.setGallery('modal', u.id, 0);
    BF.wireGallery('modal', u.id);

    const box = m.querySelector('.modal-content');
    box.querySelector('.mnav.prev').onclick = () => { S.modalIdx = (S.modalIdx - 1 + S.modalList.length) % S.modalList.length; BF.showModal(); };
    box.querySelector('.mnav.next').onclick = () => { S.modalIdx = (S.modalIdx + 1) % S.modalList.length; BF.showModal(); };
    BF.addSwipe(box,
      () => { S.modalIdx = (S.modalIdx - 1 + S.modalList.length) % S.modalList.length; BF.showModal(); },
      () => { S.modalIdx = (S.modalIdx + 1) % S.modalList.length; BF.showModal(); },
      e => !!(e.target.closest && e.target.closest('.g-view')));

    m.classList.remove('hidden');
    m.querySelector('[data-book]').onclick = () => { BF.closeModal(); BF.openForm(u.id); };
  };

  BF.closeModal = function () {
    const m = document.getElementById('modal'); if (m) m.classList.add('hidden');
    const l = document.getElementById('lightbox');
    if (!l || l.classList.contains('hidden')) document.body.style.overflow = '';
  };
})();
