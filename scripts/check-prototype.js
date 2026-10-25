// Проверка прототипа baza-friends в реальном Chrome (headless), мобильный размер 500px.
// Запуск: node scripts/check-prototype.js
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:8000/';

const results = [];
function check(name, ok, extra) {
  results.push({ name, ok, extra: extra || '' });
  console.log((ok ? 'OK   ' : 'FAIL ') + name + (extra ? '  -> ' + extra : ''));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 900, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  check('Страница открылась без JS-ошибок', errors.length === 0, errors.join(' | '));

  // 1. Нет горизонтальной прокрутки страницы
  const hOverflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, iw: window.innerWidth
  }));
  check('Страница без горизонтальной прокрутки', hOverflow.sw <= hOverflow.iw + 1, `scrollWidth=${hOverflow.sw} innerWidth=${hOverflow.iw}`);

  // 2. Плитки категорий
  const tiles = await page.$$eval('[data-tile]', els => els.map(e => e.dataset.tile));
  check('Плитки категорий на месте (3 шт.)', tiles.length === 3, tiles.join(','));

  // 3. Клик по плитке «2-этажные дома» открывает нужную категорию и закрывает остальные
  await page.click('[data-tile="house"]');
  await new Promise(r => setTimeout(r, 500));
  const catState = await page.evaluate(() => ({
    houseOpen: !document.querySelector('#cat-house .grid').classList.contains('hidden'),
    houseCards: document.querySelectorAll('#cat-house .card').length,
    roomOpen: !document.querySelector('#cat-room .grid').classList.contains('hidden'),
    activeTile: (function () { const el = document.querySelector('[data-tile].active'); return el ? el.dataset.tile : null; })()
  }));
  check('Клик по плитке открывает «2-этажные дома»', catState.houseOpen && catState.houseCards === 3, JSON.stringify(catState));
  check('Остальные категории свёрнуты', catState.roomOpen === false, 'roomOpen=' + catState.roomOpen);
  check('Активной отмечена нажатая плитка', catState.activeTile === 'house', 'activeTile=' + catState.activeTile);

  // 3б. Дублирующих заголовков категорий больше нет — только одна панель переключения
  const noDup = await page.evaluate(() => ({
    heads: document.querySelectorAll('.cat-head').length,
    bars: document.querySelectorAll('.cat-bar').length,
    tiles: document.querySelectorAll('.cat-tile').length
  }));
  check('Дублирующие заголовки убраны, панель категорий одна', noDup.heads === 0 && noDup.bars === 1 && noDup.tiles === 3, JSON.stringify(noDup));

  // 3в. Панель категорий закрепляется при прокрутке
  const sticky = await page.evaluate(() => {
    const bar = document.querySelector('.cat-bar');
    return { pos: getComputedStyle(bar).position };
  });
  check('Панель категорий закрепляется (sticky)', sticky.pos === 'sticky', JSON.stringify(sticky));

  // 3г. На телефоне панель компактная: чипы в один ряд (в покое, не закреплённая)
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  const compact = await page.evaluate(() => {
    const bar = document.querySelector('.cat-bar');
    const tiles = [...document.querySelectorAll('.cat-tile')];
    return {
      pinned: bar.classList.contains('pinned'),
      barH: Math.round(bar.getBoundingClientRect().height),
      tileH: Math.round(tiles[0].getBoundingClientRect().height),
      tileW: Math.round(tiles[0].getBoundingClientRect().width)
    };
  });
  check('Панель категорий на телефоне компактная (чипы в ряд)',
    compact.pinned === false && compact.tileH <= 46 && compact.tileW < 200, JSON.stringify(compact));

  // 3д. В закреплённом виде активная категория во всю ширину, остальные — свёрнутые
  await page.evaluate(() => window.scrollTo(0, 900));
  await new Promise(r => setTimeout(r, 400));
  const pinned = await page.evaluate(() => {
    const bar = document.querySelector('.cat-bar');
    const active = document.querySelector('.cat-tile.active');
    const others = [...document.querySelectorAll('.cat-tile:not(.active)')];
    return {
      pinned: bar.classList.contains('pinned'),
      activeW: Math.round(active.getBoundingClientRect().width),
      otherW: others.length ? Math.round(others[0].getBoundingClientRect().width) : 0,
      barH: Math.round(bar.getBoundingClientRect().height)
    };
  });
  check('При закреплении активная — во всю ширину, остальные — компактные',
    pinned.pinned && pinned.activeW > pinned.otherW * 1.8, JSON.stringify(pinned));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 300));

  // 4. Модалка по клику на карточку
  await page.click('#cat-house [data-details]');
  await new Promise(r => setTimeout(r, 400));
  const modal = await page.evaluate(() => {
    const m = document.getElementById('modal');
    const box = m.querySelector('.modal-box');
    const nav = m.querySelector('.g-nav');
    return {
      visible: !m.classList.contains('hidden'),
      hasGallery: !!m.querySelector('.gallery'),
      navInsidePhoto: !!(nav && nav.closest('.g-view')),
      hasMnav: !!m.querySelector('.modal-nav'),
      oldFloatArrows: m.querySelectorAll('.swipe').length,
      boxOverflow: box.scrollWidth - box.clientWidth,
      docOverflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check('Модалка открылась', modal.visible);
  check('В модалке есть галерея фото', modal.hasGallery);
  check('Стрелки листания фото — внутри снимка', modal.navInsidePhoto);
  check('Листание объектов — панелью внизу (плавающих стрелок нет)', modal.hasMnav && modal.oldFloatArrows === 0);
  check('В модалке нет горизонтальной прокрутки', modal.boxOverflow <= 1, 'overflow=' + modal.boxOverflow);
  check('Страница не уехала вбок при открытой модалке', modal.docOverflow <= 1, 'overflow=' + modal.docOverflow);

  // 5. Листание фото стрелкой
  const before = await page.evaluate(() => document.querySelector('#gallery-modal .g-track').style.transform);
  await page.click('#gallery-modal .g-nav.next');
  await new Promise(r => setTimeout(r, 350));
  const after = await page.evaluate(() => ({
    tr: document.querySelector('#gallery-modal .g-track').style.transform,
    cap: document.getElementById('gcap-modal').textContent
  }));
  check('Стрелка «вправо» листает фото', before !== after.tr, `${before} -> ${after.tr} (${after.cap})`);

  // 6. Полный экран
  await page.click('#gallery-modal .g-fs');
  await new Promise(r => setTimeout(r, 300));
  const lb = await page.evaluate(() => {
    const l = document.getElementById('lightbox');
    return {
      visible: !l.classList.contains('hidden'),
      src: (l.querySelector('.lb-img').getAttribute('src') || '').slice(0, 30),
      counter: l.querySelector('.lb-counter').textContent
    };
  });
  check('Полноэкранный просмотр открылся', lb.visible && lb.src.startsWith('data:image/svg+xml'), JSON.stringify(lb));

  // листание в полном экране
  await page.click('#lightbox .lb-nav.next');
  await new Promise(r => setTimeout(r, 250));
  const lb2 = await page.evaluate(() => document.querySelector('#lightbox .lb-counter').textContent);
  check('В полном экране фото листается', lb2 !== lb.counter, `${lb.counter} -> ${lb2}`);
  await page.click('#lightbox .lb-close');
  await new Promise(r => setTimeout(r, 200));

  // 7. Форма: чекбокс «Есть дети»
  await page.click('#modal [data-book]');
  await new Promise(r => setTimeout(r, 400));
  const formState0 = await page.evaluate(() => {
    const f = document.querySelector('#reqForm');
    return {
      visible: !document.getElementById('formOverlay').classList.contains('hidden'),
      hasCheckbox: !!f.querySelector('[name=hasKids]'),
      kidsDisabled: f.querySelector('[name=kids]').disabled,
      total: f.querySelector('#guestsTotal').textContent
    };
  });
  check('Форма заявки открылась', formState0.visible);
  check('Есть чекбокс «Есть дети»', formState0.hasCheckbox);
  check('Поле «детей» выключено, пока чекбокс не нажат', formState0.kidsDisabled === true);
  check('Показывает 2 гостя по умолчанию', formState0.total === '2', 'total=' + formState0.total);

  await page.click('#reqForm .check-line .check-box');
  await new Promise(r => setTimeout(r, 250));
  const formState1 = await page.evaluate(() => {
    const f = document.querySelector('#reqForm');
    f.querySelector('[name=kids]').value = '3';
    f.querySelector('[name=kids]').dispatchEvent(new Event('input', { bubbles: true }));
    return {
      kidsDisabled: f.querySelector('[name=kids]').disabled,
      kidsVisible: !f.querySelector('.kids-field').classList.contains('off'),
      total: f.querySelector('#guestsTotal').textContent
    };
  });
  check('После галочки поле «детей» доступно', formState1.kidsDisabled === false && formState1.kidsVisible);
  check('Итого гостей пересчитано (2 взр. + 3 дет. = 5)', formState1.total === '5', 'total=' + formState1.total);

  // 8. Отправка заявки
  await page.type('#reqForm [name=name]', 'Тест Тестов');
  await page.type('#reqForm [name=phone]', '+7 900 000 00 00');
  await page.evaluate(() => {
    const f = document.querySelector('#reqForm');
    f.querySelector('[name=checkin]').value = '2026-08-01';
    f.querySelector('[name=checkout]').value = '2026-08-05';
  });
  await page.click('#reqForm button[type=submit]');
  await new Promise(r => setTimeout(r, 400));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bf_requests') || '[]'));
  const last = saved[saved.length - 1] || {};
  check('Заявка сохранена', saved.length > 0, JSON.stringify(last));
  check('В заявке есть дети (kids=3, guests=5)', last.kids === 3 && last.guests === 5, JSON.stringify({ kids: last.kids, guests: last.guests }));

  // 9. Админка видит заявку и показывает детей
  await page.evaluate(() => { location.hash = '#/manager'; });
  await new Promise(r => setTimeout(r, 400));
  const adminRow = await page.evaluate(() => {
    const tr = document.querySelector('.req-table tbody tr');
    return tr ? tr.textContent.replace(/\s+/g, ' ').trim() : '';
  });
  check('Админка показывает заявку с детьми', /дет/i.test(adminRow), adminRow);

  // 10. Иконки: ни одного эмодзи, SVG-иконки на месте — на главной
  await page.evaluate(() => { location.hash = '#/'; });
  await new Promise(r => setTimeout(r, 400));
  const home = await page.evaluate(() => ({
    emoji: (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).join(' '),
    icons: document.querySelectorAll('svg.ic').length,
    terrIcons: document.querySelectorAll('.terr-ico svg').length,
    tileIcons: document.querySelectorAll('.tile-ico svg').length
  }));
  check('Эмодзи на главной не остались', home.emoji === '', home.emoji);
  check('SVG-иконки отрисованы', home.icons > 10, 'иконок: ' + home.icons);
  check('Иконки в плитках и в блоке территории', home.tileIcons === 3 && home.terrIcons === 7, `плитки=${home.tileIcons} территория=${home.terrIcons}`);

  // 10б. Территория: карточки с фотографиями
  const terr = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.terr-card')];
    return {
      cards: cards.length,
      photos: cards.filter(c => {
        const img = c.querySelector('img');
        return img && (img.getAttribute('src') || '').startsWith('data:image/svg+xml');
      }).length,
      captions: document.querySelectorAll('.terr-card figcaption').length
    };
  });
  check('В блоке территории — 7 карточек с фото', terr.cards === 7 && terr.photos === 7 && terr.captions === 7, JSON.stringify(terr));

  // 10в. Фото территории открывается на весь экран
  await page.click('.terr-card');
  await new Promise(r => setTimeout(r, 350));
  const terrLb = await page.evaluate(() => {
    const l = document.getElementById('lightbox');
    return { visible: !!(l && !l.classList.contains('hidden')), cap: l ? l.querySelector('.lb-cap').textContent : '' };
  });
  check('Фото территории открывается на весь экран', terrLb.visible && terrLb.cap.length > 0, JSON.stringify(terrLb));
  await page.click('#lightbox .lb-close');
  await new Promise(r => setTimeout(r, 250));

  // 11. То же самое в админке
  await page.evaluate(() => { location.hash = '#/manager'; });
  await new Promise(r => setTimeout(r, 400));
  const adminEmoji = await page.evaluate(() => (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).join(' '));
  check('Эмодзи в админке не остались', adminEmoji === '', adminEmoji);

  await page.screenshot({ path: 'scripts/shot-mobile.png' });
  await page.evaluate(() => { location.hash = '#/'; });
  await new Promise(r => setTimeout(r, 400));
  await page.click('[data-tile="cottage"]');
  await new Promise(r => setTimeout(r, 500));
  await page.click('#cat-cottage [data-details]');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scripts/shot-modal.png' });

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log('\nИтог: ' + (results.length - failed.length) + '/' + results.length + ' проверок пройдено');
  if (failed.length) { console.log('Провалено: ' + failed.map(f => f.name).join('; ')); process.exit(1); }
})().catch(e => { console.error('ОШИБКА ТЕСТА:', e); process.exit(2); });
