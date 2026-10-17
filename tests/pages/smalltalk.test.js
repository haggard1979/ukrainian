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

  /* video-call topic: listed, and switched on once for learners whose saved topic choice predates it */
  t.ok(await page.locator('#topic-video').count() === 1 && (await page.textContent('#view-learn')).includes('Ви мене чуєте?'), 'learn: video-call phrases listed');
  const p2 = await t.open(REL);
  await p2.evaluate(() => { localStorage.setItem('smalltalk.v1', JSON.stringify({ topics: ['greet', 'how', 'day', 'weather', 'polite', 'meet'] })); });
  await p2.reload(); await p2.waitForFunction(() => document.documentElement.dataset.ready === '1');
  const pressed = await p2.evaluate(() => [...document.querySelectorAll('#topics [aria-pressed=true]')].map(b => b.id.replace('topic-', '')));
  t.ok(pressed.includes('video') && !pressed.includes('bye'), 'saved topic choice: new topic switched on, deselected topic stays off (' + pressed.join(',') + ')');
  await p2.click('#topic-video');
  await p2.reload(); await p2.waitForFunction(() => document.documentElement.dataset.ready === '1');
  t.ok(!(await p2.evaluate(() => [...document.querySelectorAll('#topics [aria-pressed=true]')].map(b => b.id.replace('topic-', '')))).includes('video'), 'saved topic choice: deselecting the new topic is kept');

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

  /* direct link to one topic, "only this topic" from the learn list, "all topics" chip, links on the start page */
  const pressedOf = pg => pg.evaluate(() => [...document.querySelectorAll('#topics [data-topic][aria-pressed=true]')].map(b => b.dataset.topic));
  const p3 = await t.open(REL + '#video');
  t.eq(await pressedOf(p3), ['video'], 'direct link #video: only that topic chosen');
  t.ok(await p3.isVisible('#topics-all') && await p3.locator('#view-learn section').count() === 1, 'direct link: learn list shows one topic, "all topics" chip visible');
  await p3.click('#topics-all');
  t.ok((await pressedOf(p3)).length > 5 && !(await p3.isVisible('#topics-all')), '"all topics" chip selects every topic and hides itself');
  t.ok(!(await p3.evaluate(() => location.hash)), 'choosing topics by hand clears the direct link');
  await p3.click('#tab-learn');
  await p3.click('#only-weather');
  t.eq(await pressedOf(p3), ['weather'], '"only this topic" chooses just that topic');
  t.eq(await p3.getAttribute('#tab-train', 'aria-selected'), 'true', '"only this topic" switches to practice');
  t.eq(await p3.evaluate(() => location.hash), '#weather', '"only this topic" sets a shareable link');
  const ip = await t.open('index.html');
  await ip.waitForSelector('#st-topics a');
  const links = await ip.evaluate(() => [...document.querySelectorAll('#st-topics a')].map(a => a.getAttribute('href')));
  t.ok(links.length >= 8 && links.includes('smalltalk/smalltalk-trainer.html#video'), 'start page links every small-talk topic (' + links.length + ')');
  await ip.click('#st-topics a[href$="#greet"]'); await ip.waitForFunction(() => document.documentElement.dataset.ready === '1');
  t.eq(await pressedOf(ip), ['greet'], 'start page topic link opens the trainer with that topic');

  await page.click('[data-set-lang=en]'); await page.click('#tab-learn');
  t.ok(/Hi|Hello/.test(await page.locator('.phrase').first().innerText()), 'learn list in English');
  await t.linkedFromIndex('Smalltalk-Trainer', REL);
};
