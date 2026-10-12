/* Ordinal numbers trainer: the generator against hand-checked forms and against every example sentence in the data,
   all four modes, soft stem третій, round thousands, animate accusative, converter, case chips, language. */
const REL = 'grammar/ordinals/ordinals-trainer.html';

module.exports = async t => {
  const page = await t.open(REL, { clock: true });

  /* 1. hand-checked nominative masculine forms */
  const nom = [[1, 'перший'], [2, 'другий'], [3, 'третій'], [4, 'четвертий'], [5, 'п’ятий'], [7, 'сьомий'], [8, 'восьмий'], [10, 'десятий'],
    [11, 'одинадцятий'], [13, 'тринадцятий'], [20, 'двадцятий'], [21, 'двадцять перший'], [23, 'двадцять третій'], [30, 'тридцятий'],
    [40, 'сороковий'], [90, 'дев’яностий'], [100, 'сотий'], [101, 'сто перший'], [200, 'двохсотий'], [300, 'трьохсотий'], [500, 'п’ятисотий'],
    [1000, 'тисячний'], [1001, 'тисяча перший'], [2000, 'двотисячний'], [2020, 'дві тисячі двадцятий'], [2021, 'дві тисячі двадцять перший'],
    [1991, 'тисяча дев’ятсот дев’яносто перший'], [2100, 'дві тисячі сотий'], [5000, 'п’ятитисячний'], [9999, 'дев’ять тисяч дев’ятсот дев’яносто дев’ятий']];
  const got = await page.evaluate(l => l.map(([n]) => window.__ordinals.forms(n, 'm', 'nom')), nom);
  nom.forEach(([n, want], i) => t.eq(got[i][0], want, 'ordinal ' + n));
  t.ok(got[nom.findIndex(x => x[0] === 2000)].includes('двохтисячний'), 'variant двохтисячний accepted for 2000');

  /* 2. forms of one soft and one hard ordinal in every gender and case */
  const decl = await page.evaluate(() => { const f = window.__ordinals.forms, o = {};
    for (const n of [3, 5, 23]) for (const g of ['m', 'f', 'n', 'pl']) for (const c of ['nom', 'gen', 'dat', 'acc', 'ins', 'loc']) o[n + g + c] = f(n, g, c, false)[0];
    o['anim4'] = f(4, 'm', 'acc', true)[0]; o['animPl'] = f(1, 'pl', 'acc', true)[0]; o['loc5m'] = f(5, 'm', 'loc', false); return o; });
  t.eq([decl['3fnom'], decl['3nnom'], decl['3plnom'], decl['3mgen'], decl['3fgen'], decl['3plgen'], decl['3mdat'], decl['3fdat'], decl['3mins'], decl['3fins'], decl['3plins'], decl['3floc']],
    ['третя', 'третє', 'треті', 'третього', 'третьої', 'третіх', 'третьому', 'третій', 'третім', 'третьою', 'третіми', 'третій'], 'soft stem третій in all cases');
  t.eq([decl['5fnom'], decl['5nnom'], decl['5plnom'], decl['5mgen'], decl['5fgen'], decl['5plgen'], decl['5mdat'], decl['5fdat'], decl['5mins'], decl['5fins'], decl['5plins'], decl['5floc'], decl['5facc'], decl['5nacc']],
    ['п’ята', 'п’яте', 'п’яті', 'п’ятого', 'п’ятої', 'п’ятих', 'п’ятому', 'п’ятій', 'п’ятим', 'п’ятою', 'п’ятими', 'п’ятій', 'п’яту', 'п’яте'], 'hard stem п’ятий in all cases');
  t.eq([decl['23mgen'], decl['23fins'], decl['23nloc']], ['двадцять третього', 'двадцять третьою', 'двадцять третьому'], 'soft stem also in двадцять третій');
  t.eq([decl.anim4, decl.animPl, decl['5macc'], decl['5placc']], ['четвертого', 'перших', 'п’ятий', 'п’яті'], 'accusative: animate = genitive, inanimate = nominative');
  t.ok(decl.loc5m.includes('п’ятому') && decl.loc5m.includes('п’ятім'), 'locative masculine also accepts -ім');

  /* 3. every example sentence of the data: the stored answer must be the generator's main form */
  const mism = await page.evaluate(() => window.__ordinals.ITEMS.filter(i => window.__ordinals.forms(i.n, i.g, i.c, i.anim)[0] !== i.a[0]).map(i => i.n + ' ' + i.g + ' ' + i.c + ': data "' + i.a[0] + '", generator "' + window.__ordinals.forms(i.n, i.g, i.c, i.anim)[0] + '"'));
  t.eq(mism, [], 'data answers equal the generator for all example sentences');
  t.eq(await page.evaluate(() => { const c = {}; window.__ordinals.ITEMS.forEach(i => { c[i.c] = 1; c[i.g] = 1; }); return Object.keys(c).sort(); }),
    ['acc', 'dat', 'f', 'gen', 'ins', 'loc', 'm', 'n', 'nom', 'pl'], 'examples cover all cases and all genders');

  /* 4. number → ordinal */
  const task = () => page.evaluate(() => {
    const O = window.__ordinals, n = Number(document.getElementById('task').querySelector('.num').textContent);
    const noun = O.NOUNS.find(x => x.word === document.getElementById('task').querySelector('.noun').textContent);
    return { n, noun, forms: O.forms(n, noun.gender, 'nom') };
  });
  await page.click('#mode-n2o');
  for (const lv of ['20', '100', '1000', '2100']) {
    await page.click(`[data-level="${lv}"]`);
    let bad = 0, out = 0;
    for (let i = 0; i < 25; i++) {
      const x = await task(); if (x.n < 1 || x.n > Number(lv)) out++;
      const ans = i % 3 === 0 ? x.forms[0] + ' ' + x.noun.word : i % 3 === 1 ? x.forms[0].toUpperCase().replace(/’/g, "'") : x.forms[x.forms.length - 1];
      await page.fill('#answer-input', ans); await page.click('#check-btn');
      if (await t.verdict(page) !== 'Richtig') bad++;
      await t.next(page);
    }
    t.zero(bad, 25, 'number → ordinal ' + lv + ': correct answers accepted');
    t.zero(out, 25, 'number → ordinal ' + lv + ': numbers within range');
  }
  /* wrong gender and cardinal number get a specific hint */
  let x = await task();
  const otherG = { m: 'f', f: 'm', n: 'm' }[x.noun.gender];
  const wrongForm = await page.evaluate(([n, g]) => window.__ordinals.forms(n, g, 'nom')[0], [x.n, otherG]);
  await page.fill('#answer-input', wrongForm); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'number → ordinal: wrong gender rejected');
  t.ok((await t.fb(page)).includes('Genus passt nicht'), 'number → ordinal: hint about the gender');
  await t.shot(page, 'n2o-wrong');
  await t.next(page);
  x = await task();
  await page.fill('#answer-input', await page.evaluate(n => window.__ordinals.cardWords(n), x.n)); await page.click('#check-btn');
  t.ok((await t.fb(page)).includes('Grundzahl – gesucht'), 'number → ordinal: cardinal number gets its own hint');
  t.eq(await page.locator('#feedback .decl tr').count(), 7, 'feedback: declension table (header + six cases)');
  await t.next(page);

  /* 5. ordinal → number */
  await page.click('#mode-o2n'); await page.click('[data-level="2100"]');
  let bad = 0;
  for (let i = 0; i < 30; i++) {
    const n = await page.evaluate(() => { const O = window.__ordinals, w = document.querySelector('#task .words').textContent;
      for (let k = 1; k <= 2100; k++) if (O.supported(k) && [].concat(...['m', 'f', 'n'].map(g => O.forms(k, g, 'nom').map(f => f))).some(f => w.startsWith(f + ' '))) { const gs = ['m', 'f', 'n'].filter(g => O.forms(k, g, 'nom').some(f => w.startsWith(f + ' '))); if (gs.length) return k; } return -1; });
    const ans = i % 3 === 0 ? String(n) : i % 3 === 1 ? n + '-й' : n > 999 ? String(n).replace(/(\d)(\d{3})$/, '$1 $2') : n + '.';
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (n < 0 || await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 30, 'ordinal → number: 21, 21., 21-й and "2 021" accepted');
  await page.fill('#answer-input', '999'); await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'ordinal → number: wrong number rejected');
  await t.next(page);

  /* 6. choose the form: sentence modes with case chips */
  await page.click('#mode-choice');
  const sent = () => page.evaluate(() => { const O = window.__ordinals, s = document.getElementById('sentence').textContent.replace(/\s+/g, ' ').trim();
    const i = O.ITEMS.find(x => { const [a, z] = x.s.split('___'); return s.startsWith(a.trim()) && s.endsWith(z.trim()) && s.length <= x.s.length + 20; });
    return i ? { key: i.key, n: i.n, a: i.a, c: i.c, g: i.g, anim: i.anim, accepted: O.forms(i.n, i.g, i.c, i.anim) } : null; });
  bad = 0; const cs = new Set();
  for (let i = 0; i < 45; i++) {
    const it = await sent(); if (!it) { bad++; await t.next(page); continue; }
    cs.add(it.c);
    const opts = await page.evaluate(() => [...document.querySelectorAll('#opts .opt')].map(o => o.dataset.v));
    if (opts.length !== 4 || new Set(opts).size !== 4 || !opts.includes(it.a[0])) bad++;
    if (i % 2) await page.click(`#opts [data-v="${it.a[0]}"]`); else { await page.click('#card .card-head'); await page.keyboard.press(String(opts.indexOf(it.a[0]) + 1)); }
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 45, 'choose: four different options, right one accepted (click and keys)');
  t.ok(cs.size >= 5, 'choose: many cases came up (' + [...cs] + ')');
  let it = await sent();
  const wrongOpt = await page.evaluate(a => [...document.querySelectorAll('#opts .opt')].map(o => o.dataset.v).find(v => v !== a), it.a[0]);
  await page.click(`#opts [data-v="${wrongOpt}"]`);
  t.eq(await t.verdict(page), 'Noch nicht richtig', 'choose: wrong form rejected');
  t.ok(/Fall|Nominativ|Genitiv|Dativ|Akkusativ|Instrumental|Lokativ/.test(await t.fb(page)) && await page.locator('#feedback .decl td.on').count() === 1, 'choose: feedback marks the case/gender cell');
  await t.shot(page, 'choose-wrong');
  await t.next(page);

  /* 7. type the form incl. the alternative -ім; case chips: only locative */
  await page.click('#mode-form');
  bad = 0;
  for (let i = 0; i < 40; i++) {
    it = await sent(); if (!it) { bad++; await t.next(page); continue; }
    const ans = i % 3 === 0 ? it.a[0].toUpperCase().replace(/’/g, "'") : i % 3 === 1 ? it.accepted[it.accepted.length - 1] : it.a[0];
    await page.fill('#answer-input', ans); await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'type form: right forms accepted (capitals, apostrophe, -ім variant)');
  it = await sent();
  await page.fill('#answer-input', it.a[0].replace(/[а-яіїє]+$/, 'ий')); await page.click('#check-btn');
  if (!it.accepted.some(f => f === it.a[0].replace(/[а-яіїє]+$/, 'ий'))) t.eq(await t.verdict(page), 'Noch nicht richtig', 'type form: wrong ending rejected');
  await t.next(page);
  for (const c of ['nom', 'gen', 'dat', 'acc', 'ins']) await page.click('#chip-' + c);
  const only = new Set();
  for (let i = 0; i < 10; i++) { it = await sent(); only.add(it && it.c); await page.fill('#answer-input', it ? it.a[0] : 'x'); await page.click('#check-btn'); await t.next(page); }
  t.eq([...only], ['loc'], 'chips: only locative → only locative sentences');

  /* 8. converter */
  await page.click('#tab-conv');
  const conv = async n => { await page.fill('#conv-input', String(n)); return page.evaluate(() => document.getElementById('conv-out').innerText); };
  let out = await conv(21);
  t.ok(out.includes('двадцять перший') && out.includes('двадцять перша') && out.includes('двадцять перше') && out.includes('двадцять перші'), 'converter: 21 in all genders');
  t.ok(out.includes('двадцять один') && out.includes('Grundzahl'), 'converter: cardinal number shown');
  out = await conv(2025);
  t.ok(out.includes('дві тисячі двадцять п’ятий') && out.includes('Nur das letzte Wort'), 'converter: 2025 with the rule');
  t.ok((await conv(2000)).includes('двотисячний'), 'converter: 2000 as one word');
  t.ok((await conv(0)).includes('1 bis 9 999'), 'converter: 0 rejected');
  out = await conv(3500);
  t.ok(out.startsWith('три тисячі п’ятисотий'), 'converter: 3500 → три тисячі п’ятисотий (got ' + out.split('\n')[0] + ')');
  await page.click('.examples .chip >> nth=5');
  t.ok((await page.evaluate(() => document.getElementById('conv-out').innerText)).includes('дві тисячі двадцять п’ятий'), 'converter: example chip');
  await t.shot(page, 'converter');

  /* 9. language */
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Ordinal Numbers Trainer', 'English title');
  t.ok((await page.evaluate(() => document.getElementById('conv-out').innerText)).includes('Cardinal number'), 'converter explanation in English');
  await t.linkedFromIndex('Ordnungszahlen-Trainer', REL);
};
