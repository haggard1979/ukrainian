/* Town map quiz: name the marked building, find the building for a word (wrong taps), where/where-to phrases, learn tab, keys, language. */
const REL = 'games/city/city-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__city.state())));
  const P = await page.evaluate(() => JSON.parse(JSON.stringify(window.__city.PLACES)));
  const byId = id => P.find(p => p.id === id);

  t.ok(P.length >= 20, 'data: at least 20 places (' + P.length + ')');
  t.eq(await page.locator('#map .place').count(), P.length, 'map: one building per place');

  /* ---- what is this? ---- */
  let bad = 0;
  for (let i = 0; i < 12; i++) {
    const s = await st(), w = byId(s.cur).word;
    t.ok(i || await page.locator('#map-' + s.cur + '.hi').count() === 1, 'name: the asked building is marked');
    if (i % 2) await page.click(`#opts [data-v="${w}"]`); else await page.keyboard.press(String(s.opts.indexOf(w) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 12, 'name: the right word is right (click and key)');
  let s = await st();
  await page.click(`#opts [data-v="${s.opts.find(o => o !== byId(s.cur).word)}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'name: a wrong word is wrong');
  const fb = await t.fb(page);
  t.ok(fb.includes(byId(s.cur).where) && fb.includes(byId(s.cur).whither), 'feedback shows where and where to');
  await page.clock.fastForward(300);
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* ---- where is …? ---- */
  await page.click('#mode-find');
  bad = 0;
  for (let i = 0; i < 10; i++) { s = await st(); await page.click('#map-' + s.cur); if (await t.verdict(page) !== 'Richtig') bad++; await t.next(page); }
  t.zero(bad, 10, 'find: tapping the right building is right');
  s = await st();
  const other = P.find(p => p.id !== s.cur).id;
  await page.click('#map-' + other);
  t.eq((await st()).answered, false, 'find: a wrong building does not end the task');
  t.ok((await page.textContent('#ask')).includes(byId(other).word), 'find: a wrong tap shows the name of the tapped building');
  await page.click('#map-' + s.cur);
  t.eq(await t.verdict(page), 'Leider falsch', 'find: after a wrong tap the task counts as wrong');
  await t.shot(page, 'find');
  await t.next(page);

  /* ---- where / where to ---- */
  await page.click('#mode-prep');
  bad = 0; const asks = new Set();
  for (let i = 0; i < 14; i++) {
    s = await st(); asks.add(s.ask);
    const want = s.ask === 'where' ? byId(s.cur).where : byId(s.cur).whither;
    t.ok(s.opts.length === 4 && s.opts.includes(want), 'prep: four options with the answer');
    await page.click(`#opts [data-v="${want}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 14, 'prep: the right phrase is right');
  t.eq([...asks].sort(), ['where', 'whither'], 'prep: both questions occur');
  s = await st();
  const wrongPhrase = s.opts.find(o => o !== (s.ask === 'where' ? byId(s.cur).where : byId(s.cur).whither));
  await page.click(`#opts [data-v="${wrongPhrase}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'prep: a wrong phrase is wrong');
  t.ok((await t.fb(page)).length > 60, 'prep: feedback explains the rule');
  await t.shot(page, 'prep');
  t.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('city.v1')))).mode === 'prep', 'mode is stored');

  /* ---- learn tab ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#plist li').count(), P.length, 'learn: list of all places');
  await page.click('#learn-map-rynok');
  t.ok((await page.textContent('#learn-info')).includes('на ринку'), 'learn: tapping a building shows where/where to');
  await page.locator('#learn-info .say').click();
  t.ok(await page.evaluate(() => window.__spoken.includes('ринок')), 'learn: the word is read aloud');
  await t.shot(page, 'learn');

  /* ---- language ---- */
  await page.click('#tab-play');
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Town Map Quiz', 'English title');
  await page.click('#tab-rules');
  t.ok((await page.textContent('#view-rules')).includes('How the town map quiz works'), 'English rules');

  await t.linkedFromIndex('Stadtplan-Quiz', REL);
};
