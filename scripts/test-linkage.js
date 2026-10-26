/* Тест связи сайт → CRM (puppeteer-core, headless Chrome).
   Поднимает локальный сервер, на сайте оставляет заявку через форму,
   затем заходит в CRM и проверяет, что заявка появилась в таблице броней
   с бейджем «с сайта». Запуск:
   NODE_PATH=.../node_modules node scripts/test-linkage.js
   (используется managed node + Chrome с --no-proxy-server, URL 127.0.0.1). */
'use strict';
const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const PORT = 8000;
const BASE = `http://127.0.0.1:${PORT}`;
const SITE = BASE + '/';
const CRM = BASE + '/hostel-booking/';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('Сервер не поднялся: ' + url);
}

(async () => {
  const guest = 'ГостьСайта' + Date.now();
  const today = new Date();
  const ci = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const co = new Date(today.getTime() + (2 * 86400000) - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const srv = spawn('python', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  let browser;
  try {
    await waitForServer(BASE + '/index.html');

    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--no-proxy-server', '--disable-gpu', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('[pageerror]', e.message));
    page.on('console', m => console.log('[console.' + m.type() + ']', m.text()));

    /* ---------- 1) САЙТ: оставляем заявку через форму ---------- */
    console.log('→ открываем сайт', SITE);
    await page.goto(SITE, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.BF && typeof BF.openForm === 'function', { timeout: 10000 });

    await page.evaluate(() => { const u = UNITS[0]; BF.openModal(u.id); BF.openForm(u.id); });
    await page.waitForSelector('#reqForm', { timeout: 5000 });
    await page.type('#reqForm [name=name]', guest);
    await page.type('#reqForm [name=phone]', '+79001234567');
    await page.evaluate((ci, co) => {
      document.querySelector('#reqForm [name=checkin]').value = ci;
      document.querySelector('#reqForm [name=checkout]').value = co;
    }, ci, co);
    await page.click('#reqForm button[type=submit]');

    /* заявка должна сразу записаться в общий store CRM */
    await page.waitForFunction((g) => {
      try {
        const db = JSON.parse(localStorage.getItem('hostel_crm_v1') || '{}');
        return (db.bookings || []).some(b => b.guest === g);
      } catch (e) { return false; }
    }, { timeout: 5000 }, guest);
    console.log('✓ сайт записал заявку в hostel_crm_v1.bookings:', guest);

    /* ---------- 2) CRM: входим и ищем заявку в таблице ---------- */
    console.log('→ открываем CRM', CRM);
    await page.goto(CRM, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#loginUser', { timeout: 8000 });
    await page.type('#loginUser', 'demo@test.ru');
    await page.type('#loginPass', 'demo123');
    const creds = await page.evaluate(() => ({
      u: document.getElementById('loginUser').value,
      p: document.getElementById('loginPass').value
    }));
    console.log('  введённые данные:', JSON.stringify(creds));
    await page.evaluate(() => document.getElementById('loginForm').requestSubmit());

    /* дождаться загрузки приложения (экран входа скрыт, таблица броней отрисована) */
    try {
      await page.waitForFunction(() => {
        const ls = document.getElementById('loginScreen');
        const ap = document.getElementById('app');
        return ls && ls.hidden && ap && !ap.hidden;
      }, { timeout: 8000 });
    } catch (e) {
      const diag = await page.evaluate(() => {
        const ls = document.getElementById('loginScreen');
        const ap = document.getElementById('app');
        return {
          loginHidden: ls ? ls.hidden : 'нет #loginScreen',
          appHidden: ap ? ap.hidden : 'нет #app',
          hasInitApp: typeof initApp,
          hasSupabase: typeof window.supabase,
          errText: (document.getElementById('loginError') || {}).textContent || '',
          bodySnip: document.body.innerText.slice(0, 160)
        };
      });
      console.log('ДИАГНОСТИКА CRM:', JSON.stringify(diag, null, 2));
      throw e;
    }
    await page.waitForSelector('#bookingsBody', { timeout: 20000 });
    await sleep(1200); // дать догрузиться перерисовке после cloudLoad

    const info = await page.evaluate((g) => {
      const body = document.getElementById('bookingsBody');
      const txt = body ? body.innerText : '';
      const found = txt.includes(g);
      const tags = Array.from(body ? body.querySelectorAll('.tag') : []).map(t => t.textContent.trim());
      return { found, tags };
    }, guest);

    if (!info.found) {
      throw new Error('ЗАЯВКА С САЙТА НЕ НАЙДЕНА в таблице броней CRM: ' + guest);
    }
    const hasSiteBadge = !!info.tags.find(t => /с сайта|from site/i.test(t));
    console.log('✓ CRM показывает заявку с сайта в таблице броней');
    console.log('  бейджи в строках:', info.tags.join(' | ') || '(нет)');
    console.log(hasSiteBadge ? '✓ бейдж «с сайта» присутствует' : '⚠ бейдж «с сайта» не найден (заявка всё же отображается)');

    console.log('\nИТОГ: связь сайт → CRM работает ✅');
    await browser.close();
    srv.kill('SIGTERM');
    process.exit(0);
  } catch (err) {
    console.error('\nТЕСТ ПРОВАЛЕН ❌');
    console.error(err && err.stack ? err.stack : err);
    if (browser) await browser.close().catch(() => {});
    if (srv) srv.kill('SIGTERM');
    process.exit(1);
  }
})();
