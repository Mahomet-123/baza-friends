// Снимки экрана прототипа: мобильный (500px) и десктоп (1280px)
const puppeteer = require('puppeteer-core');
const path = require('path');

const OUT = __dirname;
const URL = 'http://localhost:8000/';

(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new', args: ['--no-sandbox']
  });

  // --- мобильный ---
  const m = await b.newPage();
  await m.setViewport({ width: 500, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // прокрутка к плиткам категорий
  await m.evaluate(() => document.querySelector('.cat-tiles').scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 500));
  await m.screenshot({ path: path.join(OUT, 'm1-tiles.png') });

  // открыть «2-этажные дома»
  await m.click('[data-tile="house"]');
  await new Promise(r => setTimeout(r, 600));
  await m.screenshot({ path: path.join(OUT, 'm2-category.png') });

  // модалка
  await m.click('#cat-house [data-details]');
  await new Promise(r => setTimeout(r, 600));
  await m.screenshot({ path: path.join(OUT, 'm3-modal.png') });

  // крупный план галереи (снимок самого элемента)
  const gEl = await m.$('#gallery-modal .g-view');
  if (gEl) await gEl.screenshot({ path: path.join(OUT, 'm4-arrows.png') });

  // полный экран
  await m.click('#gallery-modal .g-fs');
  await new Promise(r => setTimeout(r, 500));
  await m.screenshot({ path: path.join(OUT, 'm5-fullscreen.png') });
  await m.click('#lightbox .lb-close');
  await new Promise(r => setTimeout(r, 300));

  // форма с детьми
  await m.click('#modal [data-book]');
  await new Promise(r => setTimeout(r, 500));
  await m.click('#reqForm .check-line .check-box');
  await new Promise(r => setTimeout(r, 300));
  await m.screenshot({ path: path.join(OUT, 'm6-form.png') });

  // админка с заявкой
  await m.evaluate(() => {
    localStorage.setItem('bf_requests', JSON.stringify([
      { id: 'r1', unitId: 'house-1', unitName: '2-этажные дома №1', name: 'Иван Петров', phone: '+7 928 556 22 33', checkin: '2026-08-01', checkout: '2026-08-05', adults: 2, kids: 1, guests: 3, comment: 'С детьми', status: 'new', createdAt: new Date().toISOString() },
      { id: 'r2', unitId: 'cottage-2', unitName: 'Коттеджи №2', name: 'Мария Смирнова', phone: '+7 903 111 22 33', checkin: '2026-08-10', checkout: '2026-08-14', adults: 3, kids: 0, guests: 3, comment: '', status: 'confirmed', createdAt: new Date().toISOString() }
    ]));
  });
  await m.evaluate(() => { location.hash = '#/manager'; });
  await new Promise(r => setTimeout(r, 600));
  await m.screenshot({ path: path.join(OUT, 'm7-admin.png') });

  // --- десктоп ---
  const d = await b.newPage();
  await d.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await d.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await d.evaluate(() => document.querySelector('.cat-tiles').scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  await d.screenshot({ path: path.join(OUT, 'd1-desktop.png') });

  // территория с новыми иконками
  await d.evaluate(() => document.querySelector('.terr-grid').scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 400));
  await d.screenshot({ path: path.join(OUT, 'd2-territory.png') });

  await d.setViewport({ width: 500, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await d.evaluate(() => document.querySelector('.terr-grid').scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  await d.screenshot({ path: path.join(OUT, 'm8-territory.png') });

  await b.close();
  console.log('Снимки готовы в папке scripts/');
})();
