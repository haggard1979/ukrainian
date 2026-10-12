/* Static data check for a trainer page (no browser needed).
   Usage: node tests/check-data.js <page.html> [more pages …]
   Extracts the top-level data literals (var RAW=[…], RULES={…}, CATS, RAWP, RAWR, RAWV, RAWS, TOPICS, PAIRS …)
   from the inline <script> and checks what applies to the page type (see CLAUDE.md, "Seiten-Typen").
   Exit code 1 if a problem was found. Generator pages (numbers/time/dates) only get the generic checks;
   test their generators with Playwright via window.__<name>. */
const fs = require('fs');

function literals(src) {
  const out = {};
  const re = /^var ([A-Z][A-Z_]*)=([\[{])/gm;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length - 1, depth = 0, q = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') q = c;
      else if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') { if (--depth === 0) break; }
    }
    const text = src.slice(m.index + m[0].length - 1, i + 1);
    try { out[m[1]] = Function('"use strict";return (' + text + ')')(); } catch (e) { /* refers to other code: skip */ }
  }
  return out;
}

const CYR = /[Ѐ-ӿ]/, LAT = /[a-z]/i;
function ukStrings(v, acc = []) {
  if (typeof v === 'string') { if (CYR.test(v)) acc.push(v); }
  else if (Array.isArray(v)) v.forEach(x => ukStrings(x, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => ukStrings(x, acc));
  return acc;
}

function checkFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const src = (html.match(/<script>([\s\S]*?)<\/script>/g) || []).join('\n');
  const D = literals(src);
  const probs = [];
  const p = (...a) => probs.push(a.join(' '));
  const dup = (arr, key, what) => { const s = new Set(); arr.forEach(r => { const k = key(r); if (s.has(k)) p('duplicate', what + ':', k); s.add(k); }); };

  /* generic: Ukrainian apostrophe and Latin look-alikes inside Cyrillic words */
  for (const [name, v] of Object.entries(D)) for (const s of ukStrings(v)) {
    if (/[Ѐ-ӿ]['ʼ‘`][Ѐ-ӿ]/.test(s)) p(name, 'apostrophe must be ’:', s);
    for (const w of s.split(/[^Ѐ-ӿa-z’'ʼ]+/i)) if (CYR.test(w) && LAT.test(w)) p(name, 'mixed Latin/Cyrillic word:', w);
  }

  const catIds = D.CATS ? new Set(D.CATS.map(c => c.id)) : null;
  const ruleOk = k => (!D.RULES || k in D.RULES) && (!D.RULES_EN || k in D.RULES_EN);

  /* case trainer: RAW rows with 12 fields */
  if (D.RAW && D.RAW[0] && D.RAW[0].length === 12) {
    D.RAW.forEach(r => {
      const id = r[1] + ' | ' + r[3];
      if (r.length !== 12) p('RAW field count', r.length, id);
      if ((r[3].match(/___/g) || []).length !== 1) p('RAW needs exactly one ___:', id);
      if (catIds && !catIds.has(r[0])) p('RAW unknown cat', r[0], id);
      if (!ruleOk(r[7])) p('RAW unknown rule key', r[7], id);
      if (!Array.isArray(r[5]) || !r[5].length) p('RAW no solution:', id);
      if (!Array.isArray(r[6]) || r[6].length !== 3) p('RAW needs 3 distractors:', id);
      else r[6].forEach(d => { if (r[5].includes(d)) p('RAW distractor equals a solution:', d, id); });
      if (new Set(r[6]).size !== r[6].length) p('RAW repeated distractor:', id);
      if (!r[2] || !r[4] || !r[9] || !r[10]) p('RAW missing de/en text:', id);
      if (!!r[8] !== !!r[11]) p('RAW note only in one language:', id);
    });
    dup(D.RAW, r => r[3] + '|' + r[1], 'RAW sentence');
    if (D.RAWR) {
      D.RAWR.forEach(r => {
        if ((r[5].match(/___/g) || []).length !== 1) p('RAWR needs exactly one ___:', r[2]);
        if (catIds && !catIds.has(r[0])) p('RAWR unknown cat', r[0], r[2]);
        if (!ruleOk(r[9])) p('RAWR unknown rule key', r[9], r[2]);
        if (!!r[10] !== !!r[11]) p('RAWR note only in one language:', r[2]);
      });
      dup(D.RAWR, r => r[2], 'RAWR base word');
      const train = new Set(D.RAW.map(r => r[1]));
      D.RAWR.forEach(r => { if (train.has(r[2])) p('RAWR word also in RAW (rev needs its own list):', r[2]); });
    }
    if (D.RAWP) {
      D.RAWP.forEach(r => { if ((r[0].match(/___/g) || []).length !== 1) p('RAWP needs exactly one ___:', r[0]); });
      dup(D.RAWP, r => r[0], 'RAWP sentence');
    }
  }

  /* verb trainer: RAWV tables + RAW/RAWR sentences */
  if (D.RAWV) {
    dup(D.RAWV, r => JSON.stringify(r[0]), 'RAWV verb');
    for (const name of ['RAW', 'RAWR']) if (D[name]) D[name].forEach(r => {
      const s = r.find(x => typeof x === 'string' && x.includes('___'));
      if (!s || (s.match(/___/g) || []).length !== 1) p(name, 'needs exactly one ___:', JSON.stringify(r).slice(0, 80));
    });
    if (D.RAW && D.RAWR) {
      const key = r => r.find(x => typeof x === 'string' && x.includes('___'));
      const train = new Set(D.RAW.map(key));
      D.RAWR.forEach(r => { if (train.has(key(r))) p('RAWR sentence also in RAW:', key(r)); });
    }
  }

  /* vocabulary trainer: TOPICS + RAWS rows with 8 fields */
  if (D.RAWS) {
    const topics = D.TOPICS ? new Set(D.TOPICS.map(t => t.id)) : null;
    D.RAWS.forEach(r => {
      if (r.length !== 8) p('RAWS field count', r.length, r[1]);
      if (topics && !topics.has(r[0])) p('RAWS unknown topic', r[0], r[1]);
      if (!r[1] || !r[2] || !r[3]) p('RAWS missing uk/de/en:', r[1]);
      if (!['i', 'f', ''].includes(r[4])) p('RAWS register must be i/f/empty:', r[1]);
      if (!Array.isArray(r[5])) p('RAWS variants must be an array:', r[1]);
      else if (r[5].includes(r[1])) p('RAWS variant repeats the main form:', r[1]);
      if (!!r[6] !== !!r[7]) p('RAWS note only in one language:', r[1]);
    });
    dup(D.RAWS, r => r[1], 'RAWS phrase');
    if (D.PAIRS) {
      const known = new Set(D.RAWS.map(r => r[1]));
      D.PAIRS.forEach(([a, b]) => { if (!known.has(a)) p('PAIRS unknown question:', a); if (!known.has(b)) p('PAIRS unknown answer:', b); });
    }
  }

  /* rules / categories: both languages */
  if (D.RULES && D.RULES_EN) for (const k of Object.keys(D.RULES)) if (!(k in D.RULES_EN)) p('rule only in German:', k);
  for (const name of ['CATS', 'TOPICS']) if (D[name]) D[name].forEach(c => { if (!c.label || !c.en) p(name, 'label missing in de/en:', c.id); });

  const found = Object.keys(D).map(k => k + (Array.isArray(D[k]) ? '[' + D[k].length + ']' : '')).join(' ');
  return { file, probs, found };
}
module.exports = { checkFile };

if (require.main === module) {
  let total = 0;
  for (const file of process.argv.slice(2)) {
    const r = checkFile(file);
    console.log((r.probs.length ? '✗ ' : '✓ ') + file + '  (' + r.found + ')');
    r.probs.forEach(x => console.log('    ' + x));
    total += r.probs.length;
  }
  process.exit(total ? 1 : 0);
}
