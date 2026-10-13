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
  const bad = w.w + 'щ';   // never equal to the word (words may already end in ь)
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

  /* iOS: dictation switched off is reported as service-not-allowed and explained separately */
  w = await target();
  await queue({ error: 'service-not-allowed' }); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.ok(/Diktierfunktion/.test(await t.fb(page)) && (await t.fb(page)).includes('service-not-allowed'), 'repeat: dictation off (iOS) explained with the error code');
  /* started from the Home Screen (standalone web app): the real cause is named */
  await page.evaluate(() => Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }));
  await queue({ error: 'service-not-allowed' }); await page.click('#retry-btn');
  await page.waitForFunction(() => /Home-Bildschirm/.test(document.getElementById('feedback').textContent));
  t.ok((await t.fb(page)).includes('Safari'), 'standalone web app: the error says to open the page in Safari');
  await page.evaluate(() => Object.defineProperty(navigator, 'standalone', { value: false, configurable: true }));
  await queue({ error: 'service-not-allowed' }); await page.click('#retry-btn');
  await page.waitForFunction(() => /Siri/.test(document.getElementById('feedback').textContent));
  /* diagnosis: bare configuration, one line per language */
  await queue(['hallo']); await page.click('#diag-de');
  await page.waitForFunction(() => /de-DE: .*funktioniert/.test(document.getElementById('diag-out').textContent));
  t.eq(await page.evaluate(() => window.__recog.last), { lang: 'de-DE', max: 1 }, 'diagnosis: bare configuration with the chosen language');
  await queue({ error: 'service-not-allowed' }); await page.click('#diag-uk');
  await page.waitForFunction(() => /uk-UA: Fehler service-not-allowed/.test(document.getElementById('diag-out').textContent));
  t.ok((await page.textContent('#diag-out')).includes('de-DE'), 'diagnosis: results of several languages stay visible');
  await page.click('#skip-btn'); await t.next(page);

  /* the voice is still speaking: recognition starts only after the audio session had time to settle */
  await page.evaluate(() => { speechSynthesis.speaking = true; });
  const before = await page.evaluate(() => window.__recog.starts);
  await queue(['x']); await page.click('#mic-btn');
  t.eq(await page.evaluate(() => window.__recog.starts), before, 'repeat: recognition waits while the voice is speaking');
  await page.clock.fastForward(500);
  t.eq(await page.evaluate(() => window.__recog.starts), before + 1, 'repeat: recognition starts once the voice has stopped');
  await page.evaluate(() => { speechSynthesis.speaking = false; });
  await page.waitForSelector('#retry-btn');
  await page.click('#skip-btn'); await t.next(page);

  /* iOS: only the language is set (no maxAlternatives etc.) */
  await page.evaluate(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Safari', configurable: true }));
  await queue(['x']); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.eq(await page.evaluate(() => window.__recog.last), { lang: 'uk-UA', max: 1 }, 'repeat: on iOS only the language is set');
  await page.click('#skip-btn'); await t.next(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (X11; Linux x86_64) Chrome', configurable: true }));

  /* keyboard dictation: the system keyboard fills a text field, the text is judged like a recognition result */
  const dword = async () => (await target());
  if (!(await t.visible(page, '#dict-form'))) await page.click('#dict-toggle');
  t.ok(await t.visible(page, '#dict-form'), 'dictation: toggle opens the field');
  w = await dword();
  await page.fill('#dict-input', w.w.charAt(0).toUpperCase() + w.w.slice(1) + '.');
  await page.click('#dict-check');
  t.eq(await t.verdict(page), 'Richtig', 'dictation: dictated text (capital, full stop) accepted');
  await t.next(page);
  w = await dword();
  await page.fill('#dict-input', w.w + 'щ'); await page.click('#dict-check');
  await page.waitForSelector('#retry-btn');
  t.ok((await t.fb(page)).includes('Versuch 1 von 3'), 'dictation: a wrong text counts as an attempt');
  await page.fill('#dict-input', w.w); await page.click('#dict-check');
  t.eq(await t.verdict(page), 'Richtig', 'dictation: second attempt can succeed');
  await t.next(page);
  /* service-not-allowed opens the field by itself and points to it */
  await page.click('#dict-toggle');
  t.ok(!(await t.visible(page, '#dict-form')), 'dictation: toggle closes the field');
  await queue({ error: 'service-not-allowed' }); await page.click('#mic-btn');
  await page.waitForSelector('#retry-btn');
  t.ok(await t.visible(page, '#dict-form'), 'dictation: the field opens after service-not-allowed');
  t.ok((await t.fb(page)).includes('Diktieren der Tastatur'), 'dictation: the error points to keyboard dictation');
  t.eq(await page.evaluate(() => JSON.parse(localStorage.getItem('pronunciation.v1')).dict), true, 'dictation: choice is stored');
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
