/* Главная страница: hero + каталог 3 категорий (аккордеон) +
   территория + CTA. Панель категорий закрепляется при прокрутке.
   В каталоге можно выбрать даты — тогда занятые объекты помечаются
   «Занято» и становятся некликабельными (данные занятости из CRM). */
(function () {
  'use strict';
  const BF = window.BF = window.BF || {};
  const S = BF.state;

  /* высота верхней шапки — от неё считаем, где закрепляется панель категорий */
  BF.headerH = function () {
    const h = document.querySelector('.site-header');
    return h ? h.offsetHeight : 64;
  };

  /* панель категорий «прилипла» к верху экрана — ставим класс .pinned */
  BF.updatePin = function () {
    const bar = document.getElementById('catBar');
    if (!bar) return;
    bar.classList.toggle('pinned', bar.getBoundingClientRect().top <= BF.headerH() + 1);
  };

  /* переход к карточкам категории с поправкой на шапку и закреплённую панель */
  BF.scrollToCat = function (id) {
    const sec = document.getElementById('cat-' + id);
    if (!sec) return;
    const bar = document.getElementById('catBar');
    const barH = bar ? bar.offsetHeight : 0;
    const top = window.scrollY + sec.getBoundingClientRect().top - barH - BF.headerH() - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  /* открытие/закрытие категории без перерисовки всей страницы */
  BF.setCatOpen = function (id, open) {
    document.querySelectorAll('.cat').forEach(s => {
      const sid = s.id.replace('cat-', '');
      const isOpen = (sid === id) ? open : false;
      s.classList.toggle('open', isOpen);
      const g = s.querySelector('.grid');
      if (g) g.classList.toggle('hidden', !isOpen);
    });
    document.querySelectorAll('[data-tile]').forEach(b => {
      const on = b.dataset.tile === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    S.openCat = open ? id : null;
  };

  /* плитки переключения категорий */
  BF.catTilesHTML = function () {
    return CATEGORIES.map(cat => {
      const nm = S.lang === 'ru' ? cat.name_ru : cat.name_en;
      const sh = S.lang === 'ru' ? cat.short_ru : cat.short_en;
      const act = S.openCat === cat.id;
      return `<button class="cat-tile${act ? ' active' : ''}" data-tile="${cat.id}" aria-pressed="${act}">
        <span class="tile-ico">${iconHTML(cat.icon, 22)}</span>
        <span class="tile-txt"><b>${nm}</b><small>${cat.count} ${BF.unitWord(cat.count)}</small></span>
        <span class="tile-short">${sh}</span>
        <span class="tile-price">${BF.t('from')} ${cat.price.toLocaleString('ru-RU')} ₽</span>
        <span class="tile-chev">${iconHTML('chevron', 18)}</span>
      </button>`;
    }).join('');
  };

  /* секции с карточками объектов по категориям */
  BF.catSectionsHTML = function () {
    return CATEGORIES.map(cat => {
      const cards = UNITS.filter(u => u.category === cat.id).map(BF.cardHTML).join('');
      const open = S.openCat === cat.id;
      return `<section class="cat${open ? ' open' : ''}" id="cat-${cat.id}">
        <div class="grid"${open ? '' : ' hidden'}>${cards}</div>
      </section>`;
    }).join('');
  };

  /* перерисовать только каталог (плитки + секции) — при смене дат */
  BF.refreshCatalog = function () {
    const tiles = document.querySelector('#catBar .cat-tiles');
    const secs = document.querySelector('.cat-sections');
    if (tiles) tiles.innerHTML = BF.catTilesHTML();
    if (secs) secs.innerHTML = BF.catSectionsHTML();
  };

  /* сколько свободных коек у объекта на выбранные даты (или null, если даты не выбраны) */
  function freeFor(u) {
    if (!S.dates.checkin || !S.dates.checkout) return null;
    return BF.unitFreeBeds(u.id, S.dates.checkin, S.dates.checkout);
  }

  BF.cardHTML = function (u) {
    const name = S.lang === 'ru' ? u.name_ru : u.name_en;
    const desc = S.lang === 'ru' ? u.desc_ru : u.desc_en;
    const free = freeFor(u);
    const occupied = free === 0;

    let footBtn, availNote = '';
    if (occupied) {
      footBtn = `<button class="btn small occ" disabled>${BF.t('occupied')}</button>`;
    } else {
      footBtn = `<button class="btn small" data-details="${u.id}">${BF.t('details')}</button>`;
      if (free && free > 0) availNote = `<span class="avail">${BF.t('free_beds')}: ${free}</span>`;
    }

    const occBadge = occupied
      ? `<span class="occ-chip">${BF.t('occupied')}</span>` : '';

    return `<article class="card${occupied ? ' occupied' : ''}">
      <div class="card-photo">
        <img src="${u.photos[0].svg}" alt="${name}">
        <span class="code-chip">${u.code}</span>
        ${occBadge}
      </div>
      <div class="card-body">
        <h3>${name}</h3>
        <p class="card-desc">${desc}</p>
        <div class="card-meta"><span>${BF.t('capacity')}: ${u.capacity}</span><span>${BF.t('beds')}: ${u.beds}</span></div>
        <div class="card-foot">
          <span class="price">${u.price.toLocaleString('ru-RU')} ${BF.t('per_night')}</span>
          ${availNote}
          ${footBtn}
        </div>
      </div>
    </article>`;
  };

  BF.renderHome = function () {
    const app = document.getElementById('app');

    const terr = TERRITORY.map((x, i) => `<figure class="terr-card" data-terr="${i}">
        <img src="${x.photo}" alt="${S.lang === 'ru' ? x.name_ru : x.name_en}" loading="lazy">
        <figcaption>
          <span class="terr-ico">${iconHTML(x.icon, 16)}</span>
          <span>${S.lang === 'ru' ? x.name_ru : x.name_en}</span>
        </figcaption>
      </figure>`).join('');

    app.innerHTML = `
      <section class="hero">
        <div class="wrap">
          <h1>${BF.t('hero_title')}</h1>
          <p>${BF.t('hero_sub')}</p>
          <a class="btn" href="#catalog">${BF.t('hero_cta')}</a>
        </div>
      </section>
      <section class="catalog wrap" id="catalog">
        <div class="sec-head"><h2>${BF.t('catalog_title')}</h2><p>${BF.t('catalog_sub')}</p></div>
        <div class="date-bar" id="dateBar">
          <label>${BF.t('f_checkin')}<input type="date" id="catCheckin" value="${S.dates.checkin}"></label>
          <label>${BF.t('f_checkout')}<input type="date" id="catCheckout" value="${S.dates.checkout}"></label>
          <span class="date-hint">${BF.t('date_hint')}</span>
        </div>
        <div class="cat-bar" id="catBar">
          <div class="cat-tiles" role="group" aria-label="${BF.t('catalog_title')}">${BF.catTilesHTML()}</div>
        </div>
        <div class="cat-sections">${BF.catSectionsHTML()}</div>
        <div class="rest-teaser">
          <h3>${iconHTML('utensils', 20)} ${BF.t('restaurant_title')}</h3>
          <p>${BF.t('restaurant_soon')}</p>
        </div>
      </section>
      <section class="territory wrap" id="territory">
        <div class="sec-head"><h2>${BF.t('territory_title')}</h2><p>${BF.t('territory_sub')}</p></div>
        <div class="terr-grid">${terr}</div>
        <p class="terr-hint">${BF.t('terr_hint')}</p>
      </section>
      <section class="cta wrap">
        <a class="btn" href="#catalog">${BF.t('hero_cta')}</a>
      </section>`;

    // переключатель дат в каталоге → пересчитываем «занято»
    const ci = document.getElementById('catCheckin');
    const co = document.getElementById('catCheckout');
    const onDate = () => {
      S.dates.checkin = ci.value || '';
      S.dates.checkout = co.value || '';
      BF.refreshCatalog();
    };
    if (ci) ci.addEventListener('change', onDate);
    if (co) co.addEventListener('change', onDate);

    BF.updatePin();
  };
})();
