/* Автотест автономности CRM: вход без сервера, создание брони, сохранение после перезагрузки. */
'use strict';
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://127.0.0.1:8000/hostel-booking/';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  const dialogs = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('response', res => { if (res.status() >= 400) errors.push('HTTP ' + res.status() + ' ' + res.url()); });
  page.on('dialog', async d => { dialogs.push(d.message()); try { await d.dismiss(); } catch (e) {} });
  global.__diag = { errors, dialogs };

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  // вход (любые учётные данные — локально)
  await page.waitForSelector('#loginUser');
  await page.type('#loginUser', 'demo@hostel.local');
  await page.type('#loginPass', 'demo123');
  await page.click('#authSubmit');

  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, { timeout: 8000 });
  const diag = await page.evaluate(() => ({
    appHidden: document.getElementById('app') ? document.getElementById('app').hidden : 'no-app',
    loginHidden: document.getElementById('loginScreen') ? document.getElementById('loginScreen').hidden : 'no-login',
    loginError: document.getElementById('loginError') ? document.getElementById('loginError').innerText : '',
    bedCount: document.querySelectorAll('.bed').length
  }));
  console.log('DIAG after login:', JSON.stringify(diag));
  await page.waitForSelector('.bed', { timeout: 8000 });
  const bedCount = await page.$$eval('.bed', els => els.length);
  const statText = await page.$eval('#statsBar', el => el.innerText.replace(/\s+/g, ' ').slice(0, 120));

  // создать бронь у первой свободной койки
  await page.click('.bed');
  await page.waitForSelector('#bedModal:not([hidden])');
  await page.click('#btnBedNewBooking');
  await page.waitForSelector('#bookingModal:not([hidden])');
  await page.type('#bkGuest', 'Тест Гость');
  await page.type('#bkPhone', '+79990000000');
  await page.$eval('#bkPrice', el => { el.value = '1000'; });
  await page.click('#bkPaid');
  await page.click('#bkSubmit');

  // диагностика состояния после отправки формы
  await new Promise(r => setTimeout(r, 1500));
  const diag2 = await page.evaluate(() => {
    let ls = null;
    try { ls = JSON.parse(localStorage.getItem('hostel_crm_v1')); } catch (e) {}
    const b = document.getElementById('bookingsBody');
    return {
      bookingModalHidden: document.getElementById('bookingModal') ? document.getElementById('bookingModal').hidden : 'no-modal',
      bkSubmitText: document.getElementById('bkSubmit') ? document.getElementById('bkSubmit').textContent : 'no-btn',
      bkErrorHidden: document.getElementById('bkError') ? document.getElementById('bkError').hidden : 'no-err',
      bkErrorText: document.getElementById('bkError') ? document.getElementById('bkError').textContent : 'no-err',
      bookingsBodyLen: b ? b.textContent.length : -1,
      bookingsBodySnippet: b ? b.textContent.slice(0, 200) : '',
      guestField: document.getElementById('bkGuest') ? document.getElementById('bkGuest').value : 'no-field',
      lsBookings: ls && ls.bookings ? ls.bookings.length : 'no-ls',
      lsHasTest: ls && ls.bookings ? ls.bookings.some(x => x.guest && x.guest.includes('Тест')) : false
    };
  });
  console.log('DIAG2 after submit:', JSON.stringify(diag2));

  // переключаемся на вкладку броней и проверяем через textContent
  // (innerText для скрытых элементов возвращает '', поэтому используем textContent)
  await page.click('.tab[data-view="bookings"]');
  let bookingsFound = false;
  try {
    await page.waitForFunction(() => {
      const b = document.getElementById('bookingsBody');
      return b && b.textContent.includes('Тест Гость');
    }, { timeout: 8000 });
    bookingsFound = true;
  } catch (e) { bookingsFound = false; }
  if (!bookingsFound) {
    const snap = await page.evaluate(() => {
      let ls = null; try { ls = JSON.parse(localStorage.getItem('hostel_crm_v1')); } catch (e) {}
      const b = document.getElementById('bookingsBody');
      return { body: b ? b.textContent.slice(0, 300) : '', ls: JSON.stringify(ls ? { bookings: ls.bookings } : null).slice(0, 400) };
    });
    console.log('SNAP bookings tab:', JSON.stringify(snap));
  }

  // перезагрузка — данные должны пережить её (localStorage)
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, { timeout: 8000 });
  const persisted = await page.$eval('#bookingsBody', el => el.textContent.includes('Тест Гость'));

  // экспорт/импорт: проверим, что кнопки не падают
  await page.click('#btnExport'); // открывает confirm — отменяем
  await page.keyboard.press('Escape');

  await browser.close();

  const supabaseErrors = errors.filter(e => /supabase/i.test(e));
  const result = { bedCount, statText, bookingsFound, persisted, errorCount: errors.length, errors: errors.slice(0, 10), dialogs, supabaseErrors };
  console.log(JSON.stringify(result, null, 2));
  if (supabaseErrors.length) { console.error('FAIL: Supabase всё ещё упоминается'); process.exit(1); }
  if (!bookingsFound || !persisted) { console.error('FAIL: бронь не создалась / не сохранилась'); process.exit(2); }
  if (bedCount < 1) { console.error('FAIL: карта мест пуста'); process.exit(3); }
  console.log('CRM AUTONOMY OK');
})().catch(e => { console.error('TEST CRASH', e); console.error('COLLECTED:', JSON.stringify(global.__diag || {}, null, 2)); process.exit(3); });
