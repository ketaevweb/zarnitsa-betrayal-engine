const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type() === 'error') console.log('  console.error:', m.text().slice(0, 120)); });
  page.on('pageerror', e => console.log('  pageerror:', String(e).slice(0, 120)));
  for (const f of ['slide_01','slide_02','slide_03','slide_04','slide_05','slide_06']) {
    console.log(f);
    await page.goto('file:///home/z/my-project/download/slides/' + f + '.html', { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(900);
  }
  await browser.close();
})();
