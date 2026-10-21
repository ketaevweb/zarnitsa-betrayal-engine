const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const files = ['slide_01','slide_02','slide_03','slide_04','slide_05','slide_06'];
  for (const f of files) {
    try {
      await page.goto('file:///home/z/my-project/download/slides/' + f + '.html', { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(1400);
      const res = await page.evaluate(() => {
        const out = { sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, over: [] };
        document.querySelectorAll('.slide *').forEach(el => {
          if (el.closest('[data-decor]')) return;
          const r = el.getBoundingClientRect();
          if (r.width && r.height && (r.right > 1281.5 || r.bottom > 721.5 || r.left < -1.5 || r.top < -1.5)) {
            out.over.push(el.tagName + '[' + (el.className || '').toString().slice(0, 30) + '] r=' + Math.round(r.right) + ' b=' + Math.round(r.bottom) + ' l=' + Math.round(r.left) + ' t=' + Math.round(r.top));
          }
        });
        // broken images
        out.imgFail = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src.split('/').pop());
        return out;
      });
      console.log(f, 'scroll=' + res.sw + 'x' + res.sh, 'imgFail=' + JSON.stringify(res.imgFail), 'overflow=' + JSON.stringify(res.over));
    } catch (e) { console.log(f, 'ERROR', e.message); }
  }
  await browser.close();
})();
