/* "Who am I?": generated profiles (gender forms), reading questions, gap sentences, picking the described person,
   wrong answers, keys, learn tab, rules, language. */
const REL = 'games/people/people-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__people.state())));
  const C = await page.evaluate(() => JSON.parse(JSON.stringify(window.__people.COUNTRIES)));
  const J = await page.evaluate(() => JSON.parse(JSON.stringify(window.__people.JOBS)));
  const cById = id => C.find(c => c.id === id), jById = id => J.find(j => j.id === id);
  const yearsWord = n => page.evaluate(n => window.__people.yearsWord(n), n);

  t.ok(C.length >= 16 && J.length >= 14, 'data: at least 16 countries and 14 jobs (' + C.length + ', ' + J.length + ')');
  const names = C.flatMap(c => [...c.names.m, ...c.names.f]);
  t.eq(names.length, new Set(names).size, 'data: every first name occurs once');
  t.eq(await Promise.all([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 31, 44, 68].map(yearsWord)),
    ['рік', 'роки', 'роки', 'років', 'років', 'років', 'років', 'рік', 'роки', 'років', 'рік', 'роки', 'років'], 'рік / роки / років');

  /* the profile text uses the forms of the person's gender */
  const genderOk = s => {
    const p = s.person, c = cById(p.c), j = jById(p.job), g = p.g, o = g === 'm' ? 'f' : 'm', x = s.text;
    const intro = p.first ? 'Мене звати ' : g === 'm' ? 'Його звати ' : 'Її звати ';
    const pron = p.first ? 'Я ' : g === 'm' ? 'Він ' : 'Вона ';
    const jobOk = j.study ? x.includes(' ' + j[g] + ', ') : x.includes(j.ins[g] + '.') && !x.includes(j.ins[o] + '.');
    return x.startsWith(intro + p.name + '.') && x.includes(pron + c.from + ', ') && x.includes(', ' + (p.first ? 'я' : g === 'm' ? 'він' : 'вона') + ' ' + c.nat[g] + '.') &&
      !x.includes(' ' + c.nat[o] + '.') && jobOk && x.includes(p.age + ' ' + (p.age % 10 === 1 && p.age % 100 !== 11 ? 'рік' : [2, 3, 4].includes(p.age % 10) && ![12, 13, 14].includes(p.age % 100) ? 'роки' : 'років'));
  };

  /* ---- read the profile ---- */
  let bad = 0, wrongForms = 0, optProbs = 0, qProbs = 0; const kinds = new Set(), firsts = new Set(), genders = new Set();
  for (let i = 0; i < 40; i++) {
    const s = await st(); kinds.add(s.kind); firsts.add(s.person.first); genders.add(s.person.g);
    if (!genderOk(s)) { wrongForms++; if (wrongForms < 3) t.fail('read: wrong form in ' + s.text); }
    if (!(s.opts.length === 4 && new Set(s.opts).size === 4 && s.opts.includes(s.answer))) optProbs++;
    const c = cById(s.person.c), g = s.person.g, j = jById(s.person.job);
    const want = { from: c.from, nat: c.nat[g], lang: c.language.uk, live: cById(s.person.live)['in'], job: j.ins[g], age: s.person.age + ' ' + await yearsWord(s.person.age) }[s.kind];
    if (s.answer !== want || !(g === 'm' ? / (він|його|йому)[ ?]/ : / (вона|її|їй)[ ?]/).test(s.question)) qProbs++;
    if (i === 0) t.ok((await page.textContent('#stage')).includes(s.person.name), 'read: the profile is shown');
    if (i % 2) await page.click(`#opts [data-v="${s.answer}"]`); else await page.keyboard.press(String(s.opts.indexOf(s.answer) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(wrongForms, 40, 'read: profile texts use the right gender forms (він/вона, його/її, nationality, job)');
  t.zero(optProbs, 40, 'read: four different options with the answer');
  t.zero(qProbs, 40, 'read: answer and question pronoun fit the person');
  t.zero(bad, 40, 'read: the right answer is right (click and key)');
  t.ok(kinds.size >= 4, 'read: several question types occur (' + [...kinds] + ')');
  t.eq([...firsts].sort(), [false, true], 'read: first and third person texts occur');
  t.eq([...genders].sort(), ['f', 'm'], 'read: men and women occur');
  let s = await st();
  await page.click(`#opts [data-v="${s.opts.find(o => o !== s.answer)}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'read: a wrong option is wrong');
  let fb = await t.fb(page);
  t.ok(fb.includes(s.answer), 'read: feedback shows the answer');
  t.eq(await page.locator('#opts .opt.right').count(), 1, 'read: the right option is marked');
  await t.shot(page, 'read');
  await page.clock.fastForward(300);
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* ---- fill the gap ---- */
  await page.click('#mode-gap');
  bad = 0; optProbs = 0; qProbs = 0; kinds.clear();
  for (let i = 0; i < 40; i++) {
    s = await st(); kinds.add(s.kind);
    const c = cById(s.person.c), g = s.person.g, o = g === 'm' ? 'f' : 'm', j = jById(s.person.job);
    const want = { from: c.from.replace(/^з /, ''), nat: c.nat[g], lang: c.language.ins, job: j.study ? j[g] : j.ins[g] }[s.kind];
    if (s.answer !== want || !s.sentence.startsWith(g === 'm' ? 'Він ' : 'Вона ') || s.person.first) qProbs++;
    if (!(s.opts.length === 4 && new Set(s.opts).size === 4 && s.opts.includes(s.answer))) optProbs++;
    if (s.kind === 'nat' && !s.opts.includes(c.nat[o])) optProbs++;
    if (s.kind === 'job' && !j.study && !s.opts.includes(j.ins[o])) optProbs++;
    if (i === 0) t.ok((await page.textContent('#stage')).includes(s.person.name), 'gap: the person card is shown');
    await page.click(`#opts [data-v="${s.answer}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    else if (!(await t.fb(page)).includes(s.sentence.replace('___', s.answer))) bad++;
    await t.next(page);
  }
  t.zero(qProbs, 40, 'gap: answer and sentence fit the person (third person, gender)');
  t.zero(optProbs, 40, 'gap: four options with the answer, the other gender form among them');
  t.zero(bad, 40, 'gap: the right form is right and the full sentence is shown');
  t.eq([...kinds].sort(), ['from', 'job', 'lang', 'nat'], 'gap: all gap types occur');
  s = await st();
  await page.keyboard.press(String(s.opts.findIndex(o => o !== s.answer) + 1));
  t.eq(await t.verdict(page), 'Leider falsch', 'gap: a wrong form is wrong (key)');
  t.ok((await t.fb(page)).includes(s.sentence.replace('___', s.answer)), 'gap: feedback shows the right sentence');
  t.eq(await page.locator('.gap.solved').count(), 1, 'gap: the gap is filled after the answer');
  await t.shot(page, 'gap');
  await t.next(page);

  /* ---- who is it? ---- */
  await page.click('#mode-who');
  bad = 0; let cardProbs = 0, spoken = 0;
  for (let i = 0; i < 20; i++) {
    s = await st();
    const P = s.cards[s.target], c = cById(P.c), j = jById(P.job), g = P.g;
    /* exactly one card matches gender, country and job of the description */
    const fits = s.cards.filter(x => x.g === g && x.c === P.c && x.job === P.job).length;
    const descOk = s.desc.startsWith(g === 'm' ? 'Він ' : 'Вона ') && (s.desc.includes(c.nat[g]) || s.desc.includes(c.from)) && s.desc.includes(j.study ? j[g] : j.ins[g]);
    if (s.cards.length !== 4 || fits !== 1 || !descOk || new Set(s.cards.map(x => x.name)).size !== 4) cardProbs++;
    if ((await page.evaluate(() => window.__spoken.slice(-1)[0])) === s.desc) spoken++;
    if (i === 0) t.ok(!(await page.textContent('#stage')).includes(s.desc), 'who: the description is hidden before the answer');
    if (i % 2) await page.click('#pc-' + s.target); else await page.keyboard.press(String(s.target + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(cardProbs, 20, 'who: four people, exactly one fits the description');
  t.eq(spoken, 20, 'who: the description is read aloud');
  t.zero(bad, 20, 'who: the right person is right (click and key)');
  s = await st();
  await page.click('#reveal');
  t.ok((await page.textContent('#stage')).includes(s.desc), 'who: "show text" reveals the description');
  await page.click('#pc-' + ((s.target + 1) % 4));
  t.eq(await t.verdict(page), 'Leider falsch', 'who: another person is wrong');
  t.ok((await t.fb(page)).includes(s.desc), 'who: feedback shows the description');
  t.eq(await page.locator('#people .pcard.right').count(), 1, 'who: the right person is marked');
  await t.shot(page, 'who');
  t.eq((await page.evaluate(() => JSON.parse(localStorage.getItem('people.v1')))).mode, 'who', 'mode is stored');

  /* ---- learn tab ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#clist li').count(), C.length, 'learn: all countries');
  t.eq(await page.locator('#jlist li').count(), J.length, 'learn: all jobs');
  const ua = await page.textContent('#learn-ua');
  t.ok(ua.includes('з України') && ua.includes('українець / українка') && ua.includes('українською'), 'learn: country row with з …, nationality m/f and language');
  t.ok((await page.textContent('#learn-doctor')).includes('лікарем / лікаркою'), 'learn: job row with the instrumental');
  await page.locator('#learn-ua .say').click();
  t.ok(await page.evaluate(() => window.__spoken.slice(-1)[0].includes('українка')), 'learn: the row is read aloud');
  await t.shot(page, 'learn');
  await page.click('#tab-rules');
  const rules = await page.textContent('#view-rules');
  t.ok(rules.includes('Мене звати') && rules.includes('працювати + Instrumental') && rules.includes('з + Genitiv'), 'rules: звати, працювати + instrumental, з + genitive');

  /* ---- no speech: the description is shown at once ---- */
  const p2 = await t.open(REL, { voice: 'noapi' });
  await p2.click('#mode-who');
  const s2 = await p2.evaluate(() => window.__people.state());
  t.ok(s2.revealed && (await p2.textContent('#stage')).includes(s2.desc), 'who without speech: the description is visible');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Who am I? Ukrainian', 'English title');
  t.ok((await page.textContent('#view-rules')).includes('How “Who am I?” works'), 'English rules');
  await page.click('#tab-play');
  t.ok((await t.fb(page)).includes('Not right'), 'English feedback after switching');
  await page.click('#mode-gap');
  t.ok((await page.textContent('#stage')).includes('Country'), 'gap: English card');
  await t.linkedFromIndex('Wer bin ich?', REL);
};
