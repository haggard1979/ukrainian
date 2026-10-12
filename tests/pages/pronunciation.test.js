/* Pronunciation trainer: alphabet, repeat (speech recognition via fake recognizer, self rating without it),
   listen & choose, dictation, errors, language. */
const REL = 'pronunciation/pronunciation-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const q = fn => page.evaluate(fn);

  /* alphabet */
  t.eq(await page.locator('#letters .letter').count(), 33, 'alphabet: 33 letters');
  t.ok(await page.locator('#letters .letter.trap').count() > 5, 'alphabet: look-alike traps marked');
  await page.click('#letter-10');
  t.ok((await page.textContent('#lc-name')).includes('и'), 'alphabet: card shows the letter name');
  t.ok((await q(() => window.__spoken)).length > 0, 'alphabet: clicking a letter speaks the example');
  await t.shot(page, 'alphabet');

  /* repeat with recognition */
  await page.click('#tab-train');
  const word = () => q(() => ({ w: window.__pronunciation.WORDS.find(x => x.st === document.getElementById('word').textContent) }));
  const target = async () => (await word()).w;
  const queue = alts => page.evaluate(a => window.__recog.queue.push(a), alts);

  let w = await target();
  await queue([w.w]); await page.click('#mic-btn');
  await page.waitForSelector('#feedback .verdict');
  t.eq(await t.verdict(page), 'Richtig', 'repeat: exact recognition accepted');
  t.eq(await q(() => window.__recog.last.lang), 'uk-UA', 'repeat: recognition language is uk-UA');
  await t.next(page);

  w = await target();
  await queue(['xyz', w.w.toUpperCase()]); await page.click('#mic-btn');
  await page.waitForSelector('#feedback .verdict');
  t.eq(await t.verdict(page), 'Richtig', 'repeat: matching alternative among several accepted');
  await t.next(page);

  /* wrong → retry up to 3 times, then wrong */
  w = await target();
  const bad = w.w.slice(0, -1) + 'ь';
  await queue([bad]); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.ok((await t.fb(page)).includes('Versuch 1 von 3'), 'repeat: attempt counter shown');
  t.ok(await page.locator('#feedback .cmp').count() > 0, 'repeat: comparison shown');
  await queue([bad]); await page.click('#retry-btn'); await page.waitForSelector('#retry-btn >> text=Nochmal');
  await queue([bad]); await page.click('#retry-btn');
  await page.waitForSelector('#next-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'repeat: third failure ends the task');
  await t.next(page);

  /* skip, errors */
  w = await target();
  await queue({ error: 'not-allowed' }); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.ok((await t.fb(page)).includes('Mikrofon'), 'repeat: permission error explained');
  await page.click('#skip-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'repeat: skip counts as wrong');
  await t.next(page);
  await queue({ error: 'no-speech' }); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.ok((await t.fb(page)).includes('nichts gehört'), 'repeat: no-speech message');
  await page.click('#skip-btn'); await t.next(page);

  /* variants: digits for три / п’ять */
  const hasDigit = await q(() => window.__pronunciation.WORDS.some(x => x.variants.length));
  t.ok(hasDigit, 'data: words with recognition variants exist');
  await t.shot(page, 'repeat');

  /* pairs */
  await page.click('#mode-pairs');
  let ok = 0;
  for (let i = 0; i < 12; i++) {
    const spoken = await q(() => window.__spoken[window.__spoken.length - 1]);
    const right = await page.locator('#opts .opt').evaluateAll(bs => bs.map(b => b.dataset.v));
    t.ok(right.includes(spoken) || spoken === undefined, 'pairs: spoken word is one of the options');
    await page.click(`#opts [data-v="${spoken}"]`);
    if (await t.verdict(page) === 'Richtig') ok++;
    await t.next(page);
  }
  t.ok(ok >= 10, 'pairs: choosing the spoken word is right (' + ok + '/12)');
  await t.shot(page, 'pairs');

  /* dictation */
  await page.click('#mode-dict');
  let wrong = 0;
  for (let i = 0; i < 10; i++) {
    const spoken = await q(() => window.__spoken[window.__spoken.length - 1]);
    await page.fill('#answer-input', i % 2 ? spoken.toUpperCase() : spoken); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') wrong++;
    await t.next(page);
  }
  t.zero(wrong, 10, 'dictation: spoken word typed is accepted');
  await page.fill('#answer-input', 'ццц'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'dictation: wrong word rejected');
  t.ok(await page.locator('#feedback .cmp').count() > 0, 'dictation: comparison shown');
  await t.shot(page, 'dictation');
  await t.next(page);

  /* chips: single topic only, can't deselect the last one */
  await page.click('#mode-speak');
  for (const id of ['vowels', 'iot', 'h', 'rlv', 'sib', 'soft', 'apos']) await page.click('#topic-' + id);
  await page.click('#topic-phrases');
  t.eq(await q(() => JSON.parse(localStorage.getItem('pronunciation.v1')).topics), ['phrases'], 'chips: last topic cannot be deselected');

  /* language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Pronunciation Trainer', 'English title');

  /* no recognition in the browser → self rating */
  const p2 = await t.open(REL, { recog: 'none' });
  await p2.click('#tab-train');
  t.ok(!(await t.visible(p2, '#mic-btn')), 'no recognition: microphone button hidden');
  t.ok(await t.visible(p2, '#self-ok'), 'no recognition: self rating shown');
  await p2.click('#self-ok');
  t.eq(await t.verdict(p2), 'Richtig', 'no recognition: self rating "gelungen" counts');

  await t.linkedFromIndex('Aussprache-Trainer', REL);
};
