/* Accusative trainer: type / choice / "wohin oder wo?" / rev, wrong answers, rules, language. */
const REL = 'grammar/accusative/accusative-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const item = list => page.evaluate(list => {
    const A = window.__akkusativ, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ');
    const nom = document.getElementById('base-word').textContent;
    if (list === 'REV') return A.REV.find(i => i.s.replace('___', i.a[0]) === s) || null;
    return A[list].find(i => { const [a, z] = i.s.split('___'); return i.nom === nom && s.startsWith(a) && s.endsWith(z); }) || null;
  }, list);

  await page.click('#mode-type');
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 100; i++) {
    const it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    seen.add(it.key);
    const ans = i % 3 === 0 ? it.a[0].toUpperCase() : i % 3 === 1 ? it.a[0].replace(/’/g, "'") : it.a[it.a.length - 1];
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 100, 'type: correct answers accepted'); t.ok(seen.size > 40, 'type: many different tasks (' + seen.size + ')');

  /* nominative where the accusative differs → wrong, solution shown */
  for (let i = 0; i < 40; i++) {
    const it = await item('ITEMS');
    if (it.a[0] !== it.nom) {
      await page.fill('#answer-input', it.nom); await page.click('#check-btn');
      t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: nominative rejected');
      t.ok((await t.fb(page)).includes(it.a[0]), 'type: feedback shows the solution');
      break;
    }
    await page.fill('#answer-input', it.a[0]); await page.click('#check-btn'); await t.next(page);
  }
  await t.shot(page, 'type-wrong');
  await t.next(page);

  await page.click('#mode-choice');
  bad = 0;
  for (let i = 0; i < 30; i++) {
    const it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${it.a[0]}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 30, 'choice: right option accepted');

  /* wohin (accusative) oder wo (locative)? */
  await page.click('#mode-prep');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    const it = await item('PREPS'); if (!it) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${it.ans === 'akk' ? it.akk : it.lok}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'wohin/wo: right form accepted');
  let it = await item('PREPS');
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'wohin/wo: hint shown');
  await page.click(`#opts [data-v="${it.ans === 'akk' ? it.lok : it.akk}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'wohin/wo: wrong form rejected');
  await t.next(page);

  await page.click('#mode-rev');
  bad = 0;
  for (let i = 0; i < 60; i++) {
    it = await item('REV'); if (!it) { bad++; await t.next(page); continue; }
    await page.fill('#answer-input', it.nom); await page.click(`#genders [data-g="${it.g}"]`); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 60, 'rev: base form + gender accepted');
  t.eq(await page.evaluate(() => { const A = window.__akkusativ, a = new Set(A.ITEMS.map(i => i.nom)); return A.REV.filter(r => a.has(r.nom)).map(r => r.nom); }), [], 'rev: own word list');

  await page.click('[data-set-lang=en]'); await page.click('#tab-rules');
  t.ok(await page.locator('.rules:not([hidden]) h2').count() > 3, 'rules in English');
  t.eq(await page.title(), 'Ukrainian Accusative Trainer', 'English title');

  await t.linkedFromIndex('Akkusativ-Trainer', REL);
};
