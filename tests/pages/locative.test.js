/* Locative trainer: all four modes with correct answers, wrong answers, gender check in "rev", hints, language. */
const REL = 'grammar/locative/locative-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* the task on screen, identified via window.__lokativ (sentence alone is ambiguous → also base word) */
  const item = list => page.evaluate(list => {
    const L = window.__lokativ, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ');
    const nom = (document.getElementById('base-word') || {}).textContent;
    if (list === 'REV') return L.REV.find(i => i.s.replace('___', i.a[0]) === s) || null;
    return L[list].find(i => { const [a, z] = i.s.split('___'); return (list !== 'ITEMS' || i.nom === nom) && s.startsWith(a) && s.endsWith(z); }) || null;
  }, list);

  /* type: answers in capitals, with ' instead of ’, and every listed variant */
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

  /* wrong answer: solution and rule shown */
  let it = await item('ITEMS');
  await page.fill('#answer-input', it.nom + 'xx'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: wrong answer rejected');
  t.ok((await t.fb(page)).includes(it.a[0]), 'type: feedback shows the solution');
  await t.shot(page, 'type-wrong');
  await page.click('[data-set-lang=en]');
  t.ok(/Not quite|Not right|Wrong/.test(await t.verdict(page)), 'open feedback re-rendered in English');
  await page.click('[data-set-lang=de]');
  await t.next(page);
  /* Latin letters: hint in the feedback */
  await page.fill('#answer-input', 'shkoli'); await page.click('#check-btn');
  t.ok(/lateinische/.test(await t.fb(page)), 'type: Latin input → keyboard hint');
  await t.next(page);
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'type: hint shown');

  /* choice: the right option, keys 1–4 */
  await page.click('#mode-choice');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    it = await item('ITEMS'); if (!it) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${it.a[0]}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'choice: right option accepted');
  t.eq(await page.locator('#opts .opt').count(), 4, 'choice: four options');
  await page.click('#card .card-head'); await page.keyboard.press('1');
  t.ok(await page.isVisible('#feedback'), 'choice: key 1 answers');
  await t.next(page);

  /* prep: в/у or на */
  await page.click('#mode-prep');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    it = await item('PREPS'); if (!it) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${it.p === 'на' ? 'на' : 'vu'}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'prep: right preposition accepted');
  it = await item('PREPS');
  await page.click(`#opts [data-v="${it.p === 'на' ? 'vu' : 'на'}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'prep: wrong preposition rejected');
  await t.next(page);

  /* rev: base form + gender, own word list */
  await page.click('#mode-rev');
  t.ok(!(await page.isVisible('#base')), 'rev: base word hidden');
  it = await item('REV');
  await page.fill('#answer-input', it.nom); await page.click('#check-btn');
  t.ok(!(await page.isVisible('#feedback')) && (await page.textContent('#hint')).length > 0, 'rev: gender required before checking');
  bad = 0; const revSeen = new Set();
  for (let i = 0; i < 80; i++) {
    if (i) { it = await item('REV'); if (!it) { bad++; await t.next(page); continue; } await page.fill('#answer-input', it.nom); }
    revSeen.add(it.nom);
    await page.click(`#genders [data-g="${it.g}"]`); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 80, 'rev: base form + gender accepted'); t.ok(revSeen.size > 30, 'rev: many different words (' + revSeen.size + ')');
  t.eq(await page.evaluate(() => { const L = window.__lokativ, a = new Set(L.ITEMS.map(i => i.nom)); return L.REV.filter(r => a.has(r.nom)).map(r => r.nom); }), [], 'rev: own word list');
  it = await item('REV');
  await page.fill('#answer-input', it.nom); await page.click(`#genders [data-g="${it.g === 'm' ? 'f' : 'm'}"]`); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'rev: wrong gender rejected');
  await t.next(page);
  it = await item('REV');
  await page.fill('#answer-input', it.a[0]); await page.click(`#genders [data-g="${it.g}"]`); await page.click('#check-btn');
  if (it.a[0] !== it.nom) t.eq(await t.verdict(page), 'Noch nicht richtig', 'rev: locative form instead of base form rejected');
  await t.shot(page, 'rev-wrong');

  /* category chips: only feminine */
  await t.next(page);
  for (const c of ['m', 'n', 'pl', 'adj', 'pron']) await page.click('#chip-' + c);
  const cats = new Set();
  for (let i = 0; i < 10; i++) { cats.add((await item('REV')).cat); await page.click('#mode-type'); await page.click('#mode-rev'); }
  t.eq([...cats], ['f'], 'only "Feminina" selected → only feminine words');

  /* rules tab in both languages */
  await page.click('#tab-rules');
  t.ok(await page.locator('.rules:not([hidden]) h2').count() > 3, 'rules tab has sections');
  await page.click('[data-set-lang=en]');
  t.ok(/Locative|locative/.test(await page.locator('.rules:not([hidden])').first().innerText()), 'rules in English');

  await t.linkedFromIndex('Lokativ-Trainer', REL);
};
