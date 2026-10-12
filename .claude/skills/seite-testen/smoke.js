/* Generic browser check for one or more pages.
   Usage: node .claude/skills/seite-testen/smoke.js <outdir> <page.html> [more pages …]
   Per page: loads it with a fake Ukrainian voice, switches DE/EN and light/dark, clicks every tab and mode button,
   checks that index.html links to it, collects page errors / console errors and writes screenshots
   (390 px light + dark, 900 px light). Exit code 1 on any problem.
   Page-specific answer tests are written separately (see SKILL.md). */
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const [out, ...pages] = process.argv.slice(2);
if (!out || !pages.length) { console.log('usage: node smoke.js <outdir> <page.html> …'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const STUB = `(function(){window.__spoken=[];const voices=[{name:'Lesya',lang:'uk-UA'}];
  window.SpeechSynthesisUtterance=function(t){this.text=t;};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,cancel(){},speak(u){window.__spoken.push(u.text);},addEventListener(){}}});})();`;

(async () => {
  const b = await chromium.launch();
  const probs = [];
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const rel0 of pages) {
    const rel = path.relative(ROOT, path.resolve(rel0)).split(path.sep).join('/');
    const base = rel.replace(/\//g, '_').replace(/\.html$/, '');
    const err = m => probs.push(rel + ': ' + m);
    if (rel !== 'index.html' && !index.includes('href="' + rel + '"')) err('not linked from index.html');
    for (const [scheme, width] of [['light', 390], ['dark', 390], ['light', 900]]) {
      const ctx = await b.newContext({ colorScheme: scheme, viewport: { width, height: 900 }, locale: 'de-DE' });
      const page = await ctx.newPage();
      await page.addInitScript(STUB);
      page.on('pageerror', e => err('pageerror ' + e.message));
      page.on('console', m => { if (m.type() === 'error') err('console ' + m.text()); });
      await page.goto('file://' + path.join(ROOT, rel));
      await page.evaluate(() => document.fonts.ready);
      const shot = async name => page.screenshot({ path: path.join(out, `${base}_${scheme}${width}_${name}.png`), fullPage: true });
      await shot('start');
      if (scheme === 'light' && width === 390) {
        /* horizontal overflow on phones */
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 0) err('horizontal scroll on 390 px: ' + over + ' px');
        /* language switch: <html lang>, title and at least one translated text must change */
        const deTitle = await page.title();
        await page.click('[data-set-lang=en]');
        const en = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title,
          stored: localStorage.getItem('ukrainian.lang') }));
        if (en.lang !== 'en' || en.stored !== 'en') err('language switch to EN failed ' + JSON.stringify(en));
        if (en.title === deTitle) err('title not translated: ' + deTitle);
        await shot('en');
        await page.click('[data-set-lang=de]');
        /* theme toggle */
        const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        await page.click('#theme-toggle');
        const after = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, th: localStorage.getItem('ukrainian.theme') }));
        if (after.bg === before || after.th !== 'dark') err('theme toggle failed ' + JSON.stringify(after));
        await page.click('#theme-toggle');
        await page.evaluate(() => { try { localStorage.removeItem('ukrainian.theme'); } catch (e) {} });
        /* every tab and every mode button once */
        const tabs = page.locator('[role=tab]');
        for (let i = 0; i < await tabs.count(); i++) {
          await tabs.nth(i).click(); await page.waitForTimeout(100);
          await shot('tab' + i);
          const modes = page.locator('[data-mode]:visible');
          for (let j = 0; j < await modes.count(); j++) { await modes.nth(j).click(); await page.waitForTimeout(80); await shot(`tab${i}_mode${j}`); }
        }
        /* read aloud buttons: clicking one must reach the (fake) voice */
        const say = page.locator('.say:visible').first();
        if (await say.count()) { await say.click(); if (!(await page.evaluate(() => window.__spoken.length))) err('speaker button did not speak'); }
      } else {
        const tabs = page.locator('[role=tab]');
        for (let i = 0; i < await tabs.count(); i++) { await tabs.nth(i).click(); await page.waitForTimeout(100); await shot('tab' + i); }
      }
      await ctx.close();
    }
  }
  await b.close();
  console.log('screenshots in', out, '(' + fs.readdirSync(out).length + ' files)');
  console.log(probs.length ? 'PROBLEMS\n  ' + probs.join('\n  ') : 'OK – no problems');
  process.exit(probs.length ? 1 : 0);
})();
