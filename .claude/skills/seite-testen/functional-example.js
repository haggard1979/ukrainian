/* Example of a page-specific answer test (accusative trainer, mode "type"). Copy to the scratchpad and adapt:
   page path, test hook (window.__<name>), how the current task is identified, selectors per mode.
   Usage: node functional-example.js */
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');   /* when copied elsewhere: '/home/user/ukrainian' */

(async () => {
  const b = await chromium.launch(); const errs = [];
  const page = await b.newPage({ locale: 'de-DE', viewport: { width: 390, height: 1000 } });
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + ROOT + '/grammar/accusative/accusative-trainer.html');

  /* identify the task on screen through the test hook */
  const current = () => page.evaluate(() => {
    /* the sentence alone is ambiguous (e.g. "Ми їдемо в ___." exists several times): also match the base word */
    const s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ');
    const nom = document.getElementById('base-word').textContent;
    const it = window.__akkusativ.ITEMS.find(i => { const [a, z] = i.s.split('___'); return i.nom === nom && s.startsWith(a) && s.endsWith(z); });
    return it && { a: it.a, key: it.key };
  });
  const verdict = () => page.textContent('#feedback .verdict');
  const next = async () => { await page.waitForTimeout(260); await page.click('#next-btn'); };   /* 250-ms lock after feedback */

  await page.click('#mode-type');
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const it = await current(); if (!it) { bad++; console.log('task not found'); await next(); continue; }
    seen.add(it.key);
    /* vary the input: capitals, ASCII apostrophe – norm() must accept them */
    const ans = i % 3 === 0 ? it.a[0].toUpperCase() : i % 3 === 1 ? it.a[0].replace(/’/g, "'") : it.a[it.a.length - 1];
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await verdict() !== 'Richtig') { bad++; console.log('rejected', ans, it.key); }
    await next();
  }
  console.log('TYPE distinct', seen.size, 'problems', bad);

  /* a wrong answer must be marked wrong and show the solution */
  await page.fill('#answer-input', 'неправильно'); await page.click('#check-btn');
  console.log('WRONG ->', await verdict(), '|', (await page.innerText('#feedback')).replace(/\n+/g, ' | ').slice(0, 120));
  /* Latin input: the feedback mentions the Ukrainian keyboard */
  await next(); await page.fill('#answer-input', 'knyhu'); await page.click('#check-btn');
  console.log('LATIN ->', /lateinische/.test(await page.innerText('#feedback')) ? 'hint shown' : 'NO HINT');
  /* switching the language re-renders the open card / feedback */
  await page.click('[data-set-lang=en]'); console.log('EN check button ->', await page.textContent('#check-btn'));
  await page.screenshot({ path: 'functional-example.png', fullPage: true });

  console.log('ERRORS', errs); await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
