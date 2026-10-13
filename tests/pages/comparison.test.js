/* Comparative / superlative trainer: type / choice / stage / construction / reverse modes, degree filter,
   groups, hints for typical mistakes, forms list, language. */
const REL = 'grammar/comparison/comparison-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const cur = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__comparison.state().cur)));
  const answer = async text => { await page.fill('#answer-input', text); await page.click('#check-btn'); };

  /* ---- type: every answer variant, capitals, apostrophe ---- */
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const c = await cur();
    const a = c.a[i % c.a.length];
    await answer(i % 4 === 3 ? a.toUpperCase().replace(/’/g, "'") : a);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'type: all accepted answers (also capitals, apostrophe) are right');

  /* typical mistakes get a specific hint: base form, superlative for comparative, missing най- */
  const find = async degree => { for (let i = 0; i < 80; i++) { const c = await cur(); if (c.degree === degree && c.cat !== 'an') return c; await answer(c.a[0]); await t.next(page); } };
  let c = await find('comp');
  await answer(c.base);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: base form rejected');
  t.ok((await t.fb(page)).includes('Grundform (Positiv)'), 'type: hint "that is the base form"');
  t.ok((await t.fb(page)).includes('→'), 'type: feedback shows the forms of the adjective');
  await t.shot(page, 'type-wrong');
  await t.next(page);
  c = await find('comp');
  await answer('най' + c.a[0]);
  t.ok((await t.fb(page)).includes('schon der Superlativ'), 'type: superlative for a comparative is explained');
  await t.next(page);
  c = await find('sup');
  await answer(c.a[0].replace(/^най/, ''));
  t.ok((await t.fb(page)).includes('най-'), 'type: missing най- is explained');
  await t.next(page);

  /* ---- choice: right option by click and by key ---- */
  await page.click('#mode-choice');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    c = await cur();
    if (i % 2) await page.click(`#opts [data-v="${c.a[0]}"]`);
    else { await page.click('#card .card-head'); const idx = await page.evaluate(v => [...document.querySelectorAll('#opts .opt')].findIndex(b => b.dataset.v === v), c.a[0]); await page.keyboard.press(String(idx + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'choice: right form accepted');
  c = await cur();
  t.eq(await page.locator('#opts .opt').count(), 4, 'choice: four options');
  await page.click(`#opts [data-v="${c.d[0]}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'choice: distractor rejected');
  await t.shot(page, 'choice-wrong');
  await t.next(page);

  /* ---- degree filter and groups ---- */
  await page.click('#degrees [data-d="sup"]');
  let degs = new Set();
  for (let i = 0; i < 20; i++) { c = await cur(); degs.add(c.degree); await page.click(`#opts [data-v="${c.a[0]}"]`); await t.next(page); }
  t.eq([...degs], ['sup'], 'filter: only superlative tasks');
  await page.click('#degrees [data-d="all"]');
  for (const id of ['reg', 'sh', 'irr', 'an']) await page.click('#chip-' + id);
  const cats = new Set();
  for (let i = 0; i < 12; i++) { c = await cur(); cats.add(c.cat); await page.click(`#opts [data-v="${c.a[0]}"]`); await t.next(page); }
  t.eq([...cats], ['adv'], 'groups: only adverbs');
  for (const id of ['reg', 'sh', 'irr', 'an']) await page.click('#chip-' + id);

  /* ---- stage ---- */
  await page.click('#mode-stage');
  t.eq(await page.locator('#opts .opt').count(), 3, 'stage: three options');
  t.ok(!(await t.visible(page, '#base')), 'stage: no base form block');
  t.eq(await page.locator('#sentence .hl').count(), 1, 'stage: the form is highlighted in the sentence');
  bad = 0;
  const seen = new Set();
  for (let i = 0; i < 36; i++) {
    c = await cur(); seen.add(c.answer);
    if (i % 2) await page.click(`#opts [data-v="${c.answer}"]`);
    else { await page.click('#card .card-head'); await page.keyboard.press(String(['pos', 'comp', 'sup'].indexOf(c.answer) + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 36, 'stage: right degree accepted');
  t.eq([...seen].sort(), ['comp', 'pos', 'sup'], 'stage: all three degrees come up');
  c = await cur();
  await page.click(`#opts [data-v="${['pos', 'comp', 'sup'].find(x => x !== c.answer)}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'stage: wrong degree rejected');
  t.ok((await t.fb(page)).includes('Stufe: '), 'stage: feedback names the degree');
  await t.shot(page, 'stage-wrong');
  await t.next(page);

  /* ---- construction: за / від / ніж ---- */
  await page.click('#mode-con');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    c = await cur();
    await answer(c.a[i % 3] + (i % 5 === 4 ? '.' : ''));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'construction: all three variants (за / від / ніж) are right');
  c = await cur();
  const wrongForm = c.a[0].split(' ')[0] + ' ' + c.compared;     // right preposition, nominative instead of accusative
  if (wrongForm !== c.a[0]) {
    await answer(wrongForm);
    t.eq(await t.verdict(page), 'Noch nicht richtig', 'construction: right preposition with the wrong form rejected');
    t.ok((await t.fb(page)).includes('Präposition stimmt'), 'construction: hint that the preposition is right');
  } else await answer('над ' + c.compared);
  const fbText = await t.fb(page);
  t.ok(c.a.every(a => fbText.includes(a)), 'construction: feedback lists all three correct variants');
  await t.shot(page, 'construction-wrong');
  await t.next(page);

  /* ---- reverse: base form + degree ---- */
  await page.click('#mode-rev');
  bad = 0;
  for (let i = 0; i < 30; i++) {
    c = await cur();
    await page.click(`#pick-degree [data-d="${c.degree}"]`);
    await answer(c.bases[i % c.bases.length]);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 30, 'reverse: base form (all accepted bases) with the right degree');
  c = await cur();
  await answer(c.bases[0]);
  t.ok(await t.visible(page, '#hint'), 'reverse: a missing degree choice asks for it');
  await page.click(`#pick-degree [data-d="${c.degree === 'comp' ? 'sup' : 'comp'}"]`); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'reverse: wrong degree rejected');
  t.ok((await t.fb(page)).includes('Deine Wahl'), 'reverse: feedback shows the wrong choice');
  await t.shot(page, 'reverse-wrong');
  await t.next(page);
  await page.click('#degrees [data-d="comp"]');
  const rd = new Set();
  for (let i = 0; i < 10; i++) { c = await cur(); rd.add(c.degree); await page.click(`#pick-degree [data-d="${c.degree}"]`); await answer(c.bases[0]); await t.next(page); }
  t.eq([...rd], ['comp'], 'reverse: degree filter applies');

  /* ---- forms list ---- */
  await page.click('#tab-forms');
  const rows = await page.locator('#form-list tr').count();
  t.ok(rows > 60, 'forms: all adjectives and adverbs listed (' + rows + ' rows)');
  await page.fill('#form-search', 'вищ');
  t.ok((await page.textContent('#form-list')).includes('високий'), 'forms: search finds високий by its comparative');
  await page.fill('#form-search', 'schnell');
  t.ok((await page.textContent('#form-list')).includes('швидкий') && (await page.textContent('#form-list')).includes('швидко'), 'forms: search by German meaning');
  await page.fill('#form-search', 'zzzz');
  t.ok(await t.visible(page, '#form-empty'), 'forms: empty message');
  await page.fill('#form-search', '');
  await t.shot(page, 'forms');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Comparative and Superlative Trainer', 'English title');
  t.ok((await page.textContent('#form-list')).includes('Comparative'), 'forms list in English');
  await page.click('#tab-train');
  await page.click('#mode-stage');
  c = await cur();
  await page.click(`#opts [data-v="${['pos', 'comp', 'sup'].find(x => x !== c.answer)}"]`);
  t.ok((await t.fb(page)).includes('Degree: '), 'English feedback');

  await t.linkedFromIndex('Komparativ-und-Superlativ-Trainer', REL);
};
