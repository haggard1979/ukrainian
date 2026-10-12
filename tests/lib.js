/* Shared helpers for the test suite (see tests/README.md). */
const { execSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.resolve(__dirname, '..');

/* every page of the site: index.html + all *-trainer.html */
function allPages() {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tests') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /-trainer\.html$/.test(e.name) ? [path.relative(ROOT, p).split(path.sep).join('/')] : [];
  });
  return ['index.html', ...walk(ROOT).sort()];
}

/* fake speech engine (headless Chromium has none): voice 'uk' = Ukrainian voice present,
   'none' = only an English voice, 'noapi' = no Web Speech API at all. Spoken texts land in window.__spoken. */
function speechStub(voice) {
  if (voice === 'noapi') return `Object.defineProperty(window,'speechSynthesis',{value:undefined});window.SpeechSynthesisUtterance=undefined;`;
  const voices = voice === 'none' ? `[{name:'Alex',lang:'en-US'}]` : `[{name:'Lesya',lang:'uk-UA'},{name:'Alex',lang:'en-US'}]`;
  return `window.__spoken=[];const __voices=${voices};window.SpeechSynthesisUtterance=function(t){this.text=t;};
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>__voices,cancel(){},speak(u){window.__spoken.push(u.text);},addEventListener(){}}});`;
}

/* One instance per test file: opens pages, records checks and page errors. */
class T {
  constructor(browser, name, opts) {
    this.browser = browser; this.name = name; this.opts = opts;
    this.passed = 0; this.failed = []; this.contexts = [];
  }
  /* open a page in a fresh context (own localStorage). Options: locale, width, height, scheme, voice, touch,
     clock (fake timers: next() then skips the 250-ms lock instead of waiting) */
  async open(rel, o = {}) {
    const ctx = await this.browser.newContext({
      locale: o.locale || 'de-DE', colorScheme: o.scheme || 'light', hasTouch: !!o.touch,
      viewport: { width: o.width || 390, height: o.height || 1000 },
    });
    this.contexts.push(ctx);
    const page = await ctx.newPage();
    await page.addInitScript(speechStub(o.voice || 'uk'));
    if (o.clock) { await page.clock.install(); page.__fakeClock = true; }
    page.on('pageerror', e => this.fail('page error on ' + rel + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') this.fail('console error on ' + rel + ': ' + m.text()); });
    await page.goto('file://' + path.join(ROOT, rel));
    return page;
  }
  fail(msg) { this.failed.push(msg); }
  ok(cond, msg) { if (cond) this.passed++; else this.fail(msg); return !!cond; }
  eq(actual, expected, msg) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    return this.ok(a === e, msg + ' – expected ' + e + ', got ' + a);
  }
  /* a count of problems found in a loop must be 0; total = how many tasks were tried */
  zero(problems, total, msg) { return this.ok(problems === 0, msg + ': ' + problems + ' of ' + total + ' failed'); }
  /* feedback helpers (ids shared by all trainers) */
  fb(page) { return page.evaluate(() => document.getElementById('feedback').innerText.replace(/\n+/g, ' | ')); }
  verdict(page) { return page.textContent('#feedback .verdict'); }
  /* "next" after feedback; the pages ignore it for 250 ms (protection against double Enter) */
  async next(page) {
    if (page.__fakeClock) await page.clock.fastForward(300); else await page.waitForTimeout(260);
    await page.click('#next-btn');
  }
  visible(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, sel); }
  /* screenshot only when the runner was started with --shots <dir> */
  async shot(page, name, o = {}) {
    if (!this.opts.shots) return;
    fs.mkdirSync(this.opts.shots, { recursive: true });
    await page.screenshot({ path: path.join(this.opts.shots, this.name + '_' + name + '.png'), fullPage: o.fullPage !== false, clip: o.clip });
  }
  /* index.html links to the page under its German title */
  async linkedFromIndex(linkText, rel) {
    const ip = await this.open('index.html');
    await ip.click('text=' + linkText); await ip.waitForLoadState();
    this.ok(ip.url().endsWith(rel), 'index link "' + linkText + '" leads to ' + rel + ' (got ' + ip.url() + ')');
  }
  async close() { for (const c of this.contexts) await c.close().catch(() => {}); }
}

module.exports = { chromium, ROOT, allPages, speechStub, T };
