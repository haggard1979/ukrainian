/* Typing trainer: grey → black, wrong = red, finish only when error-free, counters, Esc, Latin hint,
   ЙЦУКЕН simulation via physical keys, Ctrl+Backspace, results, mobile-style input events. */
const REL = 'typing/typing-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { width: 900 });
  const st = () => page.evaluate(() => window.__typing.state());
  await page.click('[data-len="10"]');
  let s = await st();
  t.ok(s.target.length > 0 && s.typed === '', 'a text to type is shown');

  await page.keyboard.type(s.target.slice(0, 3));
  const wrongCh = s.target[3] === 'ж' ? 'з' : 'ж';
  await page.keyboard.type(wrongCh);
  s = await st();
  t.eq([s.typed, s.wrong], [s.target.slice(0, 3) + wrongCh, 1], 'wrong keystroke counted');
  const colors = await page.evaluate(() => {
    const c = sel => { const e = document.querySelector(sel); return e && getComputedStyle(e).color; };
    return { ok: c('#text .c.ok'), bad: c('#text .c.bad'), todo: c('#text .c:not(.ok):not(.bad)') };
  });
  t.ok(colors.ok && colors.bad && colors.todo && new Set(Object.values(colors)).size === 3, 'typed, wrong and pending characters differ in colour');
  t.eq(await page.evaluate(() => document.querySelector('#text .c.bad').textContent), wrongCh, 'wrong character is shown in red');
  await t.shot(page, 'wrong');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(s.target.slice(3));
  await page.waitForTimeout(100);
  s = await st();
  t.eq([s.finished, s.wrong, s.backs], [true, 1, 1], 'finished after correcting; wrong and backspace counted');
  t.ok(s.ms > 0, 'time measured');
  t.ok(await page.isVisible('#done'), 'result panel shown');

  await page.keyboard.press('Escape');
  s = await st();
  t.eq([s.typed, s.finished], ['', false], 'Esc starts a new text');
  await page.keyboard.type('abc');
  t.ok(/lateinische|Latin/i.test(await page.textContent('#typing-hint')), 'Latin letters → keyboard hint');

  /* ЙЦУКЕН simulation: physical keys produce Ukrainian letters */
  await page.click('#opt-sim'); await page.click('[data-src="sent"]');
  s = await st();
  const MAP = { ' ': 'Space' };
  (await page.evaluate(() => window.__typing.LAYOUT)).forEach(r => r.forEach(k => { MAP[k[1]] = k[0]; MAP[k[2]] = 'Shift+' + k[0]; }));
  const missing = [...s.target].filter(ch => !MAP[ch]);
  t.eq(missing, [], 'every character of the sentence is on the simulated keyboard');
  for (const ch of s.target) if (MAP[ch]) await page.keyboard.press(MAP[ch]);
  await page.waitForTimeout(100);
  s = await st();
  t.eq([s.finished, s.typed === s.target, s.wrong], [true, true, 0], 'sentence typed via physical keys');
  t.ok(await page.evaluate(() => !!document.querySelector('#done .meaning')), 'sentence meaning shown after finishing');

  await page.click('#new-btn'); await page.keyboard.press('KeyF'); await page.keyboard.press('KeyF'); await page.keyboard.press('Control+Backspace');
  s = await st();
  t.eq(s.typed, '', 'Ctrl+Backspace deletes the word');

  await page.click('#tab-results');
  t.ok(await page.locator('.hist tr').count() >= 3, 'results: history rows');
  t.ok((await page.textContent('#bests')).trim().length > 0, 'results: best values');
  await page.reload(); await t.ready(page); await page.click('#tab-results');
  t.ok(await page.locator('.hist tr').count() >= 3, 'results stored across reloads');
  await page.click('[data-set-lang=en]');
  t.ok(/Date|Time/.test(await page.evaluate(() => [...document.querySelectorAll('.hist th')].map(e => e.textContent).join(','))), 'results headers in English');

  /* phones send beforeinput events without key events */
  const m = await t.open(REL);
  await m.click('#text');
  const tg = await m.evaluate(() => window.__typing.state().target);
  await m.evaluate(tg => {
    const i = document.getElementById('typing-input');
    const fire = (type, data) => i.dispatchEvent(new InputEvent('beforeinput', { inputType: type, data, cancelable: true, bubbles: true }));
    fire('insertText', 'x'); fire('deleteContentBackward', null); for (const ch of tg) fire('insertText', ch);
  }, tg);
  s = await m.evaluate(() => window.__typing.state());
  t.eq([s.finished, s.wrong, s.backs], [true, 1, 1], 'mobile-style input events');
  await t.shot(m, 'mobile');

  await t.linkedFromIndex('Tipp-Trainer', REL);
};
