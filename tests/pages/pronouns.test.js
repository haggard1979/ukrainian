/* Personal pronoun trainer: type (also with the preposition typed along), choose (with/without н- always offered),
   find the case, find the pronoun (його → він and воно), case chips, hints, feedback table, language. */
const REL = 'grammar/pronouns/pronouns-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* the task on screen: the sentence with the gap (or the filled-in form) identifies the item */
  const item = list => page.evaluate(list => {
    const P = window.__pronouns, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ').trim();
    const it = P[list].find(i => { const [a, z] = i.s.split('___'); return s.startsWith(a.trim()) && s.endsWith(z.trim()) && s.length <= a.length + z.length + 12; });
    return it || null;
  }, list);

  /* type: plain, capitals, with the preposition in front, last variant */
  await page.click('#mode-type');
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 90; i++) {
    const it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    seen.add(it.key);
    const before = it.s.split('___')[0].trim().split(' ').pop();
    const ans = i % 4 === 0 ? it.a[0].toUpperCase() : i % 4 === 1 && before ? before + ' ' + it.a[0] : i % 4 === 2 ? it.a[it.a.length - 1] : it.a[0];
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') { bad++; console.log('rejected', ans, it.s); }
    await t.next(page);
  }
  t.zero(bad, 90, 'type: correct forms accepted (capitals, with preposition, variants)');
  t.ok(seen.size > 35, 'type: many different sentences (' + seen.size + ')');

  /* wrong: його instead of нього → н-rule explained, declension table shown */
  let it = null;
  for (let i = 0; i < 80; i++) {
    it = await item('ITEMS');
    if (it && it.a[0] === 'нього') break;
    await page.fill('#answer-input', it ? it.a[0] : 'x'); await page.click('#check-btn'); await t.next(page); it = null;
  }
  if (t.ok(it, 'type: a sentence with нього came up')) {
    await page.fill('#answer-input', 'його'); await page.click('#check-btn');
    t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: його instead of нього rejected');
    const fb = await t.fb(page);
    t.ok(fb.includes('н-Form'), 'type: feedback explains the н-form');
    t.eq(await page.locator('#feedback .decl tr').count(), 6, 'type: declension table with six cases');
    t.ok((await page.textContent('#feedback .decl tr.on')).includes('нього'), 'type: current case highlighted');
    await t.shot(page, 'type-wrong');
    await t.next(page);
  }
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).startsWith('Gesucht: '), 'type: hint names the wanted case');

  /* choose: four forms of the same pronoun; the twin with/without н- is among them */
  await page.click('#mode-choice');
  bad = 0; let twins = 0, twinTasks = 0;
  for (let i = 0; i < 40; i++) {
    it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    const opts = await page.evaluate(() => [...document.querySelectorAll('#opts .opt')].map(o => o.dataset.v));
    const twin = await page.evaluate(([p, c, a]) => { const x = window.__pronouns.PRON.find(q => q.base === p); return [x.forms[c], x.afterPreposition[c]].filter(f => f && f !== a)[0] || null; }, [it.p, it.c, it.a[0]]);
    if (twin) { twinTasks++; if (opts.includes(twin)) twins++; }
    if (opts.length !== 4 || new Set(opts).size !== 4 || !opts.includes(it.a[0])) bad++;
    await page.click(`#opts [data-v="${it.a[0]}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'choose: four different options, right one accepted');
  t.eq(twins, twinTasks, 'choose: the form with/without н- is always offered');

  /* find the case: five options, keys */
  await page.click('#mode-case');
  t.eq(await page.locator('#opts .opt').count(), 5, 'case: five case options');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    const idx = ['gen', 'dat', 'acc', 'ins', 'loc'].indexOf(it.c);
    if (i % 2) await page.click(`#opts [data-v="${it.c}"]`); else { await page.click('#card .card-head'); await page.keyboard.press(String(idx + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'case: right case accepted (click and keys 1–5)');
  it = await item('ITEMS');
  await page.click(`#opts [data-v="${it.c === 'dat' ? 'gen' : 'dat'}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'case: wrong case rejected');
  await t.next(page);

  /* find the pronoun: eight options; його/ним/ньому count for він and воно; translation only after answering */
  await page.click('#mode-rev');
  t.eq(await page.locator('#opts .opt').count(), 8, 'rev: eight pronoun options');
  t.eq((await page.textContent('#translation')).trim(), '', 'rev: translation hidden before the answer');
  bad = 0; let amb = 0;
  for (let i = 0; i < 40; i++) {
    it = await item('REV'); if (!it) { bad++; await t.next(page); continue; }
    const ok = await page.evaluate(([f, c]) => window.__pronouns.basesFor(f, c), [it.a[0], it.c]);
    if (ok.length > 1) amb++;
    await page.click(`#opts [data-v="${ok[ok.length - 1]}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'rev: right pronoun accepted (also the second of він/воно)');
  t.ok(amb > 0, 'rev: ambiguous forms came up (' + amb + ')');
  await t.shot(page, 'rev');

  /* case chips: only dative */
  await page.click('#mode-type');
  for (const c of ['gen', 'acc', 'ins', 'loc']) await page.click('#chip-' + c);
  const cs = new Set();
  for (let i = 0; i < 12; i++) { it = await item('ITEMS'); cs.add(it && it.c); await page.fill('#answer-input', it ? it.a[0] : 'x'); await page.click('#check-btn'); await t.next(page); }
  t.eq([...cs], ['dat'], 'chips: only dative selected → only dative sentences');

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Personal Pronoun Trainer', 'English title');
  await page.click('#tab-rules');
  t.ok(await page.locator('.rules:not([hidden]) h2').count() >= 5, 'rules in English');

  await t.linkedFromIndex('Personalpronomen-Trainer', REL);
};
