/* Скриншоты CRM для визуальной проверки унификации дизайна с сайтом. */
'use strict';
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:8000/hostel-booking/';
const OUT = 'C:/Projects/Personal/baza-friends/scripts';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('dialog', async d => { try { await d.dismiss(); } catch (e) {} });

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  // экран входа
  await page.waitForSelector('#loginUser');
  await page.screenshot({ path: OUT + '/crm-1-login.png' });

  // вход
  await page.type('#loginUser', 'demo@hostel.local');
  await page.type('#loginPass', 'demo123');
  await page.click('#authSubmit');
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: OUT + '/crm-2-map.png', fullPage: false });

  // вкладка броней
  await page.click('.tab[data-view="bookings"]');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: OUT + '/crm-3-bookings.png' });

  // модалка койки + брони
  await page.click('.tab[data-view="map"]');
  await new Promise(r => setTimeout(r, 300));
  await page.click('.bed');
  await page.waitForSelector('#bedModal:not([hidden])');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: OUT + '/crm-4-bedmodal.png' });

  await browser.close();
  console.log('screenshots saved');
})().catch(e => { console.error('SHOT FAIL', e); process.exit(1); });
