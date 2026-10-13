/* Spot the mistake: tapping the wrong word, wrong taps, choosing the form, scoring, keys, topics, language. */
const REL = 'games/mistake/mistake-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const cur = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__mistake.state().cur)));
  const stripP = w => w.replace(/[.,!?;:]+$/, '');

  /* ---- the data: every item has exactly one wrong word that is not simply the right one ---- */
  const items = await page.evaluate(() => JSON.parse(JSON.stringify(window.__mistake.ITEMS)));
  t.ok(items.length >= 40, 'data: at least 40 sentences (' + items.length + ')');
  t.ok(items.every(i => stripP(i.toks[i.index]) === i.wrong && i.options[0] === i.correct), 'data: index points to the wrong word, correct form comes first');

  /* ---- a clean pass: right word first, right form ---- */
  let bad = 0;
  for (let i = 0; i < 20; i++) {
    const c = await cur();
    await page.click('#tok-' + c.index);
    t.ok(await t.visible(page, '#opts'), 'step 2: the options appear after the right word');
    if (i % 2) await page.click(`#opts [data-v="${c.correct}"]`);
    else { const idx = await page.evaluate(v => [...document.querySelectorAll('#opts .opt')].findIndex(b => b.dataset.v === v), c.correct); await page.keyboard.press(String(idx + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 20, 'clean pass is right (by click and by key)');

  /* ---- a wrong tap first: stays in step 1, counts as a failed try, the item is not right ---- */
  let c = await cur();
  const other = c.toks.findIndex((_, i) => i !== c.index);
  await page.click('#tok-' + other);
  t.eq(await page.locator('#opts').isHidden(), true, 'wrong word: still step 1');
  t.ok((await page.textContent('#prompt')).includes('richtig'), 'wrong word: the page says the tapped word is right');
  t.eq((await page.evaluate(() => window.__mistake.state())).misses, 1, 'wrong word: counted');
  await page.click('#tok-' + c.index);
  await page.click(`#opts [data-v="${c.correct}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'a failed try makes the item not right');
  t.ok((await t.fb(page)).includes('2 Versuchen'), 'feedback says how many tries were needed');
  await t.shot(page, 'later');
  await t.next(page);

  /* ---- a wrong form ---- */
  c = await cur();
  await page.click('#tok-' + c.index);
  await page.click(`#opts [data-v="${c.options[1]}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'wrong form rejected');
  const fb = await t.fb(page);
  t.ok(fb.includes(c.wrong) && fb.includes(c.correct), 'feedback shows the wrong and the right word');
  t.ok(fb.includes('Richtiger Satz'), 'feedback shows the corrected sentence');
  t.ok(await t.visible(page, '#translation'), 'the translation appears after the answer');
  await t.shot(page, 'wrong-form');
  await t.next(page);

  /* ---- Enter goes on ---- */
  c = await cur();
  await page.click('#tok-' + c.index); await page.click(`#opts [data-v="${c.correct}"]`);
  await page.clock.fastForward(300);
  const turnBefore = await page.textContent('#turn-label');
  await page.keyboard.press('Enter');
  t.ok(await page.textContent('#turn-label') !== turnBefore, 'Enter starts the next sentence');

  /* ---- topics: only pronouns ---- */
  for (const id of ['cases', 'gender', 'numbers', 'verbs', 'comparison']) await page.click('#topic-' + id);
  await page.click('#topic-pronouns');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('mistake.v1')).topics), ['pronouns'], 'chips: last topic cannot be deselected');
  const seen = new Set();
  for (let i = 0; i < 10; i++) { c = await cur(); seen.add(c.topic); await page.click('#tok-' + c.index); await page.click(`#opts [data-v="${c.correct}"]`); await t.next(page); }
  t.eq([...seen], ['pronouns'], 'chips: only sentences of the chosen topic');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Spot the Mistake', 'English title');
  c = await cur();
  await page.click('#tok-' + c.index);
  t.ok((await page.textContent('#prompt')).includes('Which form'), 'English prompt');

  await t.linkedFromIndex('Fehlerjagd', REL);
};
