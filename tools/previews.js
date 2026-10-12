/* Icons and link previews (Teams, WhatsApp, Slack, Signal …) for every page.
   Usage: node tools/previews.js          (after changing tools/previews.json or adding a page)
   Reads tools/previews.json and
   - renders the icons: favicon.ico (16/32/48), assets/icons/favicon-32.png, apple-touch-icon.png (180),
     icon-192.png, icon-512.png (full square, also used as maskable icon)
   - renders one preview image per page: assets/preview/<image>.png (1200 × 630, Open Graph size)
   - writes site.webmanifest
   - replaces the block between <!-- preview --> and <!-- /preview --> in each page's <head>
     (inserted after <title> the first time): description, theme colour, icons, manifest, Open Graph and Twitter tags.
   Uses Playwright + Chromium like the tests (fonts come from Google Fonts, so network access is needed). */
const fs = require('fs'), path = require('path');
const { chromium } = require('../tests/lib');
const ROOT = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'previews.json'), 'utf8'));
const tokens = fs.readFileSync(path.join(ROOT, 'assets/tokens.css'), 'utf8');
const common = fs.readFileSync(path.join(ROOT, 'assets/common.js'), 'utf8');
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600&family=Onest:wght@400;500;600&display=swap">';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* the mark: gold Ї on the site's blue – a letter only Ukrainian has */
function iconHtml(size, rounded) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${tokens}
    html,body{margin:0;background:transparent}
    .i{width:${size}px;height:${size}px;background:var(--blue);border-radius:${rounded ? size * 0.2 : 0}px;
       display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
    .i span{font-family:"Fira Sans",sans-serif;font-weight:600;color:var(--gold);font-size:${size * 0.7}px;line-height:1;transform:translateY(${size * 0.035}px)}
    .i::after{content:"";position:absolute;left:0;right:0;bottom:0;height:${Math.max(1, size * 0.06)}px;background:var(--gold)}
  </style></head><body><div class="i"><span>Ї</span></div></body></html>`;
}

function previewHtml(p) {
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8">${FONTS}<style>${tokens}
    html,body{margin:0}
    body{width:1200px;height:630px;background:var(--bg);color:var(--ink);font-family:var(--font-ui);display:flex;flex-direction:column}
    .flag{height:14px;background:linear-gradient(var(--blue) 0 50%,var(--gold) 50% 100%)}
    .stitch{display:block;width:100%;height:28px;margin:18px 0}
    .sa{fill:var(--gold)} .sb{fill:var(--blue)}
    main{flex:1;display:flex;align-items:center;gap:56px;padding:0 80px}
    .mark{flex:none;width:190px;height:190px;border-radius:38px;background:var(--blue);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
    .mark span{font-family:"Fira Sans",sans-serif;font-weight:600;color:var(--gold);font-size:134px;line-height:1;transform:translateY(7px)}
    .mark::after{content:"";position:absolute;left:0;right:0;bottom:0;height:12px;background:var(--gold)}
    .txt{min-width:0}
    h1{font-family:"Fira Sans",sans-serif;font-weight:600;font-size:${p.uk.length > 16 ? 70 : 84}px;line-height:1.08;margin:0 0 14px;letter-spacing:-.01em}
    .de{font-size:40px;font-weight:500;color:var(--blue);margin:0 0 26px}
    .site{font-size:26px;color:var(--muted);margin:0}
    .site b{color:var(--ink);font-weight:600}
  </style></head><body>
    <div class="flag"></div>
    <svg class="stitch" aria-hidden="true"><defs><pattern id="stitch-tile" width="16" height="7" patternUnits="userSpaceOnUse" patternTransform="scale(4)"></pattern></defs><rect width="100%" height="28" fill="url(#stitch-tile)"></rect></svg>
    <main>
      <div class="mark"><span>Ї</span></div>
      <div class="txt">
        <h1>${esc(p.uk)}</h1>
        <p class="de">${esc(p.page === 'index.html' ? 'Grammatik · Smalltalk · Tippen' : p.title)}</p>
        <p class="site"><b>${esc(cfg.site)}</b> · ${esc(cfg.baseUrl.replace(/^https:\/\//, '').replace(/\/$/, ''))}</p>
      </div>
    </main>
    <svg class="stitch" aria-hidden="true"><rect width="100%" height="28" fill="url(#stitch-tile)"></rect></svg>
    <script>${common}</script><script>UK.stitch();</script>
  </body></html>`;
}

/* .ico with embedded PNGs (supported by all current browsers) */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(([size, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p[1])]);
}

function metaBlock(p) {
  const up = '../'.repeat(p.page.split('/').length - 1);
  const url = p.page === 'index.html' ? cfg.baseUrl : cfg.baseUrl + p.page;
  const title = p.page === 'index.html' ? cfg.site : p.title + ' – ' + p.uk;
  return [
    '<!-- preview: generated by tools/previews.js from tools/previews.json -->',
    `<meta name="description" content="${esc(p.description)}">`,
    `<meta name="theme-color" content="${cfg.themeColor}">`,
    `<link rel="icon" href="${up}favicon.ico" sizes="16x16 32x32 48x48">`,
    `<link rel="icon" href="${up}assets/icons/favicon-32.png" type="image/png" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="${up}assets/icons/apple-touch-icon.png">`,
    `<link rel="manifest" href="${up}site.webmanifest">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(cfg.site)}">`,
    '<meta property="og:locale" content="de_DE">',
    '<meta property="og:locale:alternate" content="en_GB">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${cfg.baseUrl}assets/preview/${p.image}.png">`,
    '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(p.uk + ' – ' + (p.page === 'index.html' ? cfg.site : p.title))}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<!-- /preview -->'
  ].join('\n');
}

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  const shot = async (html, w, h, transparent) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
  };

  /* icons */
  const dir = path.join(ROOT, 'assets/icons'); fs.mkdirSync(dir, { recursive: true });
  for (const [file, size, rounded] of [['icon-512.png', 512, false], ['icon-192.png', 192, false], ['apple-touch-icon.png', 180, false], ['favicon-32.png', 32, true]])
    fs.writeFileSync(path.join(dir, file), await shot(iconHtml(size, rounded), size, size, rounded));
  const small = [];
  for (const s of [16, 32, 48]) small.push([s, await shot(iconHtml(s, true), s, s, true)]);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico(small));

  /* manifest */
  fs.writeFileSync(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
    name: cfg.site, short_name: 'Ukrainisch', lang: 'de', start_url: './', scope: './', display: 'standalone',
    background_color: '#f5f4ef', theme_color: cfg.themeColor,
    icons: [
      { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n');

  /* preview images and meta tags */
  const pdir = path.join(ROOT, 'assets/preview'); fs.mkdirSync(pdir, { recursive: true });
  for (const p of cfg.pages) {
    fs.writeFileSync(path.join(pdir, p.image + '.png'), await shot(previewHtml(p), 1200, 630));
    const file = path.join(ROOT, p.page);
    let s = fs.readFileSync(file, 'utf8');
    const block = metaBlock(p), re = /<!-- preview[\s\S]*?<!-- \/preview -->/;
    if (re.test(s)) s = s.replace(re, block);
    else { const m = /<title>[^<]*<\/title>\n/.exec(s); if (!m) throw new Error('no <title> in ' + p.page); s = s.replace(m[0], m[0] + block + '\n'); }
    fs.writeFileSync(file, s);
    console.log('✓', p.page);
  }
  await b.close();
})();
