/* Market game: counting phrases (number + noun), prices with гривня forms, shopping list with total and change,
   learn tab, rules, keys, language. Number words and forms are recomputed here independently of the page. */
const REL = 'games/market/market-trainer.html';

/* independent reference: number words 1–999 and the form index by the last digit(s) */
const U = {
  m: ['', 'один', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'],
  f: ['', 'одна', 'дві', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'],
  n: ['', 'одне', 'два', 'три', 'чотири', 'п’ять', 'шість', 'сім', 'вісім', 'дев’ять'],
};
const TEENS = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п’ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев’ятнадцять'];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', 'п’ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев’яносто'];
const HUND = ['', 'сто', 'двісті', 'триста', 'чотириста', 'п’ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев’ятсот'];
function words(n, g) {
  const out = [], h = Math.floor(n / 100), r = n % 100;
  if (h) out.push(HUND[h]);
  if (r >= 10 && r < 20) out.push(TEENS[r - 10]);
  else { if (r >= 20) out.push(TENS[Math.floor(r / 10)]); if (r % 10) out.push(U[g][r % 10]); }
  return out.join(' ');
}
const fi = n => (n % 100 >= 11 && n % 100 <= 14) ? 2 : n % 10 === 1 ? 0 : (n % 10 >= 2 && n % 10 <= 4) ? 1 : 2;
const HR = ['гривня', 'гривні', 'гривень'];
const money = n => words(n, 'f') + ' ' + HR[fi(n)];
const cap = s => s[0].toUpperCase() + s.slice(1);
const UNIT = { kg: ['кілограм', 'кілограми', 'кілограмів'], l: ['літр', 'літри', 'літрів'] };
const amount = (g, q) => g.unit === 'piece' ? (q === 1 ? g.forms[0] : words(q, g.gender) + ' ' + g.forms[fi(q)])
  : (q === 1 ? UNIT[g.unit][0] : words(q, 'm') + ' ' + UNIT[g.unit][fi(q)]) + ' ' + g.of;

module.exports = async t => {
  const page = await t.open(REL, { clock: true });
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__market.state())));
  const G = await page.evaluate(() => JSON.parse(JSON.stringify(window.__market.GOODS)));
  const byId = id => G.find(g => g.id === id);
  t.ok(G.length >= 20, 'data: at least 20 goods (' + G.length + ')');
  t.ok(G.every(g => g.unit !== 'piece' || g.forms), 'data: every piece good has counting forms');

  /* ---- reference values from the page's generator ---- */
  const some = [1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 31, 47, 100, 101, 102, 104, 111, 112, 114, 121, 222, 345, 999];
  let bad = 0;
  for (const n of some) if (await page.evaluate(n => window.__market.money(n), n) !== money(n)) bad++;
  t.zero(bad, some.length, 'hryvnia: number words and forms (incl. 11–14, 21–24, 111–114)');
  t.eq(await page.evaluate(() => window.__market.money(21)), 'двадцять одна гривня', 'hryvnia: 21 is двадцять одна гривня');
  t.eq(await page.evaluate(() => window.__market.money(12)), 'дванадцять гривень', 'hryvnia: 12 is дванадцять гривень');
  t.eq(await page.evaluate(() => window.__market.money(22)), 'двадцять дві гривні', 'hryvnia: 22 is двадцять дві гривні');
  bad = 0;
  for (const g of G) for (const q of [1, 2, 3, 5, 11, 21, 22]) if (await page.evaluate(([id, q]) => window.__market.amount(window.__market.GOODS.find(x => x.id === id), q, true), [g.id, q]) !== amount(g, q)) bad++;
  t.zero(bad, G.length * 7, 'amounts: piece / kilogram / litre phrases');
  t.eq(amount(byId('egg'), 5), 'п’ять яєць', 'reference: п’ять яєць');

  /* ---- how many? ---- */
  bad = 0; let picBad = 0; const ns = new Set(), classes = new Set();
  for (let i = 0; i < 40; i++) {
    const s = await st(), g = byId(s.good);
    ns.add(s.n); classes.add(s.cls);
    const want = words(s.n, g.gender) + ' ' + g.forms[fi(s.n)];
    if (await page.locator('#pics span').count() !== s.n) picBad++;
    t.ok(s.answer === want && s.opts.length === 4 && new Set(s.opts).size === 4 && s.opts.includes(want), 'count: four different options with the right phrase (' + want + ' / ' + s.answer + ')');
    if (i % 2) await page.click(`#opts [data-v="${want}"]`); else await page.keyboard.press(String(s.opts.indexOf(want) + 1));
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'count: the right phrase is right (click and key)');
  t.zero(picBad, 40, 'count: the picture shows N items');
  t.eq([...classes].sort(), ['few', 'many', 'one', 'teen'], 'count: all number classes occur');
  t.ok([11, 12, 13, 14].some(n => ns.has(n)), 'count: 11–14 occur');
  let s = await st();
  await page.click(`#opts [data-v="${s.opts.find(o => o !== s.answer)}"]`);
  t.eq(await t.verdict(page), 'Leider falsch', 'count: a wrong phrase is wrong');
  t.ok((await t.fb(page)).includes(cap(s.answer)), 'count: feedback shows the right phrase');
  await t.shot(page, 'count');
  await page.clock.fastForward(300);
  await page.locator('#card .card-head').click();
  await page.keyboard.press('Enter');
  t.eq((await st()).answered, false, 'Enter goes on');

  /* ---- what does it cost? ---- */
  await page.click('#mode-price');
  bad = 0; const pcls = new Set(); let plural = 0, tagBad = 0;
  for (let i = 0; i < 40; i++) {
    s = await st(); const g = byId(s.good);
    pcls.add(s.cls); if (s.q > 1) plural++;
    const want = cap(amount(g, s.q)) + ' ' + (s.q === 1 ? 'коштує' : 'коштують') + ' ' + money(s.price) + '.';
    const tag = await page.textContent('#tag .price');
    if (tag !== s.price + ' грн') tagBad++;
    t.ok(s.answer === want && s.opts.length === 4 && new Set(s.opts).size === 4 && s.opts.includes(want), 'price: four different options with the right sentence (' + want + ' / ' + s.answer + ')');
    await page.click(`#opts [data-v="${want}"]`);
    if (await t.verdict(page) !== 'Richtig') bad++;
    await t.next(page);
  }
  t.zero(bad, 40, 'price: the right sentence is right');
  t.zero(tagBad, 40, 'price: the price tag shows the price');
  t.eq([...pcls].sort(), ['few', 'many', 'one', 'teen'], 'price: all price classes occur');
  t.ok(plural > 0, 'price: some tasks with коштують (several units)');
  s = await st();
  await page.keyboard.press(String(s.opts.findIndex(o => o !== s.answer) + 1));
  t.eq(await t.verdict(page), 'Leider falsch', 'price: a wrong sentence is wrong (key)');
  t.ok((await t.fb(page)).includes(s.answer), 'price: feedback shows the right sentence');
  await t.shot(page, 'price');
  t.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('market.v1')))).mode === 'price', 'mode is stored');
  await t.next(page);

  /* ---- shopping list ---- */
  await page.click('#mode-shop');
  const notes = await page.evaluate(() => window.__market.NOTES.map(n => n.value));
  bad = 0; let sumBad = 0;
  for (let i = 0; i < 12; i++) {
    s = await st();
    const list = s.list.map(x => ({ g: byId(x.id), q: x.q }));
    const parts = list.map(x => amount(x.g, x.q));
    t.ok(parts.every(p => s.listText.includes(p)), 'shop: the list names every item (' + s.listText + ')');
    t.ok(i || (await page.textContent('#shop-list')).toLowerCase().includes(parts[0]), 'shop: the list is shown');
    t.eq(await page.isDisabled('#check-btn'), true, 'shop: check needs a filled basket');
    /* overshoot once and go back with − */
    for (const x of list) for (let k = 0; k < x.q; k++) await page.click('#good-' + x.g.id);
    await page.click('#good-' + list[0].g.id); await page.click('#minus-' + list[0].g.id);
    const total = list.reduce((a, x) => a + x.g.price * x.q, 0), note = notes.find(n => n > total);
    if (s.total !== total || s.note !== note || s.change !== note - total) sumBad++;
    await page.click('#check-btn');
    if (await t.verdict(page) !== 'Richtig') bad++;
    const tot = await page.textContent('#shop-total'), ch = await page.textContent('#shop-change');
    if (!tot.includes('Разом: ' + money(total) + '.') || !ch.includes(money(note - total) + '.')) sumBad++;
    await t.next(page);
  }
  t.zero(bad, 12, 'shop: buying exactly the list is right');
  t.zero(sumBad, 12, 'shop: total, note and change are right');
  s = await st();
  const first = byId(s.list[0].id);
  await page.click('#good-' + first.id);
  t.eq(await page.textContent('#qty-' + first.id), '1 ' + { piece: 'шт.', kg: 'кг', l: 'л' }[first.unit], 'shop: the basket shows the amount');
  await page.click('#plus-' + first.id);
  const extra = G.find(g => !s.list.some(x => x.id === g.id));
  await page.click('#good-' + extra.id);
  await page.click('#check-btn');
  t.eq(await t.verdict(page), 'Leider falsch', 'shop: a wrong basket is wrong');
  const f = await t.fb(page);
  t.ok(f.includes('nicht auf der Liste') && f.includes('Решта'), 'shop: feedback names extra goods and the change');
  t.eq(await page.isDisabled('#good-' + extra.id), true, 'shop: stalls are locked after checking');
  await t.shot(page, 'shop');
  await t.next(page);

  /* ---- learn and rules ---- */
  await page.click('#tab-learn');
  t.eq(await page.locator('#learn-list li').count(), G.length, 'learn: all goods listed');
  const apple = await page.textContent('#learn-apple');
  t.ok(apple.includes('одне яблуко · два яблука · п’ять яблук') && apple.includes('30 грн'), 'learn: forms 1 · 2 · 5 and price');
  t.ok((await page.textContent('#learn-potato')).includes('кілограм картоплі · два кілограми картоплі · п’ять кілограмів картоплі'), 'learn: mass nouns with кілограм');
  await page.locator('#learn-egg .say').click();
  t.ok(await page.evaluate(() => window.__spoken.some(x => x.includes('п’ять яєць'))), 'learn: forms are read aloud');
  await t.shot(page, 'learn');
  await page.click('#tab-rules');
  const rules = await page.textContent('#view-rules');
  t.ok(rules.includes('двадцять одна гривня') && rules.includes('Скільки з мене?') && rules.includes('Решта'), 'rules: гривня forms and useful phrases');

  /* ---- language, phone width ---- */
  t.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll at 390 px (rules)');
  await page.click('#tab-play');
  t.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll at 390 px (shop)');
  await page.click('[data-set-lang=en]');
  t.eq(await page.title(), 'Ukrainian Market Game', 'English title');
  t.eq(await page.textContent('#check-btn'), 'Check', 'English check button');
  await page.click('#tab-rules');
  t.ok((await page.textContent('#view-rules')).includes('How the market works'), 'English rules');
  await t.linkedFromIndex('Markt', REL);
};
