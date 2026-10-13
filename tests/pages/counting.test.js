/* Numbers + nouns trainer: the rule itself (fixed examples), choice / noun / all-in-words modes in every range,
   11–14, numeral gender, wrong answers, converter, topic chips, language. */
const REL = 'grammar/counting/counting-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });

  /* the generator against hand-checked phrases */
  const fixed = [[1, 'гривня', 'одна гривня'], [2, 'гривня', 'дві гривні'], [5, 'гривня', 'п’ять гривень'], [11, 'рік', 'одинадцять років'],
    [21, 'рік', 'двадцять один рік'], [22, 'книга', 'двадцять дві книги'], [1, 'яблуко', 'одне яблуко'], [2, 'яблуко', 'два яблука'],
    [14, 'день', 'чотирнадцять днів'], [101, 'студент', 'сто один студент'], [112, 'день', 'сто дванадцять днів'],
    [1000, 'гривня', 'тисяча гривень'], [1001, 'книга', 'тисяча одна книга'], [2002, 'гривня', 'дві тисячі дві гривні'],
    [21000, 'гривня', 'двадцять одна тисяча гривень'], [5, 'людина', 'п’ять людей'], [3, 'людина', 'три людини'], [7, 'яйце', 'сім яєць']];
  const got = await page.evaluate(f => f.map(([n, s]) => { const C = window.__counting; return C.phrase(n, C.NOUNS.find(x => x.f.sg === s)); }), fixed);
  fixed.forEach(([n, s, want], i) => t.eq(got[i], want, 'phrase ' + n + ' + ' + s));

  const task = () => page.evaluate(() => {
    const C = window.__counting, n = Number(document.getElementById('num').textContent.replace(/\s/g, ''));
    const x = C.NOUNS.find(y => y.f.sg === document.getElementById('noun').textContent);
    return { n, sg: x.f.sg, form: x.f[C.classify(n)], cls: C.classify(n), phrases: C.phrases(n, x) };
  });

  /* choice in every range, keys and clicks; numbers stay in range and all classes come up */
  await page.click('#mode-choice');
  for (const lv of ['10', '100', '1000']) {
    await page.click(`[data-level="${lv}"]`);
    let bad = 0, out = 0; const cls = new Set(); let teen = 0;
    /* the 11–14 tasks are only preferred, not guaranteed: keep going until one has come up */
    for (let i = 0; i < 40 || (lv !== '10' && teen === 0 && i < 200); i++) {
      const x = await task(); cls.add(x.cls); if (x.n < 1 || x.n > Number(lv)) out++;
      const r = x.n % 100; if (r >= 11 && r <= 14) teen++;
      if (i % 2) await page.click(`#opts [data-v="${x.form}"]`);
      else { await page.click('#card .card-head'); await page.keyboard.press(String(['sg', 'pl', 'gpl'].indexOf(x.cls) + 1)); }
      if (await t.verdict(page) !== 'Richtig') bad++;
      await t.next(page);
    }
    t.zero(bad, 40, 'choice ' + lv + ': right form accepted');
    t.zero(out, 40, 'choice ' + lv + ': numbers within range');
    t.eq([...cls].sort(), ['gpl', 'pl', 'sg'], 'choice ' + lv + ': all three forms come up');
    if (lv !== '10') t.ok(teen > 0, 'choice ' + lv + ': 11–14 come up (' + teen + ')');
  }
  let x = await task();
  await page.click(`#opts [data-v="${x.cls === 'sg' ? (await page.evaluate(() => document.querySelector('#opt-1').dataset.v)) : (await page.evaluate(() => document.querySelector('#opt-0').dataset.v))}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'choice: wrong form rejected');
  const fb = await t.fb(page);
  t.ok(fb.includes(x.phrases[0]) && /Endet auf|11–14/.test(fb), 'choice: feedback shows the phrase and the rule');
  t.eq(await page.locator('#feedback .forms3 .on').count(), 1, 'choice: the matching form 1 / 2 / 5 is marked');
  await t.shot(page, 'choice-wrong');
  await t.next(page);

  /* noun typing: the noun alone, in capitals, or the whole phrase */
  await page.click('#mode-type');
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    x = await task();
    const ans = i % 3 === 0 ? x.form : i % 3 === 1 ? x.form.toUpperCase().replace(/’/g, "'") : x.phrases[0];
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'type: noun form (alone, capitals, whole phrase) accepted');
  x = await task();
  await page.fill('#answer-input', x.sg === x.form ? x.sg + 'и' : x.sg); await page.click('#check-btn');
  if (x.sg !== x.form) t.eq(await t.verdict(page), 'Noch nicht richtig', 'type: base form rejected when another form is needed');
  await t.next(page);

  /* all in words, incl. "одна тисяча" for 1000 */
  await page.click('#mode-full');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    x = await task();
    await page.fill('#answer-input', x.phrases[i % x.phrases.length]); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'full: whole phrase accepted');
  /* wrong number gender with the right noun → hint on the number word */
  for (let i = 0; i < 60; i++) {
    x = await task();
    if (/(^| )(одна|дві|одне)( |$)/.test(x.phrases[0])) break;
    await page.fill('#answer-input', x.phrases[0]); await page.click('#check-btn'); await t.next(page);
  }
  const wrongNum = x.phrases[0].replace(/(^| )одна( |$)/, '$1один$2').replace(/(^| )дві( |$)/, '$1два$2').replace(/(^| )одне( |$)/, '$1один$2');
  await page.fill('#answer-input', wrongNum); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'full: wrong number gender rejected (' + wrongNum + ')');
  t.ok((await t.fb(page)).includes('Zahlwort'), 'full: feedback points to the number word');
  await t.next(page);

  /* topic chips: only money */
  await page.click('#mode-choice');
  for (const tp of ['people', 'time', 'things', 'measures']) await page.click('#topic-' + tp);
  const sgs = new Set();
  for (let i = 0; i < 15; i++) { x = await task(); sgs.add(x.sg); await page.click(`#opts [data-v="${x.form}"]`); await t.next(page); }
  t.ok([...sgs].every(s => ['гривня', 'копійка', 'долар'].includes(s)), 'chips: only money nouns (' + [...sgs] + ')');

  /* converter */
  await page.click('#tab-conv');
  const conv = async (n, s) => {
    await page.selectOption('#conv-noun', { label: await page.evaluate(s => [...document.querySelectorAll('#conv-noun option')].find(o => o.textContent.startsWith(s + ' ')).textContent, s) });
    await page.fill('#conv-input', String(n));
    return page.evaluate(() => document.getElementById('conv-out').innerText);
  };
  t.ok((await conv(22, 'гривня')).includes('двадцять дві гривні'), 'converter: 22 гривня');
  t.ok((await conv('1 001', 'книга')).includes('тисяча одна книга'), 'converter: number with a space');
  t.ok((await conv(0, 'книга')).includes('1 bis 999 999'), 'converter: 0 rejected with a message');
  await page.click('.examples .chip >> nth=2');
  t.ok((await page.evaluate(() => document.getElementById('conv-out').innerText)).includes('п’ять людей'), 'converter: example chip');
  await t.shot(page, 'converter');

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Numbers and Nouns Trainer', 'English title');
  t.ok((await page.evaluate(() => document.getElementById('conv-out').innerText)).includes('genitive plural'), 'converter explanation in English');

  await t.linkedFromIndex('Zahl-und-Nomen-Trainer', REL);
};
