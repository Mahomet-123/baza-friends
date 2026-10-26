/* Страница объекта (#/unit/:id) — для SEO и шаринга ссылок.
   Галерея + удобства + цена + кнопка заявки. */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  BF.renderUnit = function (id) {
    const u = BF.getUnit(id);
    if (!u) { BF.renderHome(); return; }
    const name = S.lang === 'ru' ? u.name_ru : u.name_en;
    const desc = S.lang === 'ru' ? u.desc_ru : u.desc_en;
    const amen = u.amenities.map(a => `<li>${a}</li>`).join('');
    document.getElementById('app').innerHTML = `
      <section class="wrap detail">
        <a class="back" href="#catalog">← ${BF.t('nav_catalog')}</a>
        <div class="detail-grid">
          ${BF.galleryHTML(u, 'detail')}
          <div>
            <h1>${name}</h1>
            <p>${desc}</p>
            <ul class="amen">${amen}</ul>
            <div class="card-meta"><span>${BF.t('capacity')}: ${u.capacity}</span><span>${BF.t('beds')}: ${u.beds}</span><span class="price">${u.price.toLocaleString('ru-RU')} ${BF.t('per_night')}</span></div>
            <button class="btn" data-book="${u.id}" style="margin-top:14px">${BF.t('book')}</button>
          </div>
        </div>
      </section>`;
    BF.setGallery('detail', u.id, 0);
    BF.wireGallery('detail', u.id);
    const b = document.querySelector('[data-book]'); if (b) b.onclick = () => BF.openForm(u.id);
  };
})();
