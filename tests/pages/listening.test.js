/* Listening trainer: understand / gap dictation / sentence dictation, tempo, hidden text until the answer,
   wrong answers, topic chips, language. */
const REL = 'listening/listening-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const cur = () => page.evaluate(() => {
    const L = window.__listening.ITEMS;
    const spoken = window.__spoken[window.__spoken.length - 1];
    return { it: L.find(x => x.spoken === spoken) || null, spoken };
  });
  /* the task is identified by what was spoken: press play once */
  const play = async () => { await page.click('#play-btn'); return cur(); };

  t.eq(await page.locator('#feedback').isHidden(), true, 'no feedback before the answer');

  /* understand: text hidden, right option accepted, all four keys */
  let bad = 0;
  for (let i = 0; i < 12; i++) {
    const { it } = await play();
    t.ok(!!it, 'understand: the spoken text is one of the items');
    const hiddenOk = await page.evaluate(s => !document.getElementById('card').innerText.includes(s.split(' ')[1] || s), it.spoken);
    t.ok(hiddenOk, 'understand: text hidden before the answer');
    if (i % 2) await page.click('#opts [data-right="1"]');
    else { await page.click('#card .card-head'); const idx = await page.evaluate(() => [...document.querySelectorAll('#opts .opt')].findIndex(b => b.dataset.right === '1')); await page.keyboard.press(String(idx + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    t.ok((await t.fb(page)).includes(it.lines[0].replace(/^[—–-]\s*/, '').slice(0, 8)), 'understand: text shown after the answer');
    await t.next(page);
  }
  t.zero(bad, 12, 'understand: right option accepted');
  await play();
  await page.click('#opts [data-right="0"] >> nth=0');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'understand: wrong option rejected');
  t.ok((await t.fb(page)).includes('Richtig ist'), 'understand: right answer shown');
  await t.shot(page, 'understand-wrong');
  await t.next(page);

  /* tempo: slow uses a lower speech rate */
  await page.click('#tempo [data-tempo=slow]');
  await page.click('#play-btn');
  const rates = await page.evaluate(() => window.__rates);
  t.eq(rates[rates.length - 1], 0.6, 'tempo: slow plays at 0.6');
  await page.click('#tempo [data-tempo=normal]');
  await page.click('#again-btn');
  t.eq(await page.evaluate(() => window.__rates[window.__rates.length - 1]), 0.9, 'tempo: normal plays at 0.9');

  /* gap dictation: the sentence is shown with ___, the gap word (or a variant) accepted */
  await page.click('#mode-gap');
  bad = 0;
  for (let i = 0; i < 20; i++) {
    const { it } = await play();
    const shown = await page.textContent('#gapped');
    if (!shown.includes('___')) bad++;
    const ans = i % 3 === 0 && it.gapVariants.length ? it.gapVariants[0] : i % 3 === 1 ? it.gap.toUpperCase().replace(/’/g, "'") : it.gap;
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 20, 'gap: gap shown, word (capitals, apostrophe, digit variant) accepted');
  await play();
  await page.fill('#answer-input', 'ццц'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'gap: wrong word rejected');
  t.ok((await t.fb(page)).includes('Das Wort war'), 'gap: right word shown');
  await t.shot(page, 'gap-wrong');
  await t.next(page);

  /* sentence dictation: whole sentence, punctuation ignored; dialogues never come up */
  await page.click('#mode-dict');
  bad = 0;
  for (let i = 0; i < 20; i++) {
    const { it } = await play();
    if (it.dialog) bad++;
    await page.fill('#answer-input', i % 2 ? it.spoken.toLowerCase().replace(/[.,!?]/g, '') : it.spoken); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 20, 'dict: sentence accepted (no punctuation, no dialogues)');
  const { it } = await play();
  const words = it.spoken.split(' ');
  words.splice(1, 1);
  await page.fill('#answer-input', words.join(' ')); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'dict: missing word rejected');
  t.ok(await page.locator('#feedback .cmp .miss').count() > 0, 'dict: missing word marked');
  await t.shot(page, 'dict-wrong');
  await t.next(page);

  /* chips: the last topic cannot be deselected; only one topic left → only its items */
  await page.click('#mode-understand');
  for (const id of ['greet', 'shop', 'time', 'numbers', 'way']) await page.click('#topic-' + id);
  await page.click('#topic-family');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('listening.v1')).topics), ['family'], 'chips: last topic cannot be deselected');
  const fam = await page.evaluate(() => window.__listening.ITEMS.filter(x => x.topic === 'family').map(x => x.spoken));
  for (let i = 0; i < 6; i++) { const r = await play(); t.ok(fam.includes(r.spoken), 'chips: only family items'); await page.click('#opts [data-right="1"]'); await t.next(page); }

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Listening Trainer', 'English title');
  t.ok((await page.textContent('#cat-label')).toLowerCase().includes('listen'), 'English task label');

  /* without a Ukrainian voice the note appears */
  const nv = await t.open(REL, { voice: 'none' });
  await nv.click('#play-btn');
  t.ok(await t.visible(nv, '#say-note'), 'no Ukrainian voice: note shown');

  await t.linkedFromIndex('Hör-Trainer', REL);
};
