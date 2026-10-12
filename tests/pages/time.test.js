/* Clock time trainer: colloquial / official / "о котрій?" in all levels, words → time, converter, clickable dial. */
const REL = 'grammar/time/time-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const shown = () => page.evaluate(() => document.getElementById('digital').textContent.split(':').map(Number));

  for (const mode of ['col', 'off', 'at']) {
    await page.click(`[data-mode=${mode}]`);
    for (const lv of ['hour', 'quarter', 'five', 'any']) {
      await page.click('#lv-' + lv);
      let bad = 0;
      for (let i = 0; i < 12; i++) {
        const [H, m] = await shown();
        const v = await page.evaluate(([mode, H, m]) => { const G = window.__time; return (mode === 'col' ? G.colloquial : mode === 'off' ? G.official : G.atTime)(H, m); }, [mode, H, m]);
        const ans = v[i % v.length] + (i % 3 === 0 && mode === 'col' ? (H >= 18 ? ' вечора' : H >= 12 ? ' дня' : H >= 4 ? ' ранку' : ' ночі') : '');
        await page.fill('#answer-input', ans.toUpperCase().replace(/’/g, "'")); await page.click('#check-btn');
        if (await t.verdict(page) !== 'Richtig') bad++;
        await t.next(page);
      }
      t.zero(bad, 12, mode + '/' + lv + ': correct answers (incl. variants) accepted');
    }
  }
  await page.click('[data-mode=col]'); await page.click('#lv-any');
  await page.click('#hint-btn');
  t.ok((await page.textContent('#hint')).length > 0, 'hint shown');
  const [H, m] = await shown();
  const right = (await page.evaluate(([H, m]) => window.__time.colloquial(H, m), [H, m]))[0];
  await page.fill('#answer-input', right === 'десять на третю' ? 'десять на четверту' : 'десять на третю'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'wrong time rejected');
  t.ok((await t.fb(page)).includes(right), 'feedback shows the solution');
  await t.shot(page, 'wrong');
  await t.next(page);

  /* words → time; 12-hour and 24-hour answers both accepted */
  await page.click('[data-mode=rev]');
  let bad = 0;
  for (let i = 0; i < 20; i++) {
    const ph = await page.textContent('#phrase');
    const hit = await page.evaluate(ph => { for (let H = 0; H < 24; H++) for (let m = 0; m < 60; m++) if (window.__time.colloquial(H, m)[0] === ph) return [H, m]; return null; }, ph);
    if (!hit) { bad++; await t.next(page); continue; }
    const h = i % 2 ? hit[0] : (hit[0] + 12) % 24;
    await page.fill('#answer-input', h + ':' + String(hit[1]).padStart(2, '0')); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 20, 'words → time: correct time accepted');
  await page.fill('#answer-input', '25:99'); await page.click('#check-btn');
  t.ok(!(await page.isVisible('#feedback .verdict')) || (await t.verdict(page)) !== 'Richtig', 'invalid time not accepted');

  /* converter */
  await page.click('#tab-conv');
  const conv = async q => { await page.fill('#conv-input', q); return page.evaluate(() => document.getElementById('conv-out').innerText); };
  t.ok((await conv('14:30')).includes('пів на третю'), 'converter: 14:30 → пів на третю');
  t.ok((await conv('11:00')).includes('об одинадцятій'), 'converter: об before a vowel');
  t.ok((await conv('7.45')).includes('за п’ятнадцять восьма'), 'converter: 7.45 accepted');

  await dial(t);
  await t.linkedFromIndex('Uhrzeiten-Trainer', REL);
};

/* the dial in the converter: tap a number, drag the hands, buttons, touch (own page with real timers) */
async function dial(t) {
  const page = await t.open(REL, { touch: true });
  await page.click('#tab-conv');
  const dig = () => page.textContent('#dial-digital');
  const pos = async (r, deg) => {        /* bounding box fetched fresh – it changes after scrolling */
    const b = await page.locator('#dial').boundingBox(), sc = b.width / 240, a = deg * Math.PI / 180;
    return { x: b.x + (120 + r * Math.sin(a)) * sc, y: b.y + (120 - r * Math.cos(a)) * sc };
  };
  await page.fill('#conv-input', '10:10');
  let q = await pos(70, 90); await page.mouse.click(q.x, q.y);
  t.eq(await dig(), '3:10', 'dial: tapping 3 sets the hour');
  q = await pos(95, 60); await page.mouse.move(q.x, q.y); await page.mouse.down();
  for (const d of [90, 135, 180]) { const r = await pos(95, d); await page.mouse.move(r.x, r.y); }
  await page.mouse.up();
  t.eq(await dig(), '3:30', 'dial: dragging the minute hand');
  q = await pos(95, 180); await page.mouse.move(q.x, q.y); await page.mouse.down();
  for (const d of [240, 300, 330, 355, 20, 60]) { const r = await pos(95, d); await page.mouse.move(r.x, r.y); }
  await page.mouse.up();
  t.eq(await dig(), '4:10', 'dial: minute hand past 12 advances the hour');
  await page.click('#dial-half [data-pm="1"]');
  t.eq(await dig(), '16:10', 'dial: p.m.');
  await page.click('#dial-step [data-step="1"]'); await page.click('[data-dm="1"]');
  t.eq(await dig(), '16:11', 'dial: +1 minute');
  await page.click('[data-dh="1"]');
  t.eq(await dig(), '17:11', 'dial: +1 hour');
  t.ok((await page.inputValue('#conv-input')).startsWith('17:11'), 'dial updates the input field');
  await page.fill('#conv-input', '7:45');
  t.eq(await dig(), '7:45', 'typing a time moves the dial');
  t.ok((await page.getAttribute('#dial', 'aria-valuetext')).length > 0, 'dial has an accessible value');
  q = await pos(70, 180); await page.touchscreen.tap(q.x, q.y);
  t.eq((await dig()).split(':')[0], '6', 'dial: touch tap on 6');
  await t.shot(page, 'dial');
}
