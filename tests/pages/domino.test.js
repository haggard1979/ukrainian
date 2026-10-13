/* Case domino: rounds are unambiguous, correct tiles chain up, wrong tiles explain the case, help chip,
   levels, win and best value, language. */
const REL = 'games/domino/domino-trainer.html';

module.exports = async t => {
  const page = await t.open(REL);
  const st = () => page.evaluate(() => {
    const d = window.__domino.state().d;
    return { n: d.n, step: d.step, mistakes: d.mistakes, over: d.over, hand: d.hand.map(x => ({ k: x.k, form: x.form, noun: x.noun, right: x.right, placed: x.placed })),
      phr: d.phr.map(p => ({ case: p.case, prep: p.prep, form: p.form })), chainLen: d.chain.length };
  });
  const NOUNS = await page.evaluate(() => window.__domino.NOUNS);
  const valid = (tile, c) => NOUNS[tile.noun].forms[c].includes(tile.form);

  /* ---- rounds: unambiguous and solvable, in every level ---- */
  let bad = [];
  for (const lv of [3, 4, 5]) {
    await page.click(`#d-levels [data-level="${lv}"]`);
    for (let i = 0; i < 40; i++) {
      const s = await st();
      if (s.n !== lv || s.hand.length !== lv) bad.push('size');
      if (new Set(s.phr.map(p => p.case)).size !== lv) bad.push('cases not distinct');
      s.hand.forEach(tile => s.phr.forEach((p, j) => { if (valid(tile, p.case) !== (tile.k === j)) bad.push('ambiguous tile ' + tile.form + ' for ' + p.case); }));
      if (new Set(s.hand.map(x => x.form)).size !== lv) bad.push('same form twice');
      s.phr.forEach((p, j) => { if (j < lv - 1 && s.hand.find(x => x.k === j).right !== s.phr[j + 1].prep) bad.push('tile right half'); });
      await page.click('#d-new');
    }
  }
  t.eq(bad.slice(0, 3), [], 'rounds: every tile fits exactly its own step (120 rounds in all levels)');

  /* ---- play a full round with a wrong try first ---- */
  await page.click('#d-levels [data-level="4"]');
  let s = await st();
  t.eq([s.n, await page.locator('#d-hand .dt').count(), s.chainLen], [4, 4, 1], 'level 4: four tiles in the hand, only the start tile in the chain');
  t.ok(/Nächster Stein für: /.test(await page.textContent('#d-need')), 'the end of the chain names the preposition');
  const wrongTile = s.hand.find(x => x.k !== 0);
  await page.click('#tile-' + wrongTile.k);
  s = await st();
  t.eq([s.mistakes, s.step], [1, 0], 'a wrong tile counts as a mistake and is not placed');
  t.ok(/verlangt den (Genitiv|Akkusativ|Instrumental|Lokativ|Dativ)/.test(await page.textContent('#d-msg')), 'the message explains which case the preposition takes');
  await t.shot(page, 'wrong');
  /* help chip shows the case in advance */
  await page.click('#d-help');
  t.ok((await page.textContent('#d-need')).includes('verlangt den '), 'help chip: the required case is shown');
  await page.click('#d-help');
  t.ok(!(await page.textContent('#d-need')).includes('verlangt den '), 'help chip: switched off again');
  for (let k = 0; k < 4; k++) await page.click('#tile-' + k);
  s = await st();
  t.ok(s.over && s.mistakes === 1, 'all tiles placed in order: the round is over with one mistake');
  t.eq(await page.locator('#d-phr li').count(), 4, 'the joints are listed as phrases');
  t.ok((await page.textContent('#d-phr')).includes('(Genitiv)') || (await page.textContent('#d-phr')).includes('(Akkusativ)') || (await page.textContent('#d-phr')).includes('(Instrumental)') || (await page.textContent('#d-phr')).includes('(Lokativ)') || (await page.textContent('#d-phr')).includes('(Dativ)'), 'the phrases name their case');
  t.ok((await page.textContent('#d-fb')).includes('1 Fehlversuch'), 'finish message with the mistakes');
  t.ok((await page.textContent('#d-fb')).includes('Neuer Bestwert'), 'first result is a record');
  t.ok((await page.textContent('#d-stats')).includes('mittel 1'), 'best value stored for the level');
  await t.shot(page, 'won');

  /* a clean round beats the best value */
  await page.click('#d-again');
  for (let k = 0; k < 4; k++) await page.click('#tile-' + k);
  t.ok((await page.textContent('#d-fb')).includes('Ohne Fehlversuch'), 'a clean round');
  t.ok((await page.textContent('#d-stats')).includes('ohne Fehler: 1') && (await page.textContent('#d-stats')).includes('mittel 0'), 'perfect rounds and best value updated');

  /* ---- rules table lists all prepositions ---- */
  await page.click('#tab-rules');
  const rules = await page.textContent('#rules-de');
  t.ok(['без', 'про', 'над', 'при', 'завдяки'].every(p => rules.includes(p)), 'rules: prepositions of every case listed');
  await page.click('#tab-play');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Case Domino', 'English title');
  await page.click('#d-new');
  s = await st();
  await page.click('#tile-' + s.hand.find(x => x.k !== 0).k);
  t.ok(/takes the (Genitive|Accusative|Instrumental|Locative|Dative)/.test(await page.textContent('#d-msg')), 'explanation in English');

  await t.linkedFromIndex('Fall-Domino', REL);
};
