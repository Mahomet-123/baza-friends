// Отладка: подсветка плиток категорий и поиск 404
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 500, height: 900, isMobile: true, hasTouch: true });
  const bad = [];
  p.on('requestfailed', r => bad.push('FAILED ' + r.url()));
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  console.log('404s:', JSON.stringify(bad));
  console.log('tiles before:', await p.evaluate(() => Array.from(document.querySelectorAll('[data-tile]')).map(b => b.dataset.tile + ' | ' + b.className)));
  await p.click('[data-tile="house"]');
  await new Promise(r => setTimeout(r, 400));
  console.log('tiles after :', await p.evaluate(() => Array.from(document.querySelectorAll('[data-tile]')).map(b => b.dataset.tile + ' | ' + b.className)));
  console.log('sections    :', await p.evaluate(() => Array.from(document.querySelectorAll('.cat')).map(s => s.id + ' | ' + s.className)));
  await b.close();
})();
