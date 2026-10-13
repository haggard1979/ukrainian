/* Picture guessing: word selection, check, scoring, retry, gallery, source link, keys, language. */
const REL = 'games/art/art-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__art.state())));
  const picks = async idx => { for (const i of idx) await page.click('#wd-' + i); };

  /* ---- the data ---- */
  const P = await page.evaluate(() => JSON.parse(JSON.stringify(window.__art.PAINTINGS)));
  t.ok(P.length >= 23, 'data: at least 23 paintings (' + P.length + ')');
  t.ok(new Set(P.map(p => p.artist.name.de)).size >= 3, 'data: at least three artists');
  t.ok(P.every(p => p.correct.length >= 5 && p.wrong.length >= 3), 'data: enough correct and wrong words per painting');

  /* ---- the round: image with alt text, 8 words (5 in the picture, 3 not) ---- */
  let s = await st();
  t.eq(s.words.length, 8, 'round: eight words');
  t.eq(s.words.filter(w => w.ok).length, 5, 'round: five words are in the picture');
  t.ok(await page.evaluate(() => { const i = document.getElementById('art-img'); return i.complete && i.naturalWidth > 100; }), 'round: the painting loads');
  t.ok((await page.getAttribute('#art-img', 'alt')).length > 20, 'round: the image has a description');
  t.ok(await page.locator('#art-cap').isHidden(), 'round: caption stays hidden until the answer');

  /* ---- nothing chosen: no scoring ---- */
  await page.click('#check-btn');
  t.eq((await st()).answered, false, 'check with nothing chosen does nothing');
  t.ok((await page.textContent('#prompt')).includes('mindestens'), 'the page asks for at least one word');

  /* ---- exactly the right words (alternating click / key) ---- */
  let bad = 0;
  for (let r = 0; r < 12; r++) {
    s = await st();
    const right = s.words.map((w, i) => w.ok ? i : -1).filter(i => i >= 0);
    if (r % 2) await picks(right); else for (const i of right) await page.keyboard.press(String(i + 1));
    if (r % 2 === 0 && r % 4 === 0) await page.keyboard.press('Enter'); else await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    if (r === 0) {
      t.ok(await t.visible(page, '#art-cap'), 'answer: caption with title, artist and source appears');
      const href = await page.getAttribute('#art-cap a', 'href');
      t.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(href), 'answer: source link goes to Wikimedia Commons');
      t.ok((await page.textContent('#art-cap')).includes((await st()).cur.artist.name.de), 'answer: the artist is named');
      t.eq(await page.locator('#words .wd.ok').count(), 5, 'answer: five words marked right');
    }
    await t.next(page);
  }
  t.zero(bad, 12, 'exactly the right words is right (click and key)');

  /* ---- one wrong word chosen, one right word missed ---- */
  s = await st();
  const right = s.words.map((w, i) => w.ok ? i : -1).filter(i => i >= 0);
  const wrongIdx = s.words.findIndex(w => !w.ok);
  await picks(right.slice(1).concat([wrongIdx]));
  await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht ganz', 'a wrong choice and a missed word is not right');
  t.eq(await page.locator('#words .wd.bad').count(), 1, 'answer: the wrong choice is marked red');
  t.eq(await page.locator('#words .wd.miss').count(), 1, 'answer: the missed word is marked gold');
  const fb = await t.fb(page);
  t.ok(fb.includes('1 Wort gewählt') && fb.includes('1 Wort im Bild nicht gewählt'), 'feedback counts both kinds of mistakes');
  t.ok(fb.includes('Im Bild zu sehen') && fb.includes('Nicht im Bild'), 'feedback lists the words with translations');
  t.ok(await page.locator('#words .wd').first().isDisabled(), 'words are locked after checking');
  await t.shot(page, 'wrong');
  const failed = s.cur.id;

  /* ---- all words chosen: all wrong ones red ---- */
  await t.next(page);
  s = await st();
  await picks([0, 1, 2, 3, 4, 5, 6, 7]);
  await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht ganz', 'choosing everything is not right');
  t.eq(await page.locator('#words .wd.bad').count(), 3, 'all three decoys are marked red');
  await t.next(page);

  /* ---- a failed painting comes back after three rounds ---- */
  const seen = [];
  for (let r = 0; r < 4; r++) { s = await st(); seen.push(s.cur.id); await picks([0]); await page.click('#check-btn'); await t.next(page); }
  t.ok(seen.includes(failed), 'a failed painting returns within the next rounds');

  /* ---- toggling ---- */
  s = await st();
  await page.click('#wd-0'); await page.click('#wd-0');
  t.eq((await st()).picked, [], 'a second tap removes the word');
  t.eq(await page.getAttribute('#wd-0', 'aria-pressed'), 'false', 'pressed state follows');

  /* ---- progress is saved ---- */
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('art.v1')));
  t.ok(saved.right >= 12 && saved.wrong >= 3, 'progress saved to art.v1');

  /* ---- gallery tab ---- */
  await page.click('#tab-gallery');
  t.eq(await page.locator('#gallery .gitem').count(), P.length, 'gallery: one entry per painting');
  t.ok(await t.visible(page, '#view-gallery') && await page.locator('#view-play').evaluate(e => e.style.display === 'none'), 'gallery: tab switches views');
  await t.shot(page, 'gallery');
  await page.click('#tab-play');

  /* ---- language ---- */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Picture Guessing', 'English title');
  t.ok((await page.textContent('#prompt')).includes('Choose every word'), 'English prompt');
  await page.click('#tab-rules'); t.ok((await page.textContent('#view-rules')).includes('How picture guessing works'), 'English rules');

  await t.linkedFromIndex('Bilderraten', REL);
};
