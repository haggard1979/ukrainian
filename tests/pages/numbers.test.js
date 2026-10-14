/* Numbers trainer: number → words in every range (incl. variants), words → number, converter, rules. */
const REL = 'grammar/numbers/numbers-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const shown = () => page.evaluate(() => Number(document.getElementById('prompt').textContent.replace(/\s/g, '')));
  const variants = n => page.evaluate(n => window.__numbers.variants(n), n);

  await page.click('[data-mode=toWord]');
  for (const [lv, max] of [['20', 20], ['100', 100], ['1000', 1000], ['1m', 1000000]]) {
    await page.click(`[data-level="${lv}"]`);
    let bad = 0, out = 0;
    for (let i = 0; i < 30; i++) {
      const n = await shown(); if (!(n >= 0 && n <= max)) out++;
      const v = await variants(n);
      await page.fill('#answer-input', i % 2 ? v[v.length - 1] : v[0].toUpperCase().replace(/’/g, i % 4 ? "'" : '´')); await page.click('#check-btn');
      if (await t.verdict(page) !== 'Richtig') bad++;
      await t.next(page);
    }
    t.zero(bad, 30, 'number → words, range ' + lv + ': correct answers accepted');
    t.zero(out, 30, 'number → words, range ' + lv + ': numbers within range');
  }
  /* wrong answer shows the solution and the word comparison */
  const n = await shown(), v = await variants(n);
  await page.fill('#answer-input', v[0].split(' ').slice(1).join(' ') + ' сто'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'wrong words rejected');
  t.ok((await t.fb(page)).includes(v[0]), 'feedback shows the solution');
  t.ok(await page.locator('#feedback del, #feedback .miss, #feedback s').count() > 0, 'feedback marks wrong/missing words');
  await t.shot(page, 'wrong');
  await t.next(page);
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'hint shown');
  await page.click('#key-space');
  t.eq(await page.inputValue('#answer-input'), ' ', 'on-screen space key');

  /* words → number */
  await page.click('[data-level="1000"]'); await page.click('[data-mode=toNum]');
  let bad = 0;
  for (let i = 0; i < 20; i++) {
    const w = await page.textContent('#prompt');
    const num = await page.evaluate(w => { for (let i = 0; i <= 1000; i++) if (window.__numbers.variants(i).includes(w)) return i; return -1; }, w);
    await page.fill('#answer-input', num.toLocaleString('de-DE')); await page.click('#check-btn');
    if (num < 0 || await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 20, 'words → number: correct numbers accepted');

  /* converter */
  await page.click('#tab-conv');
  const conv = async x => { await page.fill('#conv-input', x); return page.evaluate(() => document.getElementById('conv-out').innerText); };
  t.ok((await conv('2024')).includes((await variants(2024))[0]), 'converter: 2024');
  t.ok((await conv('1 001 000')).includes((await variants(1001000))[0]), 'converter: number with spaces');
  t.ok(!(await conv('abc')).includes('тисяч'), 'converter: invalid input gives no words');
  await page.fill('#conv-input', '123456'); await t.shot(page, 'converter');

  await page.click('#tab-rules');
  t.ok(await page.locator('.rules:not([hidden]) h2').count() > 2, 'rules tab has sections');
  /* every page that compares typed answers treats ´ and ′ (typed on some phone keyboards) like the apostrophe ’ */
  const fs = require('fs'), path = require('path'), { allPages, ROOT } = require('../lib');
  const noAcute = allPages().filter(rel => { const src = fs.readFileSync(path.join(ROOT, rel), 'utf8'); return src.includes('ʼ`ʹ‘') && !src.includes('ʼ`ʹ‘´′'); });
  t.eq(noAcute, [], 'all answer comparisons accept ´ and ′ as apostrophe');

  await t.linkedFromIndex('Zahlen-Trainer', REL);
};
