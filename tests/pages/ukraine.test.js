/* Map of Ukraine: every city dot lies in its oblast, region buttons, typed answers (incl. на захід hint), oblast taps,
   which city, levels, learn tab, rules credit, keys, language. */
const REL = 'games/ukraine/ukraine-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__ukraine.state())));
  const C = await page.evaluate(() => JSON.parse(JSON.stringify(window.__ukraine.CITIES)));
  const O = await page.evaluate(() => JSON.parse(JSON.stringify(window.__ukraine.OBLASTS)));
  const R = await page.evaluate(() => JSON.parse(JSON.stringify(window.__ukraine.REGIONS)));
  const city = id => C.find(c => c.id === id);
  const obl = id => O.find(o => o.id === id);
  const regs = c => c.regions || obl(c.oblast).regions;
  const where = id => R.find(r => r.id === id).where;
  const centers = C.filter(c => O.some(o => o.center === c.id));

  t.ok(C.length >= 50, 'data: at least 50 cities (' + C.length + ')');
  t.eq(await page.locator('#map .obl').count(), O.length, 'map: one shape per oblast');

  /* every city dot (projection + shift) lies inside the shape of its oblast */
  const outside = await page.evaluate(() => {
    const svg = document.getElementById('map'), out = [];
    window.__ukraine.CITIES.forEach(c => {
      const p = window.__ukraine.xy(c), pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y;
      if (!document.getElementById('map-' + c.oblast).isPointInFill(pt)) out.push(c.id);
    });
    return out;
  });
  t.eq(outside, [], 'map: every city lies in its oblast');

  /* ---- where is …? (default level: regional capitals) ---- */
  let bad = 0; const seen = new Set();
  for (let i = 0; i < 14; i++) {
    const s = await st(), c = city(s.cur); seen.add(s.cur);
    t.ok(s.opts.length === 5, 'region: five buttons');
    const w = where(regs(c)[0]);
    if (i % 2) await page.click(`#opts [data-v="${w}"]`); else await page.keyboard.press(String(s.opts.indexOf(w) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 14, 'region: the main region is right (click and key)');
  t.ok([...seen].every(id => centers.some(c => c.id === id)), 'level centers: only regional capitals');
  let s = await st();
  const wrongW = s.opts.find(o => !regs(city(s.cur)).map(where).includes(o));
  await page.click(`#opts [data-v="${wrongW}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'region: a wrong region is wrong');
  t.ok((await t.fb(page)).includes(city(s.cur).uk + ' – ' + where(regs(city(s.cur))[0]) + ' України'), 'feedback: "<city> – на … України"');
  t.eq(await page.locator('#map .lbls .lbl').count(), 1, 'feedback: the city appears on the map with its name');
  t.ok(await page.locator('#map-' + city(s.cur).oblast + '.hi').count() === 1, 'feedback: the oblast is marked');
  await page.clock.fastForward(300);
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* a borderline case accepts its second region too */
  await page.click('#lvl-all');
  t.eq((await st()).level, 'all', 'level all is chosen');
  let both = 0;
  for (let i = 0; i < 60 && both < 2; i++) {
    s = await st();
    const rs = regs(city(s.cur));
    if (rs.length > 1) {
      await page.click(`#opts [data-v="${where(rs[1])}"]`);
      t.eq(await t.verdict(page), 'Richtig', 'region: the second region of ' + s.cur + ' counts too');
      t.ok((await t.fb(page)).includes('Auch richtig'), 'feedback names both regions');
      both++;
    } else await page.click(`#opts [data-v="${where(rs[0])}"]`);
    await t.next(page);
  }
  t.ok(both === 2, 'borderline cities occur at level all');

  /* ---- typing ---- */
  const parse = (v, id) => page.evaluate(([v, id]) => window.__ukraine.regionFromText(v, id), [v, id]);
  const cases = [['на заході', 'west'], ['Захід', 'west'], ['західна Україна', 'west'], ['на заході України', 'west'], ['у західній Україні', 'west'],
    ['у центрі', 'center'], ['в центрі', 'center'], ['центральна', 'center'], ['на півночі', 'north'], ['на пiвднi', 'south'], ['на сході.', 'east'],
    ['Львів на заході', 'west'], ['на захід', 'whither'], ['у центр', 'whither'], ['на центрі', null], ['в заході', null], ['десь', null]];
  for (const [v, want] of cases) t.eq(await parse(v, 'lviv'), want, 'type: "' + v + '" → ' + want);

  await page.click('#mode-type');
  t.ok(await page.isVisible('#answer-input'), 'type: input visible');
  bad = 0;
  const forms = r => [r.where, r.noun, r.adj + ' Україна'];
  for (let i = 0; i < 9; i++) {
    s = await st();
    const r = R.find(x => x.id === regs(city(s.cur))[0]);
    await page.fill('#answer-input', forms(r)[i % 3]);
    await page.keyboard.press('Enter');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 9, 'type: where-phrases, nouns and adjectives are right');
  s = await st();
  const r0 = R.find(x => x.id === regs(city(s.cur))[0]);
  await page.fill('#answer-input', 'на ' + (r0.id === 'center' ? 'захід' : r0.noun));
  await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Leider falsch', 'type: на + accusative is wrong');
  t.ok((await t.fb(page)).includes('nach Westen'), 'type: hint on на захід (where to)');
  await t.next(page);
  await page.fill('#answer-input', 'na zahodi');
  await page.click('#check-btn');
  t.ok((await t.fb(page)).includes('lateinische'), 'type: Latin letters are pointed out');
  await t.shot(page, 'type');
  await t.next(page);

  /* ---- oblast ---- */
  await page.click('#mode-oblast');
  bad = 0;
  for (let i = 0; i < 10; i++) {
    s = await st();
    t.eq(await page.locator('#map .city').count(), 0, 'oblast: no dot before the answer');
    await page.locator('#map-' + city(s.cur).oblast).dispatchEvent('click');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 10, 'oblast: tapping the right oblast is right');
  s = await st();
  const other = O.find(o => o.id !== city(s.cur).oblast && o.id !== 'kyiv' && o.id !== 'kyiv-city').id;
  await page.locator('#map-' + other).dispatchEvent('click');
  t.eq(await t.verdict(page), 'Leider falsch', 'oblast: a wrong oblast is wrong');
  t.ok((await t.fb(page)).includes(obl(other).uk), 'oblast: feedback names the tapped oblast');
  t.ok(await page.locator('#map-' + other + '.bad').count() === 1 && await page.locator('#map-' + city(s.cur).oblast + '.ok').count() === 1, 'oblast: wrong red, right green');
  await t.shot(page, 'oblast');
  await t.next(page);
  /* Kyiv: the city or the surrounding Kyiv Oblast */
  const kyivOk = await page.evaluate(() => {
    const k = window.__ukraine.CITIES.find(c => c.id === 'kyiv');
    return k.oblast;
  });
  t.eq(kyivOk, 'kyiv-city', 'Kyiv is in the shape of the city of Kyiv');

  /* ---- which city? ---- */
  await page.click('#mode-city');
  bad = 0;
  for (let i = 0; i < 10; i++) {
    s = await st();
    t.ok(s.opts.length === 4 && s.opts.includes(city(s.cur).uk), 'city: four options with the answer');
    const ob = s.opts.map(u => C.find(c => c.uk === u).oblast);
    t.eq(new Set(ob).size, 4, 'city: options from four different oblasts');
    t.eq(await page.locator('#map .city.cur').count(), 1, 'city: one marked dot');
    await page.keyboard.press(String(s.opts.indexOf(city(s.cur).uk) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 10, 'city: the right name is right');
  s = await st();
  await page.click(`#opts [data-v="${s.opts.find(o => o !== city(s.cur).uk)}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'city: a wrong name is wrong');
  await t.shot(page, 'city');
  t.eq((await page.evaluate(() => JSON.parse(localStorage.getItem('ukraine.v1')))).mode, 'city', 'mode is stored');

  /* ---- learn tab ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#learn-map .city').count(), C.length, 'learn: a dot for every city');
  t.eq(await page.locator('#clist li').count(), C.length, 'learn: list of all cities');
  t.eq(await page.locator('#legend li').count(), 5, 'learn: legend with five regions');
  await page.locator('#learn-map-c-lviv .hit').dispatchEvent('click');
  t.ok((await page.textContent('#learn-info')).includes('Львів – на заході України'), 'learn: tapping a city shows its region');
  await page.locator('#learn-map-kharkiv').dispatchEvent('click');
  const info = await page.textContent('#learn-info');
  t.ok(info.includes('Харківська область') && info.includes('Харків'), 'learn: tapping an oblast shows name and centre');
  await page.locator('#learn-info .say').click();
  t.ok(await page.evaluate(() => window.__spoken.includes('Харківська область')), 'learn: the oblast is read aloud');
  await t.shot(page, 'learn');

  /* ---- rules: data rules and map credit ---- */
  await page.click('#tab-rules');
  const rules = await page.textContent('#view-rules');
  t.ok(rules.includes('на півночі') && rules.includes('CC BY 4.0'), 'rules: compass rules and map licence');

  /* ---- English ---- */
  await page.click('#tab-play');
  await page.click('[data-set-lang="en"]');
  t.eq(await page.textContent('#mode-oblast'), 'Oblast', 'English: mode label');
  t.eq(await page.textContent('#lvl-all'), 'All cities', 'English: level label');
  await page.close();
};
