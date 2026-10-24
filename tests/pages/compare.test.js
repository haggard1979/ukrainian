/* Compare game: the asked form follows the values in the picture and the gender of the subject (checked independently here),
   choice / type (incl. analytic forms) / superlative, explanations of wrong answers, property chips, learn tab, keys, language. */
const REL = 'games/compare/compare-trainer.html';

/* independent reference: -ий → -а / -е / -і */
const END = { m: 'ий', f: 'а', n: 'е', pl: 'і' };
const formOf = (m, g) => m.slice(0, -2) + END[g];

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__compare.state())));
  const DIMS = await page.evaluate(() => JSON.parse(JSON.stringify(window.__compare.DIMS)));
  const dim = id => DIMS.find(d => d.id === id);
  /* the expected answer from the values: subject bigger → "more" comparative, in the subject's gender */
  const expect = s => {
    const d = dim(s.dim), subj = s.objs.find(o => o.id === s.subject);
    if (s.mode === 'super') {
      const vs = s.objs.map(o => o.v), dir = subj.v === Math.max(...vs) ? 'more' : subj.v === Math.min(...vs) ? 'less' : null;
      return dir && 'най' + formOf(d[dir].comp, subj.gender);
    }
    const oth = s.objs.find(o => o.id === s.other);
    return formOf(d[subj.v > oth.v ? 'more' : 'less'].comp, subj.gender);
  };

  t.eq(DIMS.length, 8, 'data: eight properties');

  /* ---- choose ---- */
  let bad = 0, wrongExp = 0; const dims = new Set(), dirs = new Set(), genders = new Set();
  for (let i = 0; i < 24; i++) {
    const s = await st(); dims.add(s.dim); dirs.add(s.dir); genders.add(s.objs.find(o => o.id === s.subject).gender);
    if (expect(s) !== s.answer) wrongExp++;
    t.ok(s.opts.length === 4 && new Set(s.opts).size === 4 && s.opts.includes(s.answer), 'choice: four different options with the answer');
    t.eq(await page.locator('#scene .obj').count(), 2, 'choice: two pictures');
    if (i % 2) await page.click(`#opts [data-v="${s.answer}"]`); else await page.keyboard.press(String(s.opts.indexOf(s.answer) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(wrongExp, 24, 'choice: answer = comparative of the bigger/smaller value in the subject’s gender');
  t.zero(bad, 24, 'choice: the right form is right (click and key)');
  t.ok(dims.size >= 5 && dirs.size === 2 && genders.size >= 2, 'choice: several properties, both directions, several genders');

  let s = await st();
  const d0 = dim(s.dim), g0 = s.objs.find(o => o.id === s.subject).gender;
  const opposite = formOf(d0[s.dir === 'more' ? 'less' : 'more'].comp, g0);
  t.ok(s.opts.includes(opposite), 'choice: the opposite comparative is a distractor');
  await page.click(`#opts [data-v="${opposite}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'choice: the opposite is wrong');
  const fb = await t.fb(page);
  t.ok(fb.includes('Umgekehrt') && fb.includes(s.sentence), 'feedback: explains "other way round" and shows the sentence');
  t.eq(await page.locator('#feedback .form-tbl td').count(), 8, 'feedback: table with comparative and superlative forms');
  t.ok((await page.textContent('#translation')).includes(' als '), 'feedback: German translation');
  await page.clock.fastForward(300);
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* wrong gender is explained */
  for (let i = 0; i < 20; i++) {
    s = await st();
    const g = s.objs.find(o => o.id === s.subject).gender;
    const wg = s.opts.find(o => o !== s.answer && ['m', 'f', 'n', 'pl'].some(x => x !== g && formOf(dim(s.dim)[s.dir].comp, x) === o));
    if (wg) { await page.click(`#opts [data-v="${wg}"]`); t.ok((await t.fb(page)).includes('Achte auf die Endung'), 'feedback: wrong gender is explained'); break; }
    await page.click(`#opts [data-v="${s.answer}"]`); await t.next(page);
  }
  await t.shot(page, 'choice');
  await t.next(page);

  /* ---- type ---- */
  await page.click('#mode-type');
  t.ok(await page.isVisible('#answer-input'), 'type: input visible');
  bad = 0;
  for (let i = 0; i < 10; i++) {
    s = await st();
    const d = dim(s.dim), g = s.objs.find(o => o.id === s.subject).gender;
    const analytic = (s.dir === 'more' ? 'більш ' : 'менш ') + formOf(d.more.pos, g);
    t.ok(s.accepted.includes(analytic), 'type: analytic form accepted (' + analytic + ')');
    await page.fill('#answer-input', i % 3 === 2 ? analytic : i % 3 === 1 ? s.answer.toUpperCase() : s.answer);
    await page.keyboard.press('Enter');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 10, 'type: synthetic, capitalised and analytic forms are right');
  s = await st();
  await page.fill('#answer-input', formOf(dim(s.dim)[s.dir].pos, s.objs.find(o => o.id === s.subject).gender));
  await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Leider falsch', 'type: the basic form is wrong');
  t.ok((await t.fb(page)).includes('Grundform'), 'type: hint that the basic form was typed');
  await t.shot(page, 'type');
  await t.next(page);

  /* ---- superlative ---- */
  await page.click('#mode-super');
  bad = 0; wrongExp = 0;
  for (let i = 0; i < 16; i++) {
    s = await st();
    if (expect(s) !== s.answer) wrongExp++;
    t.eq(await page.locator('#scene .obj').count(), 3, 'super: three pictures');
    t.eq(await page.locator('#scene .obj.target').count(), 1, 'super: one framed picture');
    t.ok(s.sentence.endsWith(' з усіх.'), 'super: sentence with з усіх');
    await page.click(`#opts [data-v="${s.answer}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(wrongExp, 16, 'super: the framed picture is the biggest/smallest and the answer is най- + comparative');
  t.zero(bad, 16, 'super: the right form is right');
  s = await st();
  const compInstead = s.answer.slice(3);
  t.ok(s.opts.includes(compInstead), 'super: the plain comparative is a distractor');
  await page.click(`#opts [data-v="${compInstead}"]`);
  t.ok((await t.fb(page)).includes('Superlativ'), 'super: hint comparative → superlative');
  await t.shot(page, 'super');
  t.eq((await page.evaluate(() => JSON.parse(localStorage.getItem('compare.v1')))).mode, 'super', 'mode is stored');
  await t.next(page);

  /* translation follows the German/English number: die Jeans ist, the jeans are */
  const tr = await page.evaluate(() => {
    const d = window.__compare.DIMS.find(x => x.id === 'price'), j = d.subjects.find(x => x.id === 'jeans');
    return j.be;
  });
  t.eq(tr, { de: 'ist', en: 'are' }, 'data: jeans translate with ist / are');

  /* ---- property chips ---- */
  for (const d of DIMS) if (d.id !== 'price') await page.click('#dim-' + d.id);
  for (let i = 0; i < 4; i++) { t.eq((await st()).dim, 'price', 'chips: only the chosen property'); await page.click(`#opts [data-v="${(await st()).answer}"]`); await t.next(page); }
  await page.click('#dim-price');
  t.eq(await page.getAttribute('#dim-price', 'aria-pressed'), 'true', 'chips: the last property cannot be switched off');
  await page.click('#dim-size');

  /* ---- learn ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#ltbl tr').count(), 1 + DIMS.length * 2, 'learn: one row per adjective');
  t.ok((await page.textContent('#ltbl')).includes('найвищий') && (await page.textContent('#ltbl')).includes('дешевші'), 'learn: comparative and superlative forms');
  await page.locator('#ltbl .say').first().click();
  t.ok(await page.evaluate(() => window.__spoken.some(x => x.includes('більший'))), 'learn: forms are read aloud');

  /* ---- English ---- */
  await page.click('#tab-play');
  await page.click('[data-set-lang="en"]');
  t.eq(await page.textContent('#mode-super'), 'Superlative', 'English: mode label');
  await page.click(`#opts [data-v="${(await st()).answer}"]`);
  t.ok(/ (is|are) the /.test(await page.textContent('#translation')), 'English: translation');
  await page.close();
};
