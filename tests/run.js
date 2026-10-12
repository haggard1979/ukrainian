/* Test runner for the whole site.
   Usage: node tests/run.js [name …] [--shots <dir>] [--jobs <n>]
     name     run only test files whose name contains it (e.g. "locative", "time"); "daten" = data check only
     --shots  also write screenshots into <dir>
     --jobs   test files run in parallel (default 4)
   Exit code 1 if any check failed. */
const fs = require('fs'), path = require('path');
const { chromium, T } = require('./lib');
const { checkFile, checkLinks, dataFiles } = require('./check-data');

const args = process.argv.slice(2), opts = { jobs: 4 }, filters = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--shots') opts.shots = path.resolve(args[++i]);
  else if (args[i] === '--jobs') opts.jobs = Number(args[++i]) || 1;
  else filters.push(args[i]);
}
const wanted = n => !filters.length || filters.some(f => n.includes(f));

(async () => {
  const results = [];
  const t0 = Date.now();

  /* 1. static check of the exercise data in data/*.json */
  if (wanted('daten')) {
    const r = { name: 'daten', passed: 0, failed: [] };
    for (const f of dataFiles()) { const c = checkFile(f); if (c.probs.length) c.probs.forEach(x => r.failed.push(c.file + ': ' + x)); else r.passed++; }
    const links = checkLinks(); links.forEach(x => r.failed.push(x)); if (!links.length) r.passed++;
    results.push(r); report(r);
  }

  /* 2. browser tests: tests/pages/<name>.test.js export async function(t) */
  const dir = path.join(__dirname, 'pages');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort().filter(f => wanted(f.replace('.test.js', '')));
  if (files.length) {
    const browser = await chromium.launch();
    const queue = files.slice();
    await Promise.all(Array.from({ length: Math.min(opts.jobs, files.length) }, async () => {
      while (queue.length) {
        const f = queue.shift(), name = f.replace('.test.js', '');
        const t = new T(browser, name, opts), s = Date.now();
        try { await require(path.join(dir, f))(t); } catch (e) { t.fail('test aborted: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); }
        await t.close();
        const r = { name, passed: t.passed, failed: t.failed, secs: ((Date.now() - s) / 1000).toFixed(0) };
        results.push(r); report(r);
      }
    }));
    await browser.close();
  }

  const failed = results.reduce((n, r) => n + r.failed.length, 0), passed = results.reduce((n, r) => n + r.passed, 0);
  console.log('\n' + (failed ? '✗ ' : '✓ ') + passed + ' checks passed, ' + failed + ' failed (' + results.length + ' test files, ' +
    ((Date.now() - t0) / 1000).toFixed(0) + ' s)' + (opts.shots ? '\nscreenshots: ' + opts.shots : ''));
  process.exit(failed ? 1 : 0);
})();

function report(r) {
  console.log((r.failed.length ? '✗ ' : '✓ ') + r.name.padEnd(12) + String(r.passed).padStart(5) + ' ok' +
    (r.failed.length ? ', ' + r.failed.length + ' failed' : '') + (r.secs ? '  (' + r.secs + ' s)' : ''));
  r.failed.slice(0, 20).forEach(x => console.log('    – ' + x));
  if (r.failed.length > 20) console.log('    … ' + (r.failed.length - 20) + ' more');
}
