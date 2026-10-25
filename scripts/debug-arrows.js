// Отладка: позиции стрелок галереи на мобильном
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 500, height: 900, isMobile: true, hasTouch: true });
  await p.goto('http://localhost:8000/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await p.click('[data-tile="cottage"]');
  await new Promise(r => setTimeout(r, 500));
  await p.click('#cat-cottage [data-details]');
  await new Promise(r => setTimeout(r, 500));
  const info = await p.evaluate(() => {
    const v = document.querySelector('#gallery-modal .g-view');
    const prev = document.querySelector('#gallery-modal .g-nav.prev');
    const next = document.querySelector('#gallery-modal .g-nav.next');
    const r = el => { const x = el.getBoundingClientRect(); return { x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height) }; };
    const cs = getComputedStyle(prev);
    return {
      view: r(v), prev: r(prev), next: r(next),
      prevVisible: cs.visibility, prevOpacity: cs.opacity, prevBg: cs.backgroundColor,
      prevZ: cs.zIndex, prevDisplay: cs.display,
      inView: r(prev).x >= 0 && r(prev).x + r(prev).w <= window.innerWidth
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
