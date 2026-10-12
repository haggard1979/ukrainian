/* Dates trainer: weekdays, months, dates (with/without year), years – nominative and "when?", learn tables, converter. */
const REL = 'grammar/dates/dates-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  /* expected answers derived from the prompt through window.__dates */
  const expected = () => page.evaluate(() => {
    const D = window.__dates, mode = document.querySelector('#modes [aria-pressed=true]').dataset.mode;
    const p = document.getElementById('prompt').textContent, when = /Коли\?|Wann|When/.test(document.getElementById('task-label').textContent);
    if (mode === 'wd') return D.weekday(D.WD.findIndex(w => w.de === p.replace(/^am /, '')), when);
    if (mode === 'mo') return D.month(D.MO.findIndex(m => m.de === p.replace(/^im /, '')), when);
    if (mode === 'date') { const [d, m, y] = p.split('.'); return D.dateForms(Number(d), Number(m) - 1, y ? Number(y) : null, when); }
    return D.yearForms(Number(p), when);
  });
  for (const mode of ['wd', 'mo', 'date', 'year']) {
    await page.click(`[data-mode=${mode}]`);
    for (const withYear of mode === 'date' ? [false, true] : [false]) {
      if (withYear) await page.click('#opt-year');
      let bad = 0;
      for (let i = 0; i < 20; i++) {
        const v = await expected();
        let ans = v[i % v.length].toUpperCase().replace(/’/g, "'");
        if (mode === 'date' && i % 3 === 0) ans = 'Сьогодні ' + ans;      /* leading "сьогодні" is ignored */
        await page.fill('#answer-input', ans); await page.click('#check-btn');
        if (await t.verdict(page) !== 'Richtig') bad++;
        await t.next(page);
      }
      t.zero(bad, 20, mode + (withYear ? ' with year' : '') + ': correct answers accepted');
    }
  }
  await page.click('[data-mode=year]');
  const v = await expected();
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'hint shown');
  await page.fill('#answer-input', 'тисяча ' + v[0]); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'wrong year rejected');
  t.ok((await t.fb(page)).includes(v[0]), 'feedback shows the solution');
  await t.shot(page, 'year-wrong');

  /* at least one of "nominative" / "when?" stays on */
  await page.click('#opt-nom');
  t.eq(await page.getAttribute('#opt-nom', 'aria-pressed'), 'false', 'nominative can be switched off');
  await page.click('#opt-when');
  t.eq(await page.getAttribute('#opt-when', 'aria-pressed'), 'true', '"when?" stays on when it is the last one');

  await page.click('#tab-learn');
  t.eq(await page.locator('#wd-table tr').count() - 1, 7, 'weekday table: 7 rows');
  t.eq(await page.locator('#mo-table tr').count() - 1, 12, 'month table: 12 rows');

  await page.click('#tab-conv');
  const conv = async q => { await page.fill('#conv-input', q); return page.evaluate(() => document.getElementById('conv-out').innerText); };
  const out = await conv('1991-08-24');
  t.ok(out.includes('двадцять четверте серпня') && out.includes('тисяча дев’ятсот дев’яносто першого року'), 'converter: 24.08.1991');
  t.ok((await conv('2000-02-29')).includes('двадцять дев’яте лютого'), 'converter: leap day');
  await t.shot(page, 'converter');

  await t.linkedFromIndex('Datum-Trainer', REL);
};
