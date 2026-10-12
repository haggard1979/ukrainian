/* Letter scramble: mixed tiles, wrong order, hint, give up, keyboard, topics, language. */
const REL = 'games/scramble/scramble-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__scramble.state(), (k, v) => k === 'w' && v && v.w ? { w: v.w, topic: v.topic, gloss: v.gloss } : v)));
  void press; void st;

  s = (await st()).scr;
  t.ok(s.w.w.length >= 4 && !s.w.w.includes('’'), 'scramble: word without apostrophe');
  t.ok(s.tiles.join('') !== s.w.w, 'scramble: letters are mixed');
  t.eq([...s.tiles].sort().join(''), [...s.w.w].sort().join(''), 'scramble: tiles are the letters of the word');
  const spell = async (word, from = 0) => {
    for (const ch of word.slice(from)) {
      const idx = await page.evaluate(c => { const S = window.__scramble.state().scr; return S.tiles.findIndex((x, i) => x === c && !S.placed.includes(i)); }, ch);
      await page.click(`#tile-${idx}`);
    }
  };
  /* wrong order first */
  const rev = [...s.w.w].reverse().join('');
  if (rev !== s.w.w) {
    await spell(rev);
    t.ok((await page.textContent('#scr-msg')).includes('Noch nicht'), 'scramble: wrong order gets a message');
    await page.click('#slot-0');
    t.eq((await st()).scr.placed.length, s.w.w.length - 1, 'scramble: tapping a placed letter takes it back');
    await page.click('#scr-clear');
  }
  t.eq((await st()).scr.placed.length, 0, 'scramble: clear empties the answer');
  await spell(s.w.w);
  t.eq(await page.textContent('#scr-fb .verdict'), 'Richtig!', 'scramble: right word accepted');
  t.eq(await page.textContent('#s-streak'), '1', 'scramble: streak counted');
  await t.shot(page, 'scramble-won');
  /* hint → no streak */
  await page.click('#scr-next');
  s = (await st()).scr;
  await page.click('#scr-hint');
  t.eq((await st()).scr.placed.length, 1, 'scramble: hint places one letter');
  t.eq(await page.evaluate(() => document.getElementById('slot-0').textContent), s.w.w[0], 'scramble: hint places the first letter');
  await spell(s.w.w, 1);
  t.eq(await page.textContent('#scr-fb .verdict'), 'Richtig – mit Tipp.', 'scramble: solved with a hint');
  t.eq(await page.textContent('#s-streak'), '0', 'scramble: a hint resets the streak');
  /* give up */
  await page.click('#scr-next');
  s = (await st()).scr;
  await page.click('#scr-solve');
  t.eq(await page.textContent('#scr-fb .verdict'), 'Das Wort war:', 'scramble: solution shown');
  t.eq(await page.evaluate(() => [...document.querySelectorAll('#scr-slots .slot')].map(b => b.textContent).join('')), s.w.w, 'scramble: solution fills the slots');
  /* keyboard */
  await press('Enter');
  s = (await st()).scr;
  await press(s.w.w[0]);
  t.eq((await st()).scr.placed.length, 1, 'scramble: typing a letter places a tile');
  await press('Backspace');
  t.eq((await st()).scr.placed.length, 0, 'scramble: Backspace removes the last letter');
  await page.click('#scr-shuffle');

  /* ---- topics: only colours ---- */
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('scramble.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__scramble.WORDS.filter(x => x.topic === 'colors').map(x => x.w));
  t.ok(col.includes((await st()).scr.w.w), 'chips: scramble uses the selected topic');

  /* language and the old combined progress key */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Letter Scramble', 'English title');

  /* progress of the old combined page (games.v1) is picked up once */
  const mig = await t.open(REL);
  await mig.evaluate(() => localStorage.removeItem('scramble.v1'));
  await mig.evaluate(() => localStorage.setItem('games.v1', JSON.stringify({ topics: ['colors'] })));
  await mig.reload(); await t.ready(mig);
  t.eq(await mig.evaluate(() => document.querySelectorAll('#chips [aria-pressed=true]').length), 1, 'legacy games.v1: selected topics are taken over');

  await t.linkedFromIndex('Buchstabensalat', REL);
};
