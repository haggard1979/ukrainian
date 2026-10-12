/* Past tense trainer: type (with gender marker for я/ти) / choice / gender / rev, verb list, rules. */
const REL = 'grammar/past/past-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const typeItem = () => page.evaluate(() => {
    const P = window.__past, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ');
    const inf = document.getElementById('base-word').textContent;
    const it = P.ITEMS.find(i => { const [a, z] = i.s.split('___'); return i.v.inf === inf && s.startsWith(a) && s.endsWith(z); });
    return it ? { alts: P.formsOf(it.v, it.p), who: it.who, key: it.key } : null;
  });

  await page.click('[data-mode=type]');
  let bad = 0, whoItems = 0, whoShown = 0; const seen = new Set();
  for (let i = 0; i < 90; i++) {
    const it = await typeItem(); if (!it) { bad++; await t.next(page); continue; }
    seen.add(it.key);
    if (it.who) { whoItems++; if (await page.evaluate(() => { const w = document.getElementById('who'); return !w.hidden && w.textContent.length > 0; })) whoShown++; }
    await page.fill('#answer-input', i % 2 ? it.alts[it.alts.length - 1] : it.alts[0].toUpperCase()); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 90, 'type: correct forms accepted'); t.ok(seen.size > 40, 'type: many different tasks (' + seen.size + ')');
  t.eq(whoShown, whoItems, 'type: gender marker shown for every я/ти sentence');
  await page.fill('#answer-input', await page.textContent('#base-word')); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: infinitive rejected');
  t.ok(await page.locator('#feedback table').count() > 0, 'type: feedback shows the form table');
  await t.shot(page, 'type-wrong');
  await t.next(page);

  await page.click('[data-mode=choice]');
  await page.click('#card .card-head'); await page.keyboard.press('3');
  t.ok(await page.isVisible('#feedback'), 'choice: key 3 answers');
  await t.next(page);

  await page.click('[data-mode=gen]');
  bad = 0;
  for (let i = 0; i < 50; i++) {
    const g = await page.evaluate(() => { const f = document.getElementById('sentence').textContent; const x = window.__past.GEN.find(x => x.v.forms[x.p] === f); return x ? x.p : null; });
    if (g === null) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${g}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 50, 'gender of a form: right answer accepted');

  await page.click('[data-mode=rev]');
  t.eq((await page.textContent('#translation')).trim(), '', 'rev: translation hidden before the answer');
  const revItem = () => page.evaluate(() => {
    const s = document.getElementById('sentence').textContent;
    const r = window.__past.REV.find(i => i.s.replace('___', i.v.forms[i.p]) === s);
    return r && { inf: r.v.inf, p: r.p };
  });
  bad = 0;
  for (let i = 0; i < 60; i++) {
    const r = await revItem(); if (!r) { bad++; await t.next(page); continue; }
    await page.fill('#answer-input', r.inf); await page.click('#card .card-head'); await page.keyboard.press(String(r.p + 1)); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    if (i === 0) t.ok((await page.textContent('#translation')).trim().length > 0, 'rev: translation shown after the answer');
    await t.next(page);
  }
  t.zero(bad, 60, 'rev: infinitive + gender/number (keys 1–4) accepted');
  const r = await revItem();
  await page.fill('#answer-input', r.inf); await page.click(`#persons [data-p="${(r.p + 1) % 4}"]`); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'rev: wrong gender/number rejected');

  await page.click('#tab-verbs');
  t.ok(await page.locator('.verb-card').count() > 40, 'verb list complete');
  await page.fill('#verb-search', 'несла');
  t.ok((await page.evaluate(() => [...document.querySelectorAll('.verb-card h3')].map(h => h.textContent))).includes('нести'), 'search by a past form');
  await page.click('[data-set-lang=en]'); await page.fill('#verb-search', 'carry');
  t.ok((await page.evaluate(() => [...document.querySelectorAll('.verb-card h3')].map(h => h.textContent))).includes('нести'), 'search by English meaning');

  await t.linkedFromIndex('Vergangenheit-Trainer', REL);
};
