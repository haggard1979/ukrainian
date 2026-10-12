/* Shared helpers for the test suite (see tests/README.md). */
const { execSync } = require('child_process');
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const ROOT = path.resolve(__dirname, '..');

/* The pages load their data with fetch(), which browsers block for file:// URLs, so the tests use a small
   static web server on a free local port (started once per process). */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
let serverPromise = null;
function server() {
  if (!serverPromise) serverPromise = new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split(/[?#]/)[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => { srv.unref(); resolve('http://127.0.0.1:' + srv.address().port + '/'); });
  });
  return serverPromise;
}
/* URL of a page (path relative to the repository root) */
async function url(rel) { return (await server()) + rel; }
/* wait until a page that loads JSON data has set itself up (<html data-ready="1">) */
async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.ready !== '0', null, { timeout: 10000 });
  const st = await page.evaluate(() => document.documentElement.dataset.ready);
  if (st === 'error') throw new Error('data could not be loaded: ' + page.url());
}

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
  return `window.__spoken=[];window.__rates=[];const __voices=${voices};window.SpeechSynthesisUtterance=function(t){this.text=t;};
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>__voices,cancel(){},speak(u){window.__spoken.push(u.text);window.__rates.push(u.rate);},addEventListener(){}}});`;
}

/* fake speech recognition: window.__recog.queue holds the next results; an item is an array of alternatives
   (strings) or {error:'no-speech'}. recog 'none' = browser without SpeechRecognition. */
function recogStub(mode) {
  if (mode === 'none') return `window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;`;
  return `window.__recog={queue:[],starts:0,aborts:0,last:null};
    function FakeRec(){this.lang='';this.interimResults=false;this.maxAlternatives=1;this.continuous=false;}
    FakeRec.prototype.start=function(){const me=this;window.__recog.starts++;window.__recog.last={lang:me.lang,max:me.maxAlternatives};
      const item=window.__recog.queue.shift();
      Promise.resolve().then(()=>{me.onstart&&me.onstart();
        if(item===undefined)return;
        if(Array.isArray(item))me.onresult&&me.onresult({results:[item.map(x=>({transcript:x,confidence:.9}))]});
        else me.onerror&&me.onerror({error:item.error});
        me.onend&&me.onend();});};
    FakeRec.prototype.stop=function(){};FakeRec.prototype.abort=function(){window.__recog.aborts++;};
    window.SpeechRecognition=FakeRec;window.webkitSpeechRecognition=FakeRec;`;
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
    await page.addInitScript(recogStub(o.recog));
    if (o.clock) { await page.clock.install(); page.__fakeClock = true; }
    page.on('pageerror', e => this.fail('page error on ' + rel + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') this.fail('console error on ' + rel + ': ' + m.text()); });
    await page.goto(await url(rel));
    await ready(page);
    return page;
  }
  /* after page.reload() / page.goto() inside a test */
  ready(page) { return ready(page); }
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
    await ip.click('text=' + linkText); await ip.waitForLoadState(); await ready(ip);
    this.ok(ip.url().endsWith(rel), 'index link "' + linkText + '" leads to ' + rel + ' (got ' + ip.url() + ')');
  }
  async close() { for (const c of this.contexts) await c.close().catch(() => {}); }
}

module.exports = { chromium, ROOT, allPages, speechStub, url, ready, T };
