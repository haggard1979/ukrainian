/* Data view (data/index.html): every data file is listed, cards render, review notes are highlighted and listed, filter, search, language. */
const fs = require('fs'), path = require('path');
const { ROOT } = require('../lib');
const REL = 'data/index.html';

module.exports = async t => {
  const page = await t.open(REL);
  const st = () => page.evaluate(() => window.__dataview.state());

  /* every data/*.json is listed in FILES */
  const files = fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
  const listed = (await page.evaluate(() => window.__dataview.FILES.map(f => f[0]))).sort();
  t.eq(listed, files, 'every data file is listed');

  /* all review notes of all files appear in the overview */
  let flagged = 0;
  for (const f of files) (function walk(o) { if (Array.isArray(o)) return o.forEach(walk); if (o && typeof o === 'object') { if (o.review) flagged++; Object.values(o).forEach(walk); } })(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f + '.json'), 'utf8')));
  const s0 = await st();
  t.ok(s0.cards > 50, 'cards for the chosen file (' + s0.cards + ')');
  t.ok(s0.todo >= 1 && s0.todo <= flagged, 'overview lists the flagged entries (' + s0.todo + ' entries, ' + flagged + ' notes)');

  /* every file renders without error */
  let empty = 0;
  for (const f of files) { await page.selectOption('#files', f); if ((await st()).cards < 1) empty++; }
  t.zero(empty, files.length, 'every file shows cards');

  /* only flagged entries */
  await page.selectOption('#files', 'art');
  await page.click('#only-review');
  let s = await st();
  t.ok(s.cards > 0 && s.cards === s.flagged, 'filter: only flagged entries (' + s.cards + ')');
  t.ok((await page.textContent('#out')).includes('Bitte prüfen'), 'flagged card shows the note');
  await t.shot(page, 'review');
  await page.click('#only-review');

  /* overview link jumps to the file */
  await page.selectOption('#files', 'locative');
  const target = (await page.getAttribute('#todo-list a >> nth=0', 'href')).slice(1).split('-')[0];
  await page.click('#todo-list a >> nth=0');
  t.eq((await st()).file, target, 'overview link switches to the file of the entry');
  t.ok(await page.locator('#out .ent.flag').count() > 0, 'after the jump a flagged card is shown');

  /* search */
  await page.selectOption('#files', 'domino');
  await page.fill('#find', 'лікарн');
  s = await st();
  t.ok(s.cards > 0 && s.cards < 10, 'search narrows the cards (' + s.cards + ')');
  await page.fill('#find', '');

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'View exercise data', 'English title');
  t.ok((await page.textContent('#todo-h')).includes('marked as uncertain'), 'English overview');

  /* linked from the start page */
  const ip = await t.open('index.html');
  await ip.click('a[href="data/index.html"]'); await ip.waitForLoadState();
  t.ok(ip.url().endsWith(REL), 'start page links to the data view');
};
