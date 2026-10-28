/* Проверка сайта после подключения общих CSS: ошибки + скриншоты. */
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

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: OUT + '/site-1-home.png' });

  // прокрутка к каталогу
  await page.evaluate(() => document.querySelector('.cat-tiles').scrollIntoView({ block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: OUT + '/site-2-catalog.png' });

  // карточка объекта -> модалка
  const opened = await page.evaluate(() => {
    const c = document.querySelector('.card');
    if (c) { c.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: OUT + '/site-3-modal.png' });

  const info = await page.evaluate(() => ({
    cards: document.querySelectorAll('.card').length,
    tiles: document.querySelectorAll('.cat-tile').length,
    modalOpen: !!document.querySelector('.modal'),
    btnBg: (() => { const b = document.querySelector('.btn'); return b ? getComputedStyle(b).backgroundColor : 'нет кнопки'; })(),
    btnRadius: (() => { const b = document.querySelector('.btn'); return b ? getComputedStyle(b).borderRadius : '-'; })(),
    btnFontSize: (() => { const b = document.querySelector('.btn'); return b ? getComputedStyle(b).fontSize : '-'; })(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--sea-600').trim(),
    cardShadow: (() => { const c = document.querySelector('.card'); return c ? getComputedStyle(c).boxShadow : '-'; })()
  }));

  await browser.close();
  console.log(JSON.stringify({ opened, info, errorCount: errors.length, errors: errors.slice(0, 8) }, null, 2));
})().catch(e => { console.error('CHECK FAIL', e); process.exit(1); });
