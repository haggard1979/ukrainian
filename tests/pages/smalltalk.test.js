/* Small talk trainer: learn list with topics and read-aloud, flash cards, translate, matching reply. */
const REL = 'smalltalk/smalltalk-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const all = await page.locator('.phrase').count();
  t.ok(all > 50, 'learn: all phrases listed (' + all + ')');
  await page.locator('.phrase .say').first().click();
  t.ok((await page.evaluate(() => window.__spoken.length)) > 0, 'learn: speaker reads the phrase');
  await page.click('#topic-bye');
  t.ok(await page.locator('.phrase').count() < all, 'learn: topic chip hides its phrases');
  await page.click('#topic-bye');

  await page.click('#tab-train');
  await page.click('[data-mode=card]');
  await page.click('#card .card-head'); await page.keyboard.press(' ');
  t.ok(await page.isVisible('#reveal'), 'card: space reveals');
  await page.keyboard.press('1');
  t.eq(await page.textContent('#st-right'), '1', 'card: key 1 = known');
  await page.click('#opt-dir');
  t.eq(await page.getAttribute('#prompt', 'lang'), 'uk', 'card: Ukrainian first');

  const P = await page.evaluate(() => window.__smalltalk.PHRASES);
  await page.click('[data-mode=type]');
  let bad = 0;
  for (let i = 0; i < 60; i++) {
    const pr = await page.textContent('#prompt'), it = P.find(p => p.de === pr);
    if (!it) { bad++; await t.next(page); continue; }
    const ans = (it.alt.length && i % 2 ? it.alt[0] : it.uk).toLowerCase().replace(/[.!?,]/g, '').replace(/’/g, "'");
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 60, 'translate: correct answers (incl. variants, no punctuation) accepted');
  const pr = await page.textContent('#prompt'), cur = P.find(p => p.de === pr);
  const words = cur.uk.split(' ');
  await page.fill('#answer-input', words.length > 1 ? words.slice(1).join(' ') : 'щось'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'translate: incomplete answer rejected');
  if (words.length > 1) t.ok(await page.locator('#feedback .miss, #feedback ins, #feedback del').count() > 0, 'translate: word comparison marks the missing word');
  await t.shot(page, 'type-wrong');
  await t.next(page);

  await page.click('[data-mode=reply]');
  const R = await page.evaluate(() => window.__smalltalk.REPLIES.map(r => [r.q.uk, r.a.uk]));
  bad = 0;
  for (let i = 0; i < 30; i++) {
    const q = await page.textContent('#prompt'), pair = R.find(r => r[0] === q);
    if (!pair) { bad++; await t.next(page); continue; }
    await page.click(`#opts [data-v="${pair[1]}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 30, 'reply: matching answer accepted');

  await page.click('[data-set-lang=en]'); await page.click('#tab-learn');
  t.ok(/Hi|Hello/.test(await page.locator('.phrase').first().innerText()), 'learn list in English');
  await t.linkedFromIndex('Smalltalk-Trainer', REL);
};
