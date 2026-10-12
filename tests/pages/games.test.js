/* Word games: word guessing (win, lose, hint, apostrophe, keyboard), memory (match, mismatch, finish, levels),
   letter scramble (win, wrong order, hint, give up, shuffle), topic chips, language. */
const REL = 'games/games-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__games.state(), (k, v) => k === 'w' && v && v.w ? { w: v.w, topic: v.topic, gloss: v.gloss } : v)));

  /* ---- word guessing ---- */
  let s = (await st()).hang;
  t.ok(s.w.w.length >= 4 && !s.over, 'hang: a word is chosen');
  t.eq(await page.locator('#hang-kb button').count(), 33, 'hang: 33 letters on the keyboard');
  t.eq(await page.locator('#hang-lives svg').count(), 7, 'hang: 7 stitches');
  const letters = w => [...new Set(w.w.split('').filter(c => c !== '’'))];
  const alphabet = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'.split('');
  const click = ch => page.click(`#hang-kb [data-ch="${ch}"]`);

  /* one wrong letter costs a stitch, a right one does not */
  const wrong = w => alphabet.filter(c => !w.w.includes(c));
  await click(wrong(s.w)[0]);
  t.eq((await st()).hang.misses, 1, 'hang: wrong letter costs a stitch');
  t.eq(await page.locator('#hang-lives svg.used').count(), 1, 'hang: one stitch used up');
  await click(letters(s.w)[0]);
  t.eq((await st()).hang.misses, 1, 'hang: right letter is free');
  /* hint reveals a letter and costs a stitch */
  await page.click('#hang-hint');
  s = (await st()).hang;
  t.eq(s.misses, 2, 'hang: hint costs a stitch');
  /* win */
  for (const c of letters(s.w)) if (!s.guessed.includes(c) && !(await page.locator(`#hang-kb [data-ch="${c}"]`).isDisabled())) await click(c);
  t.ok(await t.visible(page, '#hang-fb'), 'hang: feedback after winning');
  t.eq(await page.textContent('#hang-fb .verdict'), 'Geschafft!', 'hang: win message');
  t.ok((await page.textContent('#hang-fb')).includes(s.w.gloss.de), 'hang: meaning shown');
  t.eq(await page.textContent('#h-won'), '1', 'hang: won counted');
  await t.shot(page, 'hang-won');

  /* lose after 7 wrong letters, word revealed */
  await page.click('#hang-next');
  s = (await st()).hang;
  const w7 = wrong(s.w).slice(0, 7);
  for (const c of w7) await click(c);
  t.eq(await page.textContent('#hang-fb .verdict'), 'Leider nicht – das Wort war:', 'hang: lose message after 7 mistakes');
  t.eq(await page.evaluate(() => document.getElementById('hang-word').getAttribute('aria-label').replace(/ /g, '')), s.w.w, 'hang: word revealed after losing');
  t.eq(await page.textContent('#h-streak'), '0', 'hang: streak reset');
  await t.shot(page, 'hang-lost');

  /* physical keyboard, Enter = next word; the apostrophe is visible from the start */
  await press('Enter');
  s = (await st()).hang;
  t.ok(!s.over, 'hang: Enter starts a new word');
  await press(wrong(s.w)[0]);
  t.eq((await st()).hang.misses, 1, 'hang: typing a letter works');
  const apo = await page.evaluate(() => { const w = window.__games.WORDS.find(x => x.w.includes('’') && x.w.length >= 5); return w && w.w; });
  t.ok(!!apo, 'data: a word with an apostrophe exists');

  /* ---- memory ---- */
  await page.click('#tab-memory');
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

  /* ---- letter scramble ---- */
  await page.click('#tab-scramble');
  s = (await st()).scr;
  t.ok(s.w.w.length >= 4 && !s.w.w.includes('’'), 'scramble: word without apostrophe');
  t.ok(s.tiles.join('') !== s.w.w, 'scramble: letters are mixed');
  t.eq([...s.tiles].sort().join(''), [...s.w.w].sort().join(''), 'scramble: tiles are the letters of the word');
  const spell = async (word, from = 0) => {
    for (const ch of word.slice(from)) {
      const idx = await page.evaluate(c => { const S = window.__games.state().scr; return S.tiles.findIndex((x, i) => x === c && !S.placed.includes(i)); }, ch);
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

  /* ---- word search ---- */
  await page.click('#tab-search');
  const wsState = () => page.evaluate(() => { const w = window.__games.state().ws; return { n: w.n, letters: w.letters, words: w.words.map(x => ({ w: x.w.w, cells: x.cells, found: x.found, gloss: x.w.gloss })), misses: w.misses, over: w.over }; });
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

  /* ---- topics: only colours → only colour words in every game ---- */
  await page.click('#tab-hang');
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('games.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__games.WORDS.filter(x => x.topic === 'colors').map(x => x.w));
  t.ok(col.includes((await st()).hang.w.w), 'chips: hang uses the selected topic');
  await page.click('#tab-scramble');
  await page.click('#tab-scramble');
  t.ok(col.includes((await st()).scr.w.w), 'chips: scramble uses the selected topic');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Word Games', 'English title');
  await page.click('#tab-hang');
  t.ok((await page.textContent('#hang-count')).includes('left'), 'English stitch counter');

  await t.linkedFromIndex('Wortspiele', REL);
};
