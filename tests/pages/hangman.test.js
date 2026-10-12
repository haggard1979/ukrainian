/* Hangman-style word guessing: win, lose, hint, apostrophe, keyboard, topics, language. */
const REL = 'games/hangman/hangman-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* Playwright cannot press Cyrillic keys, so dispatch the keydown directly */
  const press = k => page.evaluate(k => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), k);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__hangman.state(), (k, v) => k === 'w' && v && v.w ? { w: v.w, topic: v.topic, gloss: v.gloss } : v)));
  void press; void st;

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
  const apo = await page.evaluate(() => { const w = window.__hangman.WORDS.find(x => x.w.includes('’') && x.w.length >= 5); return w && w.w; });
  t.ok(!!apo, 'data: a word with an apostrophe exists');

  /* ---- topics: only colours ---- */
  for (const id of ['animals', 'food', 'home', 'family', 'nature', 'town', 'body']) await page.click('#topic-' + id);
  await page.click('#topic-colors');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('hangman.v1')).topics), ['colors'], 'chips: last topic cannot be deselected');
  const col = await page.evaluate(() => window.__hangman.WORDS.filter(x => x.topic === 'colors').map(x => x.w));
  t.ok(col.includes((await st()).hang.w.w), 'chips: hangman uses the selected topic');

  /* language and the old combined progress key */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Word Guessing', 'English title');
  t.ok((await page.textContent('#hang-count')).includes('left'), 'English stitch counter');
  /* progress of the old combined page (games.v1) is picked up once */
  const mig = await t.open(REL);
  await mig.evaluate(() => localStorage.removeItem('hangman.v1'));
  await mig.evaluate(() => localStorage.setItem('games.v1', JSON.stringify({ topics: ['colors'] })));
  await mig.reload(); await t.ready(mig);
  t.eq(await mig.evaluate(() => document.querySelectorAll('#chips [aria-pressed=true]').length), 1, 'legacy games.v1: selected topics are taken over');

  await t.linkedFromIndex('Wortraten', REL);
};
