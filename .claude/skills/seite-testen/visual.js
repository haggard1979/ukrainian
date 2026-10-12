/* Visual regression: deterministic screenshots of every page and tab (seeded Math.random, fixed clock, no animations).
   Usage:  node .claude/skills/seite-testen/visual.js <outdir>      (run once before and once after a change)
   Compare: python3 .claude/skills/seite-testen/compare.py <dirA> <dirB>
   Pages are index.html plus every *-trainer.html in the repository. Use it after changes to assets/ (shared CSS/JS):
   an unchanged look must give no differences beyond font antialiasing noise. */
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');

function trainers(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || e.name === 'node_modules') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? trainers(p) : /-trainer\.html$/.test(e.name) ? [path.relative(ROOT, p)] : [];
  });
}
const pages = ['index.html', ...trainers(ROOT).sort()];
const out = process.argv[2];
if (!out) { console.log('usage: node visual.js <outdir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const seed = `(function(){var s=12345;Math.random=function(){s=(s*1103515245+12345)%2147483648;return s/2147483648;};
 window.__spoken=[];const voices=[{name:'Lesya',lang:'uk-UA'}];window.SpeechSynthesisUtterance=function(t){this.text=t;};
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,cancel(){},speak(u){window.__spoken.push(u.text);},addEventListener(){}}});})();`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [scheme, w, h, locale] of [['light', 390, 900, 'de-DE'], ['dark', 900, 900, 'en-GB']]) {
    for (const p of pages) {
      const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: w, height: h }, locale, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-05-01T10:10:00'));
      await page.addInitScript(seed);
      page.on('pageerror', e => errs.push(p + ': ' + e.message));
      await page.goto('file://' + path.join(ROOT, p)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      const base = p.split(path.sep).join('_').replace('.html', '');
      await page.screenshot({ path: path.join(out, `${base}_${scheme}_0.png`), fullPage: true });
      const tabs = await page.locator('[role=tab]').count();
      for (let i = 0; i < tabs; i++) {
        await page.locator('[role=tab]').nth(i).click(); await page.waitForTimeout(150);
        await page.mouse.move(0, 0); await page.screenshot({ path: path.join(out, `${base}_${scheme}_tab${i}.png`), fullPage: true });
      }
      await ctx.close();
    }
  }
  console.log('screens', fs.readdirSync(out).length, 'ERRORS', errs); await b.close();
  process.exit(errs.length ? 1 : 0);
})();
