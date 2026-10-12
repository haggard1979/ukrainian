/* Time expressions ("Коли?"): learn list + timelines, choice (distractors from the same topic), type, cards. */
const REL = 'grammar/when/when-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  t.ok(await page.locator('#view-learn h2').count() >= 5, 'learn: one section per topic');
  t.eq(await page.locator('.tl').count(), 3, 'learn: three timelines');
  await page.click('.tl-cell.now');
  t.eq(await page.evaluate(() => window.__spoken[window.__spoken.length - 1]), 'сьогодні', 'timeline: tapping "today" reads it');

  await page.click('#tab-train');
  const P = await page.evaluate(() => window.__when.PHRASES);
  const cur = async () => { const pr = await page.textContent('#prompt'); return P.find(p => p.de === pr); };

  await page.click('[data-mode=choice]');
  let bad = 0, same = 0, n = 0;
  for (let i = 0; i < 40; i++) {
    const p = await cur(); if (!p) { bad++; await t.next(page); continue; }
    const opts = await page.evaluate(() => [...document.querySelectorAll('#opts .opt')].map(o => o.dataset.v));
    opts.filter(o => o !== p.uk).forEach(o => { n++; if (P.find(x => x.uk === o).topic === p.topic) same++; });
    await page.click(`#opts [data-v="${p.uk}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'choice: right option accepted');
  t.ok(same / n > 0.8, 'choice: distractors mostly from the same topic (' + same + '/' + n + ')');

  await page.click('[data-mode=type]');
  bad = 0;
  for (let i = 0; i < 60; i++) {
    const p = await cur(); if (!p) { bad++; await t.next(page); continue; }
    const ans = (p.alt.length && i % 2 ? p.alt[0] : p.uk).toLowerCase().replace(/[.!?,]/g, '').replace(/’/g, "'");
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 60, 'type: correct answers (incl. variants) accepted');

  await page.click('[data-mode=card]');
  await page.click('#card .card-head'); await page.keyboard.press(' ');
  t.ok(await page.isVisible('#reveal'), 'card: space reveals the back');
  await t.shot(page, 'card');

  await page.click('[data-set-lang=en]'); await page.click('#tab-learn');
  t.ok(/yesterday|today|tomorrow/i.test(await page.locator('.tl').first().innerText()), 'timeline labels in English');
  await t.linkedFromIndex('Zeitangaben-Trainer', REL);
};
