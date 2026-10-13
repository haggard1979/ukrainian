/* Crossword: generator (all words placed, no unintended words, numbering), typing by keyboard and on-screen keys,
   direction toggle, check / hint / solution, win with time, topics, language. */
const REL = 'games/crossword/crossword-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => {
    const x = window.__crossword.state().x;
    return { rows: x.rows, cols: x.cols, sel: x.sel, dir: x.dir, hints: x.hints, over: x.over, gaveUp: x.gaveUp,
      cells: x.cells.map(c => c && { sol: c.sol, val: c.val, mark: c.mark, hint: c.hint, num: c.num }),
      words: x.words.map(w => ({ w: w.w, r: w.r, c: w.c, dir: w.dir, num: w.num, gloss: w.e.gloss })) };
  });

  /* ---- generator: many puzzles, every one valid ---- */
  const valid = x => {
    const probs = [];
    const at = (r, c) => (r < 0 || c < 0 || r >= x.rows || c >= x.cols) ? null : x.cells[r * x.cols + c];
    /* every word is in the grid at its place */
    x.words.forEach(w => [...w.w].forEach((ch, k) => { const c = at(w.r + (w.dir ? k : 0), w.c + (w.dir ? 0 : k)); if (!c || c.sol !== ch) probs.push('word ' + w.w + ' not in grid'); }));
    /* every run of two or more letters is one of the placed words */
    const runs = [];
    for (let r = 0; r < x.rows; r++) { let s = ''; for (let c = 0; c <= x.cols; c++) { const cell = at(r, c); if (cell) s += cell.sol; else { if (s.length > 1) runs.push([s, r, c - s.length, 0]); s = ''; } } }
    for (let c = 0; c < x.cols; c++) { let s = ''; for (let r = 0; r <= x.rows; r++) { const cell = at(r, c); if (cell) s += cell.sol; else { if (s.length > 1) runs.push([s, r - s.length, c, 1]); s = ''; } } }
    runs.forEach(([s, r, c, d]) => { if (!x.words.some(w => w.w === s && w.r === r && w.c === c && w.dir === d)) probs.push('unintended word ' + s); });
    if (runs.length !== x.words.length) probs.push('runs ' + runs.length + ' vs words ' + x.words.length);
    if (new Set(x.words.map(w => w.w)).size !== x.words.length) probs.push('duplicate word');
    if (x.rows > 11 || x.cols > 11) probs.push('grid too big');
    return probs;
  };
  const sizes = { 5: [], 7: [], 9: [] };
  let bad = [];
  for (const lv of [5, 7, 9]) {
    await page.click(`#x-levels [data-level="${lv}"]`);
    for (let i = 0; i < 25; i++) {
      const x = await st(); sizes[lv].push(x.words.length);
      bad.push(...valid(x));
      await page.click('#x-new');
    }
  }
  t.eq(bad.slice(0, 3), [], 'generator: every puzzle is valid (all words placed, no unintended words, grid ≤ 11)');
  for (const lv of [5, 7, 9]) t.ok(Math.min(...sizes[lv]) >= lv - 1, 'generator: level ' + lv + ' builds at least ' + (lv - 1) + ' words (min ' + Math.min(...sizes[lv]) + ')');
  t.ok(sizes[9].filter(n => n === 9).length >= 20, 'generator: the large level usually reaches 9 words');

  /* ---- numbering and clue lists ---- */
  await page.click('#x-levels [data-level="7"]');
  let x = await st();
  const nums = [...new Set(x.words.map(w => w.num))].sort((a, b) => a - b);
  t.eq(nums, nums.map((_, i) => i + 1), 'numbering: 1…n without gaps');
  t.eq(await page.locator('#x-across li').count() + await page.locator('#x-down li').count(), x.words.length, 'clues: one entry per word');
  t.ok((await page.textContent('#x-clue')).includes('(' + x.words.find(w => w.num === 1).w.length + ')'), 'clue bar shows the length of the selected word');

  /* ---- typing a word by the physical keyboard, selecting by clue ---- */
  const w1 = x.words[0];
  await page.click(`#clue-${w1.num}-${w1.dir}`);
  for (const ch of w1.w) await press(ch);
  x = await st();
  const cells1 = [...w1.w].map((_, k) => x.cells[(w1.r + (w1.dir ? k : 0)) * x.cols + w1.c + (w1.dir ? 0 : k)]);
  t.eq(cells1.map(c => c.val).join(''), w1.w, 'typing: the word is written into its cells');
  t.ok(await page.evaluate(n => document.querySelector(`#clues-done, #x-across .done, #x-down .done`) !== null, 0), 'clue list marks the solved word');

  /* ---- on-screen keys and backspace ---- */
  await page.click('#x-new');
  x = await st();
  const w2 = x.words[0];
  await page.click(`#clue-${w2.num}-${w2.dir}`);
  const key = ch => page.evaluate(c => { const i = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'.indexOf(c); document.getElementById('xk-' + i).click(); }, ch);
  const wrongCh = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'.split('').find(c => c !== w2.w[0]);
  await key(wrongCh);
  x = await st();
  t.eq(x.cells[w2.r * x.cols + w2.c].val, wrongCh, 'on-screen key writes a letter');
  t.eq(x.sel, w2.dir ? (w2.r + 1) * x.cols + w2.c : w2.r * x.cols + w2.c + 1, 'the selection moves to the next cell of the word');
  await page.click('#xk-back');
  x = await st();
  t.eq(x.cells[w2.r * x.cols + w2.c].val, '', 'backspace clears the previous cell');
  /* check marks wrong letters */
  await key(wrongCh);
  await page.click('#x-check');
  x = await st();
  t.eq(x.cells[w2.r * x.cols + w2.c].mark, 'bad', 'check: a wrong letter is marked');
  t.ok((await page.textContent('#x-msg')).includes('falsch'), 'check: message names the wrong letters');
  await t.shot(page, 'check');

  /* ---- direction toggle on a crossing cell ---- */
  await page.click('#x-new');
  x = await st();
  const crossIdx = x.cells.findIndex((c, i) => c && x.words.filter(w => [...w.w].some((_, k) => (w.r + (w.dir ? k : 0)) * x.cols + w.c + (w.dir ? 0 : k) === i)).length === 2);
  if (crossIdx >= 0) {
    await page.click('#xc-' + crossIdx);
    const d1 = (await st()).dir;
    await page.click('#xc-' + crossIdx);
    t.ok((await st()).dir !== d1, 'tapping the same crossing cell switches the direction');
  } else t.ok(true, 'no crossing cell in this puzzle');

  /* ---- hint: reveals the letter, counts as help, no best time ---- */
  await page.click('#x-new');
  x = await st();
  const w3 = x.words[0];
  await page.click(`#clue-${w3.num}-${w3.dir}`);
  await page.click('#x-hint');
  x = await st();
  t.eq([x.cells[w3.r * x.cols + w3.c].val, x.cells[w3.r * x.cols + w3.c].hint, x.hints], [w3.w[0], true, 1], 'hint: the selected letter is revealed and counted');
  /* solve it completely by typing: win, but no best time because of the hint */
  await page.clock.fastForward(30000);
  for (const w of x.words) { await page.click(`#clue-${w.num}-${w.dir}`); for (const ch of w.w) await press(ch); }
  t.ok(await t.visible(page, '#x-fb'), 'win: the finish message appears');
  t.ok((await page.textContent('#x-fb')).includes('Geschafft'), 'win: message');
  t.ok(/Zeit 0:3\d/.test(await page.textContent('#x-fb')) || /Zeit 0:[2-4]\d/.test(await page.textContent('#x-fb')), 'win: time shown (about 30 s)');
  t.ok(!(await page.textContent('#x-fb')).includes('Bestzeit!'), 'win: no record with a hint');
  await t.shot(page, 'won');

  /* ---- a clean solve stores the best time ---- */
  await page.click('#x-again');
  x = await st();
  await page.clock.fastForward(45000);
  for (const w of x.words) { await page.click(`#clue-${w.num}-${w.dir}`); for (const ch of w.w) await press(ch); }
  t.ok((await page.textContent('#x-fb')).includes('Neue Bestzeit'), 'clean solve: new best time');
  t.ok(/mittel 0:4\d|mittel 0:5\d/.test(await page.textContent('#x-best')), 'clean solve: best time stored for the level');

  /* ---- solution ---- */
  await page.click('#x-again');
  await page.click('#x-solve');
  t.ok((await page.textContent('#x-fb')).includes('Lösung'), 'solution: shown');
  x = await st();
  t.ok(x.cells.every(c => !c || c.val === c.sol), 'solution: all cells filled');

  /* ---- topics: only colours ---- */
  await page.click('#x-again');
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('crossword.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__crossword.WORDS.filter(w => w.topic === 'colors').map(w => w.w));
  x = await st();
  t.ok(x.words.length >= 2 && x.words.every(w => col.includes(w.w)), 'chips: the puzzle uses only colour words');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Crossword', 'English title');
  t.ok((await page.textContent('#x-clue')).includes('across') || (await page.textContent('#x-clue')).includes('down'), 'clue bar in English');

  await t.linkedFromIndex('Kreuzworträtsel', REL);
};
