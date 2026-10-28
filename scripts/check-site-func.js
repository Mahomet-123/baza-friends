/* Функциональная проверка сайта после разбиения app.js на модули.
   Проверяет навесы событий: категории, модалка, галерея, форма, язык, роутинг. */
'use strict';
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:8000/';
const OUT = 'C:/Projects/Personal/baza-friends/scripts';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('response', res => { if (res.status() >= 400) errors.push('HTTP ' + res.status() + ' ' + res.url()); });
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  // чистим заявки, чтобы проверка сабмита была детерминированной
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.removeItem('bf_requests'));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  // единица для проверки роутинга детали (берём из карточки, т.к. UNITS — это global const, не window.UNITS)
  const uid = await page.evaluate(() => document.querySelector('.card [data-details]').dataset.details);

  const result = {};

  // 1) клик по плитке категории -> секция открывается
  await page.evaluate(() => {
    const t = document.querySelector('[data-tile]');
    t.click();
  });
  await new Promise(r => setTimeout(r, 200));
  result.catOpened = await page.evaluate(() => {
    const open = document.querySelector('.cat.open');
    return !!open && !open.querySelector('.grid').hasAttribute('hidden');
  });

  // 2) клик по карточке -> модалка открывается
  await page.evaluate(() => { document.querySelector('.card [data-details]').click(); });
  await new Promise(r => setTimeout(r, 300));
  result.modalOpen = await page.evaluate(() => {
    const m = document.getElementById('modal');
    return !!m && !m.classList.contains('hidden');
  });

  // 3) стрелка галереи в модалке меняет кадр
  result.galleryStep = await page.evaluate(() => {
    const track = document.querySelector('#gallery-modal .g-track');
    const before = track.style.transform;
    document.querySelector('#gallery-modal .g-nav.next').click();
    return before !== track.style.transform;
  });

  // 4) кнопка брони -> форма открывается
  await page.evaluate(() => { document.querySelector('#modal [data-book]').click(); });
  await new Promise(r => setTimeout(r, 200));
  result.formOpen = await page.evaluate(() => {
    const f = document.getElementById('formOverlay');
    return !!f && !f.classList.contains('hidden');
  });

  // 5) сабмит формы -> заявка сохранена
  await page.evaluate(() => {
    const form = document.getElementById('reqForm');
    form.querySelector('[name=name]').value = 'Функ Тест';
    form.querySelector('[name=phone]').value = '+79990000000';
    form.querySelector('[name=checkin]').value = '2026-11-01';
    form.querySelector('[name=checkout]').value = '2026-11-03';
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  await new Promise(r => setTimeout(r, 300));
  result.requestSaved = await page.evaluate(() => {
    const r = JSON.parse(localStorage.getItem('bf_requests') || '[]');
    return r.some(x => x.name === 'Функ Тест');
  });

  // 6) переключение языка -> текст hero меняется
  const heroRu = await page.evaluate(() => document.querySelector('.hero h1').textContent);
  await page.evaluate(() => { document.querySelector('.lang-btn[data-lang="en"]').click(); });
  await new Promise(r => setTimeout(r, 200));
  const heroEn = await page.evaluate(() => document.querySelector('.hero h1').textContent);
  result.langSwitch = heroRu !== heroEn;
  // вернём русский
  await page.evaluate(() => { document.querySelector('.lang-btn[data-lang="ru"]').click(); });
  await new Promise(r => setTimeout(r, 150));

  // 7) роутинг: деталь объекта
  await page.evaluate((id) => { location.hash = '#/unit/' + id; }, uid);
  await new Promise(r => setTimeout(r, 200));
  result.detailRoute = await page.evaluate(() => !!document.querySelector('.detail .back'));

  // 8) роутинг: админка
  await page.evaluate(() => { location.hash = '#/manager'; });
  await new Promise(r => setTimeout(r, 200));
  result.managerRoute = await page.evaluate(() => !!document.querySelector('.req-table'));

  await page.screenshot({ path: OUT + '/site-func-manager.png' });
  await browser.close();

  result.errorCount = errors.length;
  result.errors = errors.slice(0, 8);
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error('CHECK FAIL', e); process.exit(1); });
