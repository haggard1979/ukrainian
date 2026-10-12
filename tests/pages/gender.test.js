/* Gender trainer: noun gender (4 options, keys 1–4), adjective agreement (choose / type, also with the noun),
   German-gender note, "tricky words only" filter, rules, language. */
const REL = 'grammar/gender/gender-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const G = await page.evaluate(() => ({ nouns: window.__gender.NOUNS, an: window.__gender.ANOUNS }));
  const GI = { m: 0, f: 1, n: 2, pl: 3 };
  const shown = () => page.evaluate(() => document.getElementById('sentence').textContent.replace(/\s+/g, ' ').trim());
  const noun = async () => { const w = await shown(); return G.nouns.find(x => x.w === w); };
  /* adjective task: base adjective + noun after the gap */
  const adjTask = () => page.evaluate(() => {
    const A = window.__gender, base = document.getElementById('base-word').textContent;
    const w = document.getElementById('sentence').textContent.replace(/\s+/g, ' ').trim();
    const a = A.ADJS.find(x => x.f[0] === base), n = A.ANOUNS.find(x => x.w === w);
    return a && n ? { a: a.f, n: n.w, g: n.g, comb: a.comb, kind: n.kind, ans: a.f[{ m: 0, f: 1, n: 2, pl: 3 }[n.g]] } : null;
  });

  /* nouns: choose the gender, by click and by key */
  await page.click('#mode-noun');
  t.eq(await page.locator('#opts .opt').count(), 4, 'noun: four gender options');
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 120; i++) {
    const n = await noun(); if (!n) { bad++; await t.next(page); continue; }
    seen.add(n.w);
    if (i % 2) await page.click(`#opts [data-v="${n.g}"]`);
    else { await page.click('#card .card-head'); await page.keyboard.press(String(GI[n.g] + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 120, 'noun: right gender accepted'); t.ok(seen.size > 60, 'noun: many different words (' + seen.size + ')');

  /* wrong gender: solution, Ukrainian name of the gender, agreement example, rule */
  let n = await noun();
  const wrongG = n.g === 'm' ? 'f' : 'm';
  await page.click(`#opts [data-v="${wrongG}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'noun: wrong gender rejected');
  const fb = await t.fb(page);
  t.ok(/рід|множина/.test(fb) && fb.includes('Zum Beispiel'), 'noun: feedback names the gender and gives an example');
  t.ok(await page.locator('#opts .opt.right').count() === 1 && await page.locator('#opts .opt.wrong').count() === 1, 'noun: right and wrong option marked');
  await t.shot(page, 'noun-wrong');
  await t.next(page);

  /* German gender differs → note in the feedback (e.g. das Buch → книга) */
  let found = false;
  for (let i = 0; i < 80 && !found; i++) {
    n = await noun();
    await page.click(`#opts [data-v="${n.g}"]`);
    if (n.deDiff) { found = true; t.ok((await t.fb(page)).includes('Anders als im Deutschen: ' + n.de), 'noun: note on the different German gender'); }
    await t.next(page);
  }
  t.ok(found, 'noun: a word with a different German gender came up');

  /* tricky words only */
  await page.click('#opt-hard');
  bad = 0;
  for (let i = 0; i < 25; i++) {
    n = await noun(); if (!n || !n.hard) bad++;
    await page.click(`#opts [data-v="${n ? n.g : 'm'}"]`); await t.next(page);
  }
  t.zero(bad, 25, '"tricky words only" shows only exceptions and German-gender differences');
  await page.click('#opt-hard');

  /* adjectives: choose the form */
  await page.click('#mode-adjc');
  bad = 0; const gs = new Set(); let odd = 0;
  for (let i = 0; i < 80; i++) {
    const x = await adjTask(); if (!x) { bad++; await t.next(page); continue; }
    gs.add(x.g);
    if (x.comb !== 'any' && x.kind === 'p' || x.comb === 'thing' && x.kind !== 't') odd++;   /* no "синій брат" */
    await page.click(`#opts [data-v="${x.ans}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 80, 'adjective choice: right form accepted');
  t.eq([...gs].sort(), ['f', 'm', 'n', 'pl'], 'adjective choice: all genders and plural come up');
  t.zero(odd, 80, 'adjective choice: colours only with things (and animals)');
  let x = await adjTask();
  await page.click(`#opts [data-v="${x.a.find(f => f !== x.ans)}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'adjective choice: wrong form rejected');
  t.ok((await t.fb(page)).includes(x.ans + ' ' + x.n), 'adjective choice: feedback shows the phrase');
  await t.next(page);

  /* adjectives: type the form – alone, with the noun, in capitals */
  await page.click('#mode-adjt');
  bad = 0;
  for (let i = 0; i < 60; i++) {
    x = await adjTask(); if (!x) { bad++; await t.next(page); continue; }
    const ans = i % 3 === 0 ? x.ans : i % 3 === 1 ? x.ans + ' ' + x.n : x.ans.toUpperCase().replace(/’/g, "'");
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 60, 'adjective typing: right form accepted (alone, with the noun, capitals)');
  x = await adjTask();
  await page.fill('#answer-input', x.a.find(f => f !== x.ans)); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'adjective typing: wrong form rejected');
  await t.shot(page, 'adj-wrong');
  await t.next(page);
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'adjective typing: hint shown');

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Gender Trainer', 'English title');
  await page.click('#mode-noun');
  t.ok(/masculine/.test(await page.textContent('#opts')), 'gender options in English');
  await page.click('#tab-rules');
  t.ok(await page.locator('.rules:not([hidden]) h2').count() >= 4, 'rules in English');

  await t.linkedFromIndex('Genus-Trainer', REL);
};
