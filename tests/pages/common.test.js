/* Shared behaviour from assets/common.js: theme and language persist across pages, read-aloud with and
   without a Ukrainian voice, and without the Web Speech API. */
const { url } = require('../lib');

module.exports = async t => {
  /* theme chosen on the start page is kept on the trainers; system dark + chosen light works */
  const page = await t.open('index.html', { height: 600 });
  const state = () => page.evaluate(() => ({ theme: document.documentElement.dataset.theme || '', label: document.getElementById('theme-toggle').getAttribute('aria-label') }));
  t.eq(await state(), { theme: '', label: 'Dunkles Design' }, 'index: system theme at start');
  await page.click('#theme-toggle');
  t.eq(await state(), { theme: 'dark', label: 'Helles Design' }, 'index: dark after click');
  await page.click('[data-set-lang=en]');
  t.eq((await state()).label, 'Light mode', 'index: toggle label in English');
  await page.click('text=Locative trainer'); await page.waitForLoadState(); await t.ready(page);
  t.eq(await state(), { theme: 'dark', label: 'Light mode' }, 'locative: theme and language kept');
  await page.click('#theme-toggle');
  await page.goto(page.url().replace(/grammar\/locative\/locative-trainer\.html$/, 'grammar/numbers/numbers-trainer.html')); await t.ready(page);
  t.eq((await state()).theme, 'light', 'numbers: light choice kept');

  const dark = await t.open('grammar/numbers/numbers-trainer.html', { scheme: 'dark' });
  const bg = () => dark.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const sysDark = await bg();
  t.eq(await dark.getAttribute('#theme-toggle', 'aria-label'), 'Helles Design', 'system dark: toggle offers light');
  await dark.click('#theme-toggle');
  t.ok(await bg() !== sysDark, 'system dark: choosing light changes the background');
  await dark.goto(dark.url().replace(/grammar\/numbers\/numbers-trainer\.html$/, 'index.html'));
  t.eq(await dark.evaluate(() => document.documentElement.dataset.theme), 'light', 'system dark: light choice kept on index');

  /* language default from the browser */
  const en = await t.open('index.html', { locale: 'en-GB' });
  t.eq(await en.evaluate(() => document.documentElement.lang), 'en', 'English browser starts in English');

  /* read aloud with a Ukrainian voice */
  const loc = await t.open('grammar/locative/locative-trainer.html');
  const last = p => p.evaluate(() => window.__spoken[window.__spoken.length - 1]);
  await loc.click('#mode-type');
  t.ok(!(await t.visible(loc, '#say-sentence')), 'locative: sentence speaker hidden before the answer');
  await loc.click('#say-word');
  t.eq(await last(loc), await loc.textContent('#base-word'), 'locative: word speaker reads the base word');
  await loc.click('#auto-say');
  t.eq(await loc.getAttribute('#auto-say', 'aria-pressed'), 'true', 'auto-say chip on');
  await loc.fill('#answer-input', 'x'); await loc.click('#check-btn');
  t.ok(!/___/.test(await last(loc) || '___'), 'auto-say reads the completed sentence after answering');
  t.ok(await t.visible(loc, '#say-sentence'), 'locative: sentence speaker visible after the answer');
  t.ok(await t.visible(loc, '#say-note') === false, 'no "voice missing" note when a voice exists');
  await loc.reload(); await t.ready(loc);
  t.eq(await loc.getAttribute('#auto-say', 'aria-pressed'), 'true', 'auto-say setting stored');

  /* no Ukrainian voice: nothing is spoken, the note appears */
  const nv = await t.open('grammar/numbers/numbers-trainer.html', { voice: 'none' });
  await nv.click('[data-mode=toNum]'); await nv.click('#say-prompt');
  t.eq(await nv.evaluate(() => window.__spoken.length), 0, 'no Ukrainian voice: nothing spoken in another voice');
  t.ok(await t.visible(nv, '#say-note'), 'no Ukrainian voice: note shown');

  /* no Web Speech API: speaker buttons disappear */
  const na = await t.open('grammar/locative/locative-trainer.html', { voice: 'noapi' });
  t.ok(await na.evaluate(() => document.documentElement.classList.contains('no-tts')), 'no speech API: <html class="no-tts">');
  t.ok(!(await na.isVisible('#say-word')), 'no speech API: speaker buttons hidden');
  t.ok(!(await na.isVisible('#auto-say')), 'no speech API: auto-say chip hidden');

  /* data cannot be loaded (opened as a file, server down …): a clear message instead of an empty page */
  const ctx = await t.browser.newContext({ locale: 'de-DE' }); t.contexts.push(ctx);
  const fp = await ctx.newPage();
  await fp.route('**/data/*.json', r => r.abort());
  await fp.goto(await url('grammar/genitive/genitive-trainer.html'));
  await fp.waitForFunction(() => document.documentElement.dataset.ready === 'error');
  t.ok(/Webserver/.test(await fp.textContent('#load-error')), 'missing data: message shown');
};
