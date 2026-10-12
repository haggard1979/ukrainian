/* Generic checks for every page: linked from index, no horizontal scroll on phones, DE/EN switch,
   light/dark toggle, every tab and mode clickable without errors, speaker buttons reach the voice. */
const { allPages, ROOT } = require('../lib');
const fs = require('fs'), path = require('path');

module.exports = async t => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const rel of allPages()) {
    const base = rel.replace(/\//g, '_').replace(/\.html$/, '');
    if (rel !== 'index.html') t.ok(index.includes('href="' + rel + '"'), rel + ' is linked from index.html');

    const page = await t.open(rel);
    await t.shot(page, base + '_light');
    t.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), rel + ': no horizontal scroll at 390 px');

    /* language: <html lang>, stored choice, title and language blocks */
    const deTitle = await page.title();
    await page.click('[data-set-lang=en]');
    t.eq(await page.evaluate(() => [document.documentElement.lang, localStorage.getItem('ukrainian.lang')]), ['en', 'en'], rel + ': switch to English');
    t.ok(await page.title() !== deTitle, rel + ': title translated (' + deTitle + ')');
    t.eq(await page.evaluate(() => [...document.querySelectorAll('[data-show-lang=de]')].filter(e => !e.hidden).length), 0, rel + ': German blocks hidden in English');
    await t.shot(page, base + '_en');
    await page.click('[data-set-lang=de]');
    t.eq(await page.evaluate(() => document.documentElement.lang), 'de', rel + ': switch back to German');

    /* theme toggle changes the background and is stored */
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const light = await bg();
    await page.click('#theme-toggle');
    t.ok(await bg() !== light, rel + ': theme toggle changes the background');
    t.eq(await page.evaluate(() => localStorage.getItem('ukrainian.theme')), 'dark', rel + ': theme stored');
    await t.shot(page, base + '_dark');
    await page.click('#theme-toggle');

    /* every tab and every visible mode once */
    const tabs = page.locator('[role=tab]');
    for (let i = 0; i < await tabs.count(); i++) {
      await tabs.nth(i).click();
      t.eq(await tabs.nth(i).getAttribute('aria-selected'), 'true', rel + ': tab ' + i + ' selected');
      const modes = page.locator('[data-mode]:visible');
      for (let j = 0; j < await modes.count(); j++) {
        await modes.nth(j).click();
        t.eq(await modes.nth(j).getAttribute('aria-pressed'), 'true', rel + ': tab ' + i + ' mode ' + j + ' active');
      }
    }

    /* a visible speaker button speaks */
    const say = page.locator('.say:visible').first();
    if (await say.count()) { await say.click(); t.ok(await page.evaluate(() => window.__spoken.length > 0), rel + ': speaker button speaks'); }
  }
};
