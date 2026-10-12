/* Memory: matching, mismatch (cards turn back), finish message, best value per level, topics, language. */
const REL = 'games/memory/memory-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__memory.state(), (k, v) => k === 'w' && v && v.w ? { w: v.w, topic: v.topic, gloss: v.gloss } : v)));
  void press; void st;

  t.eq(await page.locator('#mem-grid .mc').count(), 12, 'memory: 12 cards (6 pairs)');
  const pairs = async () => page.evaluate(() => { const m = {}; [...document.querySelectorAll('#mem-grid .mc')].forEach((b, i) => (m[b.dataset.pair] = m[b.dataset.pair] || []).push(i)); return Object.values(m); });
  let ps = await pairs();
  t.ok(ps.every(p => p.length === 2), 'memory: every pair has two cards');
  /* mismatch: two cards of different pairs close again */
  await page.click(`#mc-${ps[0][0]}`); await page.click(`#mc-${ps[1][0]}`);
  t.eq(await page.locator('#mem-grid .mc.open').count(), 2, 'memory: two cards open');
  t.eq(await page.textContent('#mem-moves'), '1 Zug', 'memory: first move counted');
  await page.click(`#mc-${ps[2][0]}`);
  t.eq(await page.locator('#mem-grid .mc.open').count(), 2, 'memory: a third card cannot be opened while two are showing');
  await page.clock.fastForward(1000);
  t.eq(await page.locator('#mem-grid .mc.open').count(), 0, 'memory: mismatch turns back');
  /* match all */
  for (const [a, b] of ps) { await page.click(`#mc-${a}`); await page.click(`#mc-${b}`); }
  t.eq(await page.locator('#mem-grid .mc.done').count(), 12, 'memory: all cards matched');
  t.ok((await page.textContent('#mem-fb')).includes('Alle Paare gefunden in 7 Zügen'), 'memory: finish message with the move count');
  t.ok((await page.textContent('#mem-best')).includes('leicht 7'), 'memory: best value stored');
  await t.shot(page, 'memory-done');
  /* harder level */
  await page.click('#mem-levels [data-level="8"]');
  t.eq(await page.locator('#mem-grid .mc').count(), 16, 'memory: 16 cards on the harder level');
  ps = await pairs();
  for (const [a, b] of ps) { await page.click(`#mc-${a}`); await page.click(`#mc-${b}`); }
  t.ok((await page.textContent('#mem-best')).includes('schwerer 8'), 'memory: best value per level');
  await page.click('#mem-again');
  t.eq(await page.locator('#mem-grid .mc.done').count(), 0, 'memory: new game starts closed');

  /* ---- topics: only colours ---- */
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('memory.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__memory.WORDS.filter(x => x.topic === 'colors').map(x => x.w));
  t.ok((await st()).mem.cards.every(c => c.w.topic === 'colors'), 'chips: memory cards use the selected topic');

  /* language and the old combined progress key */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Memory', 'English title');

  /* progress of the old combined page (games.v1) is picked up once */
  const mig = await t.open(REL);
  await mig.evaluate(() => localStorage.removeItem('memory.v1'));
  await mig.evaluate(() => localStorage.setItem('games.v1', JSON.stringify({ topics: ['colors'] })));
  await mig.reload(); await t.ready(mig);
  t.eq(await mig.evaluate(() => document.querySelectorAll('#chips [aria-pressed=true]').length), 1, 'legacy games.v1: selected topics are taken over');

  await t.linkedFromIndex('Memory', REL);
};
