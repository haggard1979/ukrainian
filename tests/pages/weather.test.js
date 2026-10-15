/* Weather report: градус forms, plausible generated weather, all four modes right/wrong (click and keys), learn tab, language. */
const REL = 'games/weather/weather-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__weather.state())));
  const W = await page.evaluate(() => JSON.parse(JSON.stringify({ C: window.__weather.CITIES, K: window.__weather.CONDS, A: window.__weather.ADVS })));
  const city = id => W.C.find(c => c.id === id), cond = id => W.K.find(c => c.id === id), adv = id => W.A.find(a => a.id === id);

  /* ---- temperature in words ---- */
  const words = await page.evaluate(() => Object.fromEntries([1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 24, 25, 30, 31, 34, 40, 0, -1, -2, -5, -11, -14, -21, -23, -30]
    .map(n => [n, window.__weather.tempWords(n)])));
  const expect = {
    1: 'плюс один градус', 2: 'плюс два градуси', 3: 'плюс три градуси', 4: 'плюс чотири градуси', 5: 'плюс п’ять градусів',
    9: 'плюс дев’ять градусів', 10: 'плюс десять градусів', 11: 'плюс одинадцять градусів', 12: 'плюс дванадцять градусів',
    13: 'плюс тринадцять градусів', 14: 'плюс чотирнадцять градусів', 15: 'плюс п’ятнадцять градусів', 20: 'плюс двадцять градусів',
    21: 'плюс двадцять один градус', 22: 'плюс двадцять два градуси', 24: 'плюс двадцять чотири градуси', 25: 'плюс двадцять п’ять градусів',
    30: 'плюс тридцять градусів', 31: 'плюс тридцять один градус', 34: 'плюс тридцять чотири градуси', 40: 'плюс сорок градусів',
    0: 'нуль градусів', '-1': 'мінус один градус', '-2': 'мінус два градуси', '-5': 'мінус п’ять градусів', '-11': 'мінус одинадцять градусів',
    '-14': 'мінус чотирнадцять градусів', '-21': 'мінус двадцять один градус', '-23': 'мінус двадцять три градуси', '-30': 'мінус тридцять градусів',
  };
  let bad = 0;
  for (const [n, w] of Object.entries(expect)) if (words[n] !== w) { bad++; t.fail('tempWords(' + n + ') = ' + words[n] + ', expected ' + w); }
  t.zero(bad, Object.keys(expect).length, 'temperature in words (1, 2–4, 5+, 11–14, 21, negative, zero)');

  /* ---- generated weather is plausible ---- */
  const gens = await page.evaluate(() => window.__weather.CITIES.flatMap(c => Array.from({ length: 60 }, () => window.__weather.gen(c.id))));
  bad = 0; const conds = new Set(), advs = new Set();
  for (const g of gens) {
    const c = city(g.city), k = cond(g.cond), a = adv(g.adv);
    conds.add(g.cond); advs.add(g.adv);
    if (!(g.t >= c.min && g.t <= c.max && g.t >= k.min && g.t <= k.max && g.t >= a.min && g.t <= a.max)) bad++;
    if (g.cond === 'snow' && g.t > 2) bad++;
    if (g.cond === 'rain' && g.t < 1) bad++;
  }
  t.zero(bad, gens.length, 'generated weather: temperature fits city, condition and adverb (snow ≤ +2, rain ≥ +1)');
  t.eq(conds.size, W.K.length, 'generated weather: every condition occurs');
  t.eq(advs.size, W.A.length, 'generated weather: every adverb occurs');
  t.ok(!gens.some(g => g.city === 'lisbon' && g.cond === 'snow'), 'no snow in Lisbon');
  /* adverb ranges are contiguous */
  t.ok(W.A.every((a, i) => i === 0 || a.min === W.A[i - 1].max + 1), 'adverb ranges are contiguous');

  /* ---- read: report → weather card ---- */
  let s = await st();
  t.eq(s.mode, 'read', 'starts in read mode');
  bad = 0;
  for (let i = 0; i < 14; i++) {
    s = await st();
    const rep = await page.textContent('#task .report');
    if (!rep.includes(city(s.cur.city).in.replace(/^./, x => x.toUpperCase())) || !rep.includes(words[s.cur.t] || '')) bad++;
    if (s.opts.length !== 4 || new Set(s.opts).size !== 4 || !s.opts.includes(s.answer)) bad++;
    if (i % 2) await page.click('#opt-' + s.opts.indexOf(s.answer)); else await page.keyboard.press(String(s.opts.indexOf(s.answer) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 14, 'read: report names the city, the right card is right (click and key)');
  s = await st();
  t.ok(s.opts.filter(o => o.split('|')[0] === s.cur.city).length >= 2, 'read: distractors share the city');
  await page.click('#opt-' + s.opts.findIndex(o => o !== s.answer));
  t.eq(await t.verdict(page), 'Leider falsch', 'read: a wrong card is wrong');
  t.ok((await t.fb(page)).includes('Diese Karte zeigt'), 'read: feedback explains the chosen card');
  t.eq(await page.locator('#opts .opt.right').count(), 1, 'read: the right card is marked');
  await t.shot(page, 'read');
  await page.clock.fastForward(300);
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* ---- describe: weather card → description ---- */
  await page.click('#mode-describe');
  bad = 0; const kinds = new Set();
  for (let i = 0; i < 16; i++) {
    s = await st();
    const c = city(s.cur.city), a = adv(s.cur.adv), k = cond(s.cur.cond);
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    const want = cap(c.in) + ' ' + a.uk + (k.join ? ' ' + k.join : '') + '.' + (k.sentence ? ' ' + k.sentence : '') + ' ' + cap(words[s.cur.t] || await page.evaluate(n => window.__weather.tempWords(n), s.cur.t)) + '.';
    if (s.answer !== want) { bad++; t.fail('describe: expected answer ' + want + ', got ' + s.answer); }
    if (s.opts.length !== 4 || new Set(s.opts).size !== 4) bad++;
    s.kinds.forEach(x => kinds.add(x));
    await page.click('#opt-' + s.opts.indexOf(want));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 16, 'describe: the right description is right, four different options');
  t.ok(['adv', 'cond', 'loc'].every(x => kinds.has(x)) && (kinds.has('num') || kinds.has('deg')), 'describe: distractor kinds vary (' + [...kinds] + ')');
  s = await st();
  await page.keyboard.press(String(s.opts.findIndex(o => o !== s.answer) + 1));
  t.eq(await t.verdict(page), 'Leider falsch', 'describe: a wrong description is wrong (key)');
  const f = await t.fb(page);
  t.ok(/stimmt nicht|passt nicht|falsch|Lokativ/.test(f) && f.includes('Bedeutung'), 'describe: feedback names the mistake');
  await t.shot(page, 'describe');
  await t.next(page);

  /* ---- hear: report read aloud, question ---- */
  await page.click('#mode-hear');
  bad = 0; const qs = new Set();
  for (let i = 0; i < 20; i++) {
    s = await st(); qs.add(s.q);
    if (await page.locator('#task .report').count()) bad++;           /* text hidden */
    await page.click('#play-btn');
    const spoken = await page.evaluate(() => window.__spoken[window.__spoken.length - 1]);
    if (!spoken.includes(await page.evaluate(n => window.__weather.tempWords(n), s.cur.t))) bad++;
    const c = city(s.cur.city), k = cond(s.cur.cond);
    const want = s.q === 'city' ? c.in.replace(/^./, x => x.toUpperCase()) : s.q === 'temp' ? await page.evaluate(n => window.__weather.tempNum(n), s.cur.t)
      : s.q === 'rain' ? (k.id === 'rain' ? 'Так, іде дощ.' : k.id === 'snow' ? 'Ні, іде сніг.' : 'Ні, дощ не йде.') : k.emoji + ' ' + k.uk;
    if (s.answer !== want) { bad++; t.fail('hear: expected ' + want + ', got ' + s.answer + ' (' + s.q + ')'); }
    if (s.q === 'rain' && k.rain === null) bad++;
    await page.click('#opt-' + s.opts.indexOf(want));
    if (await t.verdict(page) !== 'Richtig') bad++;
    if (!(await t.fb(page)).includes('Температура повітря')) bad++;   /* text shown afterwards */
    await t.next(page);
  }
  t.zero(bad, 20, 'hear: text hidden, report spoken, right answer is right, text shown afterwards');
  t.ok(qs.size >= 3, 'hear: several question types (' + [...qs] + ')');
  await page.click('#slow-chip');
  t.eq(await page.evaluate(() => window.__rates[window.__rates.length - 1]), 0.6, 'hear: slow tempo');
  s = await st();
  await page.click('#opt-' + s.opts.findIndex(o => o !== s.answer));
  t.eq(await t.verdict(page), 'Leider falsch', 'hear: a wrong answer is wrong');
  await t.shot(page, 'hear');
  await t.next(page);

  /* ---- weather map ---- */
  await page.click('#mode-map');
  bad = 0;
  for (let i = 0; i < 14; i++) {
    s = await st();
    if (s.map.length !== 6 || await page.locator('#wmap .cell').count() !== 6) bad++;
    const has = w => s.prop.kind === 'cond' ? w.cond === s.prop.id : w.adv === s.prop.id;
    if (s.map.filter(has).length !== 1 || !has(s.map.find(w => w.city === s.answer))) bad++;
    if (i % 2) await page.click('#wmap-' + s.answer); else await page.keyboard.press(String(s.opts.indexOf(s.answer) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 14, 'map: exactly one city has the asked weather and tapping it is right');
  s = await st();
  t.ok(/^Де сьогодні /.test(await page.textContent('#task .ask')), 'map: question „Де сьогодні …?“');
  await page.click('#wmap-' + s.opts.find(o => o !== s.answer));
  t.eq(await t.verdict(page), 'Leider falsch', 'map: another city is wrong');
  t.ok((await t.fb(page)).includes('Deine Wahl'), 'map: feedback describes the tapped city');
  t.eq(await page.locator('#wmap .cell.ok').count(), 1, 'map: the right city is marked');
  await t.shot(page, 'map');
  t.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('weather.v1')))).mode === 'map', 'mode is stored');

  /* ---- progress and retry ---- */
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('weather.v1')));
  t.ok(Object.keys(store.items).some(k => k.startsWith('read:')) && Object.keys(store.items).some(k => k.startsWith('map:')), 'progress stored per task');

  /* ---- learn tab ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#cond-list li').count(), W.K.length, 'learn: all conditions');
  t.eq(await page.locator('#city-list li').count(), W.C.length, 'learn: all cities');
  t.ok((await page.textContent('#city-list')).includes('у Відні'), 'learn: city locatives');
  t.ok((await page.textContent('#view-learn')).includes('взимку'), 'learn: seasons');
  await page.locator('#temp-range').fill('-21');
  t.eq(await page.textContent('#conv-words'), 'мінус двадцять один градус', 'learn: slider converts -21');
  await page.locator('#temp-range').fill('13');
  t.eq(await page.textContent('#conv-words'), 'плюс тринадцять градусів', 'learn: slider converts 13');
  await page.click('#conv-say');
  t.ok(await page.evaluate(() => window.__spoken.includes('плюс тринадцять градусів')), 'learn: the temperature is read aloud');
  await t.shot(page, 'learn');

  await page.click('#tab-rules');
  t.ok((await page.textContent('#view-rules')).includes('градусів'), 'rules explain градус forms');

  /* ---- language ---- */
  await page.click('#tab-play');
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Weather Report', 'English title');
  t.ok((await t.fb(page)).includes('You chose'), 'feedback translated');
  await page.click('#tab-rules');
  t.ok((await page.textContent('#view-rules')).includes('How the weather report works'), 'English rules');
  await t.linkedFromIndex('Wetterbericht', REL);
};
