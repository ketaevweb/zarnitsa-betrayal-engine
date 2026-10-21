/* Рендер HTML-слайдов в постраничные PDF (Playwright) с последующим merge через pypdf */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SLIDES_DIR = '/home/z/my-project/download/slides';
const BRIEF = JSON.parse(fs.readFileSync(path.join(SLIDES_DIR, 'slides_brief.json'), 'utf-8'));
const OUT_DIR = '/home/z/my-project/scripts/pdf_tmp';

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const parts = [];
  for (let i = 0; i < BRIEF.slides.length; i++) {
    const s = BRIEF.slides[i];
    const url = 'file://' + s.output_path;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const out = path.join(OUT_DIR, `part_${String(i + 1).padStart(2, '0')}.pdf`);
    await page.pdf({
      path: out,
      width: '1280px',
      height: '720px',
      printBackground: true,
      pageRanges: '1',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    parts.push(out);
    console.log('ok', i + 1, s.title);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'parts.json'), JSON.stringify(parts));
  console.log('DONE', parts.length);
})().catch((e) => { console.error(e); process.exit(1); });
