/* Present tense trainer: type / choice / conjugation group / rev, verb list search, rules. */
const REL = 'grammar/present/present-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const typeItem = () => page.evaluate(() => {
    const P = window.__present, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ');
    const inf = document.getElementById('base-word').textContent;
    const it = P.ITEMS.find(i => { const [a, z] = i.s.split('___'); return i.v.inf === inf && s.startsWith(a) && s.endsWith(z); });
    return it ? { alts: P.formsOf(it.v, it.p), key: it.key } : null;
  });

  await page.click('[data-mode=type]');
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 90; i++) {
    const it = await typeItem(); if (!it) { bad++; await t.next(page); continue; }
    seen.add(it.key);
    const ans = i % 2 ? it.alts[it.alts.length - 1] : it.alts[0].toUpperCase().replace(/’/g, "'");
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 90, 'type: correct forms (incl. variants) accepted'); t.ok(seen.size > 40, 'type: many different tasks (' + seen.size + ')');
  const inf = await page.textContent('#base-word');
  await page.fill('#answer-input', inf); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: infinitive rejected');
  t.ok(await page.locator('#feedback table').count() > 0, 'type: feedback shows the conjugation table');
  await t.shot(page, 'type-wrong');
  await t.next(page);

  await page.click('[data-mode=choice]');
  await page.click('#card .card-head'); await page.keyboard.press('2');
  t.ok(await page.isVisible('#feedback'), 'choice: key 2 answers');
  await t.next(page);

  await page.click('[data-mode=conj]');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    const c = await page.evaluate(() => { const x = window.__present.CONJ.find(x => x.v.inf === document.getElementById('sentence').textContent); return x && x.v.conj; });
    if (!c) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${c}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'conjugation group: right group accepted');

  await page.click('[data-mode=rev]');
  const revItem = () => page.evaluate(() => {
    const s = document.getElementById('sentence').textContent;
    const r = window.__present.REV.find(i => i.s.replace('___', i.v.forms[i.p]) === s);
    return r && { inf: r.v.inf, p: r.p, alt: r.v.altInf };
  });
  let r = await revItem();
  await page.fill('#answer-input', r.inf); await page.click('#check-btn');
  t.ok(!(await page.isVisible('#feedback')), 'rev: person required before checking');
  bad = 0;
  for (let i = 0; i < 60; i++) {
    if (i) { r = await revItem(); if (!r) { bad++; await t.next(page); continue; } await page.fill('#answer-input', r.alt.length && i % 2 ? r.alt[0] : r.inf); }
    await page.click(`#persons [data-p="${r.p}"]`); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 60, 'rev: infinitive + person accepted');
  r = await revItem();
  await page.fill('#answer-input', r.inf); await page.click(`#persons [data-p="${(r.p + 1) % 6}"]`); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'rev: wrong person rejected');

  /* verb list: search by infinitive, by form, by German/English meaning, Latin transliteration */
  await page.click('#tab-verbs');
  const all = await page.locator('.verb-card').count();
  t.ok(all > 40, 'verb list complete (' + all + ')');
  const found = async q => { await page.fill('#verb-search', q); return page.evaluate(() => [...document.querySelectorAll('.verb-card h3')].map(h => h.textContent)); };
  t.ok((await found('роблю')).includes('робити'), 'search by a form finds the verb');
  t.ok((await found('sprechen')).includes('говорити'), 'search by German meaning');
  await page.click('[data-set-lang=en]');
  t.ok((await found('speak')).includes('говорити'), 'search by English meaning');
  await page.fill('#verb-search', '');
  t.eq(await page.locator('.verb-card').count(), all, 'empty search shows all verbs');

  await t.linkedFromIndex('Gegenwart-Trainer', REL);
};
