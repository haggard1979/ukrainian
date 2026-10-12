/* Icons and link previews (tools/previews.js): every page has the generated block, the referenced files exist,
   preview images are 1200 × 630, the manifest icons exist and every page has an entry in tools/previews.json. */
const fs = require('fs'), path = require('path');
const { allPages, ROOT } = require('../lib');

const pngSize = file => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

module.exports = async t => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/previews.json'), 'utf8'));
  const entries = new Map(cfg.pages.map(p => [p.page, p]));
  for (const rel of allPages()) {
    t.ok(entries.has(rel), rel + ': entry in tools/previews.json (then run node tools/previews.js)');
    const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const meta = (attr, name) => { const m = new RegExp('<meta ' + attr + '="' + name + '" content="([^"]*)"').exec(html); return m && m[1]; };
    t.ok(/<!-- preview[\s\S]*<!-- \/preview -->/.test(html), rel + ': generated preview block in <head>');
    for (const n of ['og:title', 'og:description', 'og:url', 'og:image']) t.ok(meta('property', n), rel + ': ' + n);
    t.ok(meta('name', 'description'), rel + ': meta description');
    t.eq(meta('property', 'og:url'), rel === 'index.html' ? cfg.baseUrl : cfg.baseUrl + rel, rel + ': og:url');
    /* absolute image URL → file in the repository */
    const img = meta('property', 'og:image') || '';
    const local = path.join(ROOT, img.replace(cfg.baseUrl, ''));
    if (t.ok(img.startsWith(cfg.baseUrl) && fs.existsSync(local), rel + ': og:image exists (' + img + ')'))
      t.eq(pngSize(local), [1200, 630], rel + ': preview image is 1200 × 630');
    /* relative icon and manifest links */
    for (const m of html.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/g))
      t.ok(fs.existsSync(path.resolve(path.dirname(path.join(ROOT, rel)), m[1])), rel + ': ' + m[1] + ' exists');
  }
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.webmanifest'), 'utf8'));
  for (const i of man.icons) {
    const f = path.join(ROOT, i.src);
    if (t.ok(fs.existsSync(f), 'manifest icon ' + i.src)) t.eq(pngSize(f).join('x'), i.sizes, 'manifest icon size ' + i.src);
  }
  t.eq(pngSize(path.join(ROOT, 'assets/icons/apple-touch-icon.png')), [180, 180], 'apple-touch-icon is 180 × 180');
};
