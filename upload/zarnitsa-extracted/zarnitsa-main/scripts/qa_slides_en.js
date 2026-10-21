/* QA for EN slides: canvas 1280x720, no overflow, images load, console clean */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = '/home/z/my-project/download/slides_en';

(async () => {
  const brief = JSON.parse(fs.readFileSync(path.join(DIR, 'slides_brief.json'), 'utf-8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const issues = [];

  page.on('console', (m) => { if (m.type() === 'error') issues.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));

  for (let i = 0; i < brief.slides.length; i++) {
    const s = brief.slides[i];
    issues.length = 0;
    await page.goto('file://' + s.output_path, { waitUntil: 'networkidle', timeout: 60000 });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);

    const r = await page.evaluate(() => {
      const out = { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, badImgs: [] };
      document.querySelectorAll('img').forEach((im) => {
        if (!im.complete || im.naturalWidth === 0) out.badImgs.push(im.getAttribute('src'));
      });
      // element-level overflow beyond canvas
      const over = [];
      document.querySelectorAll('.slide *').forEach((el) => {
        if (el.hasAttribute('data-decor')) return;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return;
        if (b.right > 1281 || b.bottom > 721 || b.left < -1 || b.top < -1) {
          const t = (el.textContent || '').trim().slice(0, 40);
          over.push(`${el.tagName}.${(el.className && el.className.toString().slice(0, 24)) || ''} r=${Math.round(b.right)} b=${Math.round(b.bottom)} "${t}"`);
        }
      });
      out.over = over.slice(0, 6);
      return out;
    });

    const slideIssues = [];
    if (r.scrollW !== 1280 || r.scrollH !== 720) slideIssues.push(`canvas ${r.scrollW}x${r.scrollH}`);
    if (r.badImgs.length) slideIssues.push(`bad imgs: ${r.badImgs.join(', ')}`);
    if (r.over.length) slideIssues.push(`overflow: ${r.over.join(' | ')}`);
    if (issues.length) slideIssues.push(issues.join(' ; '));

    console.log(`slide ${String(i + 1).padStart(2, '0')}: ${slideIssues.length ? 'FAIL — ' + slideIssues.join(' ;; ') : 'OK'}`);
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
