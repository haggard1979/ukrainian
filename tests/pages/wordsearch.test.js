/* Word search: grid sizes, directions, dragging and tapping, hints, time, topics, language. */
const REL = 'games/wordsearch/wordsearch-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__wordsearch.state(), (k, v) => k === 'w' && v && v.w ? { w: v.w, topic: v.topic, gloss: v.gloss } : v)));
  void press; void st;

  const wsState = () => page.evaluate(() => { const w = window.__wordsearch.state().ws; return { n: w.n, letters: w.letters, words: w.words.map(x => ({ w: x.w.w, cells: x.cells, found: x.found, gloss: x.w.gloss })), misses: w.misses, over: w.over }; });
  const ws = await wsState();
  t.eq([ws.n, ws.words.length, ws.letters.length], [8, 5, 64], 'search: easy = 8 × 8 with 5 words');
  t.ok(ws.words.every(x => [...x.w].every((ch, k) => ws.letters[x.cells[k]] === ch)), 'search: every word is in the grid');
  t.ok(ws.words.every(x => [1, 8].includes(x.cells[1] - x.cells[0])), 'search: easy words run right or down only');
  t.ok(ws.words.every(x => !ws.words.some(y => y !== x && (y.w.includes(x.w) || y.w.includes([...x.w].reverse().join('')))) ), 'search: no word hides inside another');
  t.ok((await page.textContent('#ws-list')).includes(ws.words[0].gloss.de), 'search: the list shows the meanings');
  t.ok(!(await page.textContent('#ws-list')).includes(ws.words[0].w), 'search: Ukrainian words hidden by default');
  await page.click('#ws-show');
  t.ok((await page.textContent('#ws-list')).includes(ws.words[0].w), 'search: "show Ukrainian words" lists them');
  await page.click('#ws-show');
  /* a wrong two-letter selection is a miss; start letter is marked */
  await page.click('#wc-0'); t.eq(await page.locator('#ws-grid .wc.sel').count(), 1, 'search: tapped start letter is marked');
  await page.click('#wc-1');
  t.eq((await wsState()).misses, 1, 'search: a wrong selection counts as a miss');
  t.ok((await page.textContent('#ws-msg')).length > 0, 'search: a miss shows a message');
  /* hint highlights the first letter of an open word */
  await page.click('#ws-hint');
  t.eq(await page.locator('#ws-grid .wc.hint').count(), 1, 'search: hint marks one letter');
  /* find the first word by dragging */
  const first = ws.words[0];
  const box = async i => { const b = await page.locator('#wc-' + i).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const a0 = await box(first.cells[0]), a1 = await box(first.cells[first.cells.length - 1]);
  await page.mouse.move(a0.x, a0.y); await page.mouse.down(); await page.mouse.move(a1.x, a1.y, { steps: 6 });
  t.ok(await page.locator('#ws-grid .wc.pre').count() >= first.w.length, 'search: dragging previews the line');
  await page.mouse.up();
  t.eq((await wsState()).words[0].found, true, 'search: dragging over a word finds it');
  t.eq(await page.locator('#ws-grid .wc.found').count(), first.w.length, 'search: found letters are highlighted');
  await t.shot(page, 'search-progress');
  /* tap the rest: the other words, the last one reversed; time is measured */
  await page.clock.fastForward(65000);
  for (const [k, x] of ws.words.slice(1).entries()) {
    const [from, to] = k % 2 ? [x.cells[x.cells.length - 1], x.cells[0]] : [x.cells[0], x.cells[x.cells.length - 1]];
    await page.click('#wc-' + from); await page.click('#wc-' + to);
  }
  t.ok((await page.textContent('#ws-fb')).includes('Alle Wörter gefunden'), 'search: finish message');
  t.ok(/Zeit 1:0[5-9]/.test(await page.textContent('#ws-fb')), 'search: time shown (about 65 s on the fake clock)');
  t.ok(/leicht 1:0[5-9]/.test(await page.textContent('#ws-best')), 'search: best time stored');
  await t.shot(page, 'search-done');
  /* medium: diagonals allowed; hard: all directions, reversed words found when selected backwards */
  await page.click('#ws-levels [data-level="2"]');
  let g2 = await wsState();
  t.eq([g2.n, g2.words.length], [10, 7], 'search: medium = 10 × 10 with 7 words');
  t.ok(g2.words.every(x => [1, 10, 11].includes(x.cells[1] - x.cells[0])), 'search: medium words run right, down or diagonally');
  await page.click('#ws-levels [data-level="3"]');
  const dirs = new Set();
  for (let i = 0; i < 6; i++) {
    g2 = await wsState();
    t.eq(g2.words.length, 9, 'search: hard has 9 words');
    t.ok(g2.words.every(x => [...x.w].every((ch, k) => g2.letters[x.cells[k]] === ch)), 'search: hard words are in the grid');
    g2.words.forEach(x => dirs.add(x.cells[1] - x.cells[0]));
    await page.click('#ws-new');
  }
  t.ok([...dirs].some(d => d < 0), 'search: hard places words backwards');
  g2 = await wsState();
  for (const x of g2.words) { await page.click('#wc-' + x.cells[x.cells.length - 1]); await page.click('#wc-' + x.cells[0]); }
  t.eq((await wsState()).words.every(x => x.found), true, 'search: hard words found selecting end → start');


  /* ---- topics: only colours ---- */
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('wordsearch.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__wordsearch.WORDS.filter(x => x.topic === 'colors').map(x => x.w));
  t.ok((await st()).ws.words.every(x => col.includes(x.w.w)), 'chips: word search uses the selected topic');

  /* language and the old combined progress key */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Word Search', 'English title');

  /* progress of the old combined page (games.v1) is picked up once */
  const mig = await t.open(REL);
  await mig.evaluate(() => localStorage.removeItem('wordsearch.v1'));
  await mig.evaluate(() => localStorage.setItem('games.v1', JSON.stringify({ topics: ['colors'] })));
  await mig.reload(); await t.ready(mig);
  t.eq(await mig.evaluate(() => document.querySelectorAll('#chips [aria-pressed=true]').length), 1, 'legacy games.v1: selected topics are taken over');

  await t.linkedFromIndex('Wortsuche', REL);
};
