(function () {
  'use strict';
  const LS_KEY = 'bf_requests';
  let lang = localStorage.getItem('bf_lang') || 'ru';
  let settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem('bf_settings') || '{}'));
  let openCat = 'room';                         // открытая категория в каталоге
  const gIdx = { detail: 0, modal: 0 };         // текущий кадр галереи по контексту
  const lb = { unitId: null, idx: 0 };          // состояние лайтбокса (полный экран)

  const t = k => (I18N[lang] && I18N[lang][k]) || k;
  const unitById = id => UNITS.find(u => u.id === id);

  function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }
  const unitWord = n => lang === 'ru'
    ? plural(n, 'объект', 'объекта', 'объектов')
    : (n === 1 ? 'unit' : 'units');

  function loadRequests() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; } }
  function saveRequests(r) { localStorage.setItem(LS_KEY, JSON.stringify(r)); }

  function applySettings() {
    document.documentElement.style.setProperty('--sea-600', settings.primaryColor);
    const b = document.getElementById('brandName'); if (b) b.textContent = settings.brandName;
    const f = document.getElementById('footerText');
    if (f) f.innerHTML = '© ' + settings.brandName + ' · ' + settings.contactPhone;
  }
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.documentElement.lang = lang;
  }

  /* при смене страницы все всплывающие окна закрываем */
  function closeOverlays() {
    ['modal', 'formOverlay', 'lightbox'].forEach(id => {
      const el = document.getElementById(id); if (el) el.classList.add('hidden');
    });
    document.body.style.overflow = '';
  }

  function route() {
    closeOverlays();
    const h = location.hash || '#/';
    if (h.indexOf('#/unit/') === 0) renderUnit(h.split('/')[2]);
    else if (h.indexOf('#/manager') === 0) renderManager();
    else renderHome();
  }

  /* ---------- сайт ---------- */
  function renderHome() {
    const app = document.getElementById('app');

    const tiles = CATEGORIES.map(cat => {
      const nm = lang === 'ru' ? cat.name_ru : cat.name_en;
      return `<button class="cat-tile${openCat === cat.id ? ' active' : ''}" data-tile="${cat.id}">
        <span class="tile-ico">${iconHTML(cat.icon, 22)}</span>
        <span class="tile-txt"><b>${nm}</b><small>${cat.count} ${unitWord(cat.count)}</small></span>
        <span class="tile-price">${t('from')} ${cat.price.toLocaleString('ru-RU')} ₽</span>
        <span class="tile-chev">${iconHTML('chevron', 18)}</span>
      </button>`;
    }).join('');

    const cats = CATEGORIES.map(cat => {
      const cards = UNITS.filter(u => u.category === cat.id).map(cardHTML).join('');
      const nm = lang === 'ru' ? cat.name_ru : cat.name_en;
      const open = openCat === cat.id;
      return `<section class="cat${open ? ' open' : ''}" id="cat-${cat.id}">
        <button class="cat-head" data-head="${cat.id}" aria-expanded="${open}">
          <span class="ch-ico">${iconHTML(cat.icon, 20)}</span>
          <h2>${nm}</h2>
          <span class="cat-count">${cat.count}</span>
          <span class="price">${t('from')} ${cat.price.toLocaleString('ru-RU')} ${t('per_night')}</span>
          <span class="cat-chev">${iconHTML('chevron', 18)}</span>
        </button>
        <div class="grid"${open ? '' : ' hidden'}>${cards}</div>
      </section>`;
    }).join('');

    const terr = TERRITORY.map(x => `<div class="terr">
        <span class="terr-ico">${iconHTML(x.icon, 24)}</span>
        <span>${lang === 'ru' ? x.name_ru : x.name_en}</span>
      </div>`).join('');

    app.innerHTML = `
      <section class="hero">
        <div class="wrap">
          <h1>${t('hero_title')}</h1>
          <p>${t('hero_sub')}</p>
          <a class="btn" href="#catalog">${t('hero_cta')}</a>
        </div>
      </section>
      <section class="catalog wrap" id="catalog">
        <div class="sec-head"><h2>${t('catalog_title')}</h2><p>${t('catalog_sub')}</p></div>
        <div class="cat-tiles">${tiles}</div>
        ${cats}
        <div class="rest-teaser">
          <h3>${iconHTML('utensils', 20)} ${t('restaurant_title')}</h3>
          <p>${t('restaurant_soon')}</p>
        </div>
      </section>
      <section class="territory wrap" id="territory">
        <div class="sec-head"><h2>${t('territory_title')}</h2><p>${t('territory_sub')}</p></div>
        <div class="terr-grid">${terr}</div>
      </section>
      <section class="cta wrap">
        <a class="btn" href="#catalog">${t('hero_cta')}</a>
      </section>`;
  }

  /* открытие/закрытие категории без перерисовки всей страницы */
  function setCatOpen(id, open) {
    document.querySelectorAll('.cat').forEach(s => {
      const sid = s.id.replace('cat-', '');
      const isOpen = (sid === id) ? open : false;
      s.classList.toggle('open', isOpen);
      const g = s.querySelector('.grid');
      if (g) g.classList.toggle('hidden', !isOpen);
      const h = s.querySelector('.cat-head');
      if (h) h.setAttribute('aria-expanded', String(isOpen));
    });
    document.querySelectorAll('[data-tile]').forEach(b => b.classList.toggle('active', b.dataset.tile === id));
    openCat = open ? id : null;
  }

  function cardHTML(u) {
    const name = lang === 'ru' ? u.name_ru : u.name_en;
    const desc = lang === 'ru' ? u.desc_ru : u.desc_en;
    return `<article class="card">
      <div class="card-photo">
        <img src="${u.photos[0].svg}" alt="${name}">
        <span class="code-chip">${u.code}</span>
      </div>
      <div class="card-body">
        <h3>${name}</h3>
        <p class="card-desc">${desc}</p>
        <div class="card-meta"><span>${t('capacity')}: ${u.capacity}</span><span>${t('beds')}: ${u.beds}</span></div>
        <div class="card-foot">
          <span class="price">${u.price.toLocaleString('ru-RU')} ${t('per_night')}</span>
          <button class="btn small" data-details="${u.id}">${t('details')}</button>
        </div>
      </div>
    </article>`;
  }

  function renderUnit(id) {
    const u = unitById(id);
    if (!u) { renderHome(); return; }
    const name = lang === 'ru' ? u.name_ru : u.name_en;
    const desc = lang === 'ru' ? u.desc_ru : u.desc_en;
    const amen = u.amenities.map(a => `<li>${a}</li>`).join('');
    document.getElementById('app').innerHTML = `
      <section class="wrap detail">
        <a class="back" href="#catalog">← ${t('nav_catalog')}</a>
        <div class="detail-grid">
          ${galleryHTML(u, 'detail')}
          <div>
            <h1>${name}</h1>
            <p>${desc}</p>
            <ul class="amen">${amen}</ul>
            <div class="card-meta"><span>${t('capacity')}: ${u.capacity}</span><span>${t('beds')}: ${u.beds}</span><span class="price">${u.price.toLocaleString('ru-RU')} ${t('per_night')}</span></div>
            <button class="btn" data-book="${u.id}" style="margin-top:14px">${t('book')}</button>
          </div>
        </div>
      </section>`;
    setGallery('detail', u.id, 0);
    wireGallery('detail', u.id);
    const b = document.querySelector('[data-book]'); if (b) b.onclick = () => openForm(u.id);
  }

  /* ---------- галерея фото (общий компонент) ---------- */
  function galleryHTML(u, suffix) {
    const imgs = u.photos.map(p => `<img class="g-img" src="${p.svg}" alt="${t(p.labelKey)}">`).join('');
    const thumbs = u.photos.map((p, i) => `<button class="g-thumb active" data-i="${i}"><img src="${p.svg}" alt=""></button>`).join('');
    return `<div class="gallery" id="gallery-${suffix}">
      <div class="g-view">
        <button class="g-nav prev" data-dir="-1" aria-label="prev">‹</button>
        <div class="g-track">${imgs}</div>
        <button class="g-nav next" data-dir="1" aria-label="next">›</button>
        <button class="g-fs" data-fs aria-label="fullscreen" title="${t('fullscreen')}">⤢</button>
        <span class="g-cap" id="gcap-${suffix}"></span>
      </div>
      <div class="g-thumbs">${thumbs}</div>
    </div>`;
  }

  function setGallery(suffix, unitId, idx) {
    const u = unitById(unitId); if (!u) return;
    gIdx[suffix] = idx;
    const g = document.getElementById('gallery-' + suffix); if (!g) return;
    g.querySelector('.g-track').style.transform = 'translateX(' + (-idx * 100) + '%)';
    g.querySelectorAll('.g-thumb').forEach((b, i) => b.classList.toggle('active', i === idx));
    const cap = document.getElementById('gcap-' + suffix);
    if (cap) cap.textContent = t(u.photos[idx].labelKey) + ' ' + (idx + 1) + '/' + u.photos.length;
  }

  function wireGallery(suffix, unitId) {
    const g = document.getElementById('gallery-' + suffix); if (!g) return;
    const u = unitById(unitId);
    g.querySelectorAll('.g-nav').forEach(b => b.onclick = () => {
      const d = parseInt(b.dataset.dir, 10);
      setGallery(suffix, unitId, (gIdx[suffix] + d + u.photos.length) % u.photos.length);
    });
    g.querySelectorAll('.g-thumb').forEach(b => b.onclick = () => setGallery(suffix, unitId, parseInt(b.dataset.i, 10)));
    const fs = g.querySelector('.g-fs'); if (fs) fs.onclick = () => openLightbox(unitId, gIdx[suffix]);
    addSwipe(g.querySelector('.g-view'),
      () => setGallery(suffix, unitId, (gIdx[suffix] - 1 + u.photos.length) % u.photos.length),
      () => setGallery(suffix, unitId, (gIdx[suffix] + 1) % u.photos.length));
  }

  /* ---------- лайтбокс (полный экран) ---------- */
  function openLightbox(unitId, idx) {
    lb.unitId = unitId; lb.idx = idx || 0;
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
      el.querySelector('.lb-back').onclick = closeLightbox;
      el.querySelector('.lb-close').onclick = closeLightbox;
      el.querySelector('.lb-nav.prev').onclick = () => lbStep(-1);
      el.querySelector('.lb-nav.next').onclick = () => lbStep(1);
      addSwipe(el.querySelector('.lb-img'), () => lbStep(-1), () => lbStep(1));
      document.addEventListener('keydown', lbKey);
    }
    renderLightbox();
    el.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function lbStep(d) {
    const u = unitById(lb.unitId); if (!u) return;
    lb.idx = (lb.idx + d + u.photos.length) % u.photos.length;
    renderLightbox();
  }
  function renderLightbox() {
    const u = unitById(lb.unitId); if (!u) return;
    const el = document.getElementById('lightbox');
    el.querySelector('.lb-img').src = u.photos[lb.idx].svg;
    el.querySelector('.lb-cap').textContent = t(u.photos[lb.idx].labelKey);
    el.querySelector('.lb-counter').textContent = (lb.idx + 1) + ' / ' + u.photos.length;
  }
  function closeLightbox() {
    const el = document.getElementById('lightbox'); if (el) el.classList.add('hidden');
    const m = document.getElementById('modal');
    if (!m || m.classList.contains('hidden')) document.body.style.overflow = '';
  }
  function lbKey(e) {
    const el = document.getElementById('lightbox'); if (!el || el.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'ArrowRight') lbStep(1);
  }

  /* свайп: guard(e) — если вернул true, жест игнорируется (свайп по фото внутри галереи) */
  function addSwipe(el, left, right, guard) {
    if (!el) return;
    let x0 = null;
    el.addEventListener('touchstart', e => { if (guard && guard(e)) { x0 = null; return; } x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { if (dx < 0) right(); else left(); }
      x0 = null;
    });
  }

  /* ---------- модалка: листание объектов в панели внизу ---------- */
  let modalList = [], modalIdx = 0;
  function openModal(unitId) {
    const u = unitById(unitId);
    modalList = UNITS.filter(x => x.category === u.category);
    modalIdx = modalList.findIndex(x => x.id === unitId);
    showModal();
    document.body.style.overflow = 'hidden';
  }
  function showModal() {
    const u = modalList[modalIdx];
    const name = lang === 'ru' ? u.name_ru : u.name_en;
    const desc = lang === 'ru' ? u.desc_ru : u.desc_en;
    const amen = u.amenities.map(a => `<li>${a}</li>`).join('');
    let m = document.getElementById('modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'modal'; m.className = 'modal hidden';
      m.innerHTML = `<div class="modal-back"></div><div class="modal-box">
        <button class="modal-close" aria-label="close">×</button>
        <div class="modal-content"></div></div>`;
      document.body.appendChild(m);
      m.querySelector('.modal-back').onclick = closeModal;
      m.querySelector('.modal-close').onclick = closeModal;
    }
    m.querySelector('.modal-content').innerHTML = `
      ${galleryHTML(u, 'modal')}
      <h3 style="margin-top:14px">${name}</h3>
      <p>${desc}</p>
      <ul class="amen">${amen}</ul>
      <div class="card-meta"><span>${t('capacity')}: ${u.capacity}</span><span>${t('beds')}: ${u.beds}</span><span class="price">${u.price.toLocaleString('ru-RU')} ${t('per_night')}</span></div>
      <button class="btn" data-book="${u.id}" style="margin-top:14px">${t('book')}</button>
      <div class="modal-nav">
        <button class="mnav prev" aria-label="prev">‹</button>
        <span class="mnav-label">${modalIdx + 1} / ${modalList.length} · ${name}</span>
        <button class="mnav next" aria-label="next">›</button>
      </div>`;
    setGallery('modal', u.id, 0);
    wireGallery('modal', u.id);

    const box = m.querySelector('.modal-content');
    box.querySelector('.mnav.prev').onclick = () => { modalIdx = (modalIdx - 1 + modalList.length) % modalList.length; showModal(); };
    box.querySelector('.mnav.next').onclick = () => { modalIdx = (modalIdx + 1) % modalList.length; showModal(); };
    addSwipe(box,
      () => { modalIdx = (modalIdx - 1 + modalList.length) % modalList.length; showModal(); },
      () => { modalIdx = (modalIdx + 1) % modalList.length; showModal(); },
      e => !!(e.target.closest && e.target.closest('.g-view')));

    m.classList.remove('hidden');
    m.querySelector('[data-book]').onclick = () => { closeModal(); openForm(u.id); };
  }
  function closeModal() {
    const m = document.getElementById('modal'); if (m) m.classList.add('hidden');
    const l = document.getElementById('lightbox');
    if (!l || l.classList.contains('hidden')) document.body.style.overflow = '';
  }

  /* ---------- форма заявки ---------- */
  function openForm(unitId) {
    const u = unitById(unitId);
    const name = lang === 'ru' ? u.name_ru : u.name_en;
    let f = document.getElementById('formOverlay');
    if (!f) {
      f = document.createElement('div'); f.id = 'formOverlay'; f.className = 'modal hidden';
      f.innerHTML = `<div class="modal-back"></div><div class="modal-box form-box">
        <button class="modal-close" aria-label="close">×</button><div class="form-content"></div></div>`;
      document.body.appendChild(f);
      f.querySelector('.modal-back').onclick = () => f.classList.add('hidden');
      f.querySelector('.modal-close').onclick = () => f.classList.add('hidden');
    }
    f.querySelector('.form-content').innerHTML = `
      <h3>${t('request_title')}</h3>
      <p class="muted">${name} · ${t('request_sub')}</p>
      <form id="reqForm">
        <label>${t('f_name')}<input name="name" required></label>
        <label>${t('f_phone')}<input name="phone" required></label>
        <div class="row">
          <label>${t('f_checkin')}<input type="date" name="checkin" required></label>
          <label>${t('f_checkout')}<input type="date" name="checkout" required></label>
        </div>
        <div class="row">
          <label>${t('f_adults')}<input type="number" name="adults" min="1" max="20" value="2"></label>
          <label class="kids-field off">${t('f_kids')}<input type="number" name="kids" min="0" max="10" value="1" disabled></label>
        </div>
        <label class="check-line">
          <input type="checkbox" name="hasKids">
          <span class="check-box">${iconHTML('check', 14)}</span>
          <span>${t('f_has_kids')}</span>
        </label>
        <p class="muted total-line">${t('f_total')}: <b id="guestsTotal">2</b></p>
        <label>${t('f_comment')}<textarea name="comment" rows="2"></textarea></label>
        <input type="hidden" name="unitId" value="${u.id}">
        <button class="btn" type="submit">${t('send')}</button>
      </form>
      <p class="ok hidden" id="okMsg">${t('sent')}</p>`;

    const form = f.querySelector('#reqForm');
    const cb = form.querySelector('[name=hasKids]');
    const kidsField = form.querySelector('.kids-field');
    const kidsInput = form.querySelector('[name=kids]');
    const adultsInput = form.querySelector('[name=adults]');
    const totalEl = form.querySelector('#guestsTotal');
    function updTotal() {
      const a = Math.max(0, parseInt(adultsInput.value || '0', 10) || 0);
      const k = cb.checked ? Math.max(0, parseInt(kidsInput.value || '0', 10) || 0) : 0;
      totalEl.textContent = String(a + k);
    }
    cb.addEventListener('change', () => {
      kidsField.classList.toggle('off', !cb.checked);
      kidsInput.disabled = !cb.checked;
      updTotal();
    });
    adultsInput.addEventListener('input', updTotal);
    kidsInput.addEventListener('input', updTotal);
    updTotal();

    f.classList.remove('hidden');
    form.onsubmit = ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      const adults = Math.max(1, parseInt(d.adults || '1', 10) || 1);
      const kids = d.hasKids ? Math.max(0, parseInt(d.kids || '0', 10) || 0) : 0;
      const reqs = loadRequests();
      reqs.push({
        id: 'r' + Date.now(), unitId: d.unitId, unitName: name,
        name: d.name, phone: d.phone, checkin: d.checkin, checkout: d.checkout,
        adults: adults, kids: kids, guests: adults + kids,
        comment: d.comment, status: 'new', createdAt: new Date().toISOString()
      });
      saveRequests(reqs);
      f.querySelector('#okMsg').classList.remove('hidden');
      setTimeout(() => f.classList.add('hidden'), 1600);
    };
  }

  /* ---------- админка ---------- */
  function renderManager() {
    const reqs = loadRequests();
    const rows = reqs.length ? reqs.map(r => {
      const st = r.status === 'confirmed' ? `<span class="tag ok">${t('confirmed')}</span>`
        : r.status === 'rejected' ? `<span class="tag bad">${t('rejected')}</span>`
        : `<span class="tag">${t('new')}</span>`;
      const acts = r.status === 'new'
        ? `<button class="btn small" data-confirm="${r.id}">${t('confirm')}</button> <button class="btn small ghost" data-reject="${r.id}">${t('reject')}</button>`
        : '';
      const adults = r.adults != null ? r.adults : r.guests;
      const kids = r.kids || 0;
      const who = kids > 0
        ? `${adults} ${t('m_adults')} + ${kids} ${t('m_kids')}`
        : `${adults} ${t('m_adults')}`;
      return `<tr>
        <td data-label="${t('m_unit')}">${r.unitName}</td>
        <td data-label="${t('m_guest')}">${r.name}<br><small class="muted">${r.phone}</small></td>
        <td data-label="${t('m_dates')}">${r.checkin} → ${r.checkout}<br><small class="muted">${who}</small></td>
        <td data-label="${t('m_status')}">${st}</td><td data-label="${t('m_actions')}">${acts}</td></tr>`;
    }).join('') : `<tr><td colspan="5" class="empty">${t('empty')}</td></tr>`;

    const s = settings;
    document.getElementById('app').innerHTML = `
      <section class="wrap manager">
        <div class="sec-head" style="text-align:left;margin:24px 0"><h2>${t('manager_title')}</h2><p>${t('manager_sub')}</p></div>
        <div class="panel">
          <h3>${t('settings_title')}</h3>
          <label>${t('s_brand')}<input id="setBrand" value="${s.brandName}"></label>
          <label>${t('s_color')}<input id="setColor" type="color" value="${s.primaryColor}"></label>
          <label>${t('s_phone')}<input id="setPhone" value="${s.contactPhone}"></label>
          <button class="btn small" id="saveSettings">${t('s_save')}</button>
        </div>
        <table class="req-table">
          <thead><tr><th>${t('m_unit')}</th><th>${t('m_guest')}</th><th>${t('m_dates')}</th><th>${t('m_status')}</th><th>${t('m_actions')}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    document.querySelectorAll('[data-confirm]').forEach(b => b.onclick = () => setStatus(b.dataset.confirm, 'confirmed'));
    document.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => setStatus(b.dataset.reject, 'rejected'));
    document.getElementById('saveSettings').onclick = () => {
      settings.brandName = document.getElementById('setBrand').value;
      settings.primaryColor = document.getElementById('setColor').value;
      settings.contactPhone = document.getElementById('setPhone').value;
      localStorage.setItem('bf_settings', JSON.stringify(settings));
      applySettings(); applyLang();
    };
  }
  function setStatus(id, status) {
    const reqs = loadRequests(); const r = reqs.find(x => x.id === id);
    if (r) r.status = status; saveRequests(reqs); renderManager();
  }

  /* ---------- делегирование кликов по сайту ---------- */
  document.getElementById('app').addEventListener('click', e => {
    const tile = e.target.closest('[data-tile]');
    if (tile) {
      setCatOpen(tile.dataset.tile, true);
      const sec = document.getElementById('cat-' + tile.dataset.tile);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const head = e.target.closest('[data-head]');
    if (head) {
      const id = head.dataset.head;
      const isOpen = head.getAttribute('aria-expanded') === 'true';
      setCatOpen(id, !isOpen);
      return;
    }
    const d = e.target.closest('[data-details]');
    if (d) openModal(d.dataset.details);
  });

  /* ---------- переключатель языка ---------- */
  document.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => {
    lang = b.dataset.lang; localStorage.setItem('bf_lang', lang);
    document.querySelectorAll('.lang-btn').forEach(x => x.classList.toggle('active', x === b));
    applyLang(); route();
  });

  window.addEventListener('hashchange', route);

  /* ---------- запуск ---------- */
  applySettings();
  applyLang();
  route();
})();
