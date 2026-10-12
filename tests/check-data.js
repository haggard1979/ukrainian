/* Static check of the exercise data in data/*.json (no browser needed).
   Usage: node tests/check-data.js [data/<name>.json …]      (default: all files in data/)
   Checks what applies to the file's structure (see data/README.md): required fields in German and English,
   exactly one gap ___, rule/category/topic keys exist, no duplicates, answer ≠ distractor, 3 distractors,
   own word list for "find the base form", replies refer to existing phrases, Ukrainian apostrophe ’,
   no Latin look-alike letters inside Cyrillic words. Also: every page's UK.loadData() file exists.
   Exit code 1 if a problem was found. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const CYR = /[Ѐ-ӿ]/, LAT = /[a-z]/i;

function ukStrings(v, acc = []) {
  if (typeof v === 'string') { if (CYR.test(v)) acc.push(v); }
  else if (Array.isArray(v)) v.forEach(x => ukStrings(x, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach(x => ukStrings(x, acc));
  return acc;
}

function checkFile(file) {
  const probs = [], p = (...a) => probs.push(a.join(' '));
  let D;
  try { D = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return { file, probs: ['invalid JSON: ' + e.message], found: '' }; }
  const dup = (arr, key, what) => { const s = new Set(); arr.forEach(r => { const k = key(r); if (s.has(k)) p('duplicate', what + ':', k); s.add(k); }); };
  const gaps = s => (String(s).match(/___/g) || []).length;
  const both = (o, what, id) => { if (!o || !o.de || !o.en) p(what, 'missing in German or English:', id); };
  const pair = (o, what, id) => { if (o && !!o.de !== !!o.en) p(what, 'only in one language:', id); };

  /* generic: Ukrainian apostrophe and Latin look-alikes inside Cyrillic words */
  for (const s of ukStrings(D)) {
    if (/[Ѐ-ӿ]['ʼ‘`][Ѐ-ӿ]/.test(s)) p('apostrophe must be ’:', s);
    for (const w of s.split(/[^Ѐ-ӿa-z’'ʼ]+/i)) if (CYR.test(w) && LAT.test(w)) p('mixed Latin/Cyrillic word:', w);
  }

  const rules = D.rules || null;
  if (rules) for (const [k, r] of Object.entries(rules)) { both(r.title, 'rule title', k); both(r.text, 'rule text', k); }
  const ruleOk = (k, id) => { if (rules && !(k in rules)) p('unknown rule', k, id); };
  const cats = D.categories ? new Set(D.categories.map(c => c.id)) : null;
  if (D.categories) D.categories.forEach(c => both(c.label, 'category label', c.id));
  if (D.topics) D.topics.forEach(c => both(c.label, 'topic label', c.id));

  /* case trainers: items, reverse and the contrast exercise */
  if (D.items && D.items[0] && 'distractors' in D.items[0]) {
    D.items.forEach(r => {
      const id = r.base + ' | ' + r.sentence;
      if (gaps(r.sentence) !== 1) p('items: needs exactly one ___:', id);
      if (cats && !cats.has(r.category)) p('items: unknown category', r.category, id);
      ruleOk(r.rule, id);
      if (!Array.isArray(r.answers) || !r.answers.length) p('items: no answer:', id);
      if (!Array.isArray(r.distractors) || r.distractors.length !== 3) p('items: needs 3 distractors:', id);
      else {
        r.distractors.forEach(d => { if (r.answers.includes(d)) p('items: distractor equals an answer:', d, id); });
        if (new Set(r.distractors).size !== 3) p('items: repeated distractor:', id);
      }
      both(r.gloss, 'items: gloss', id); both(r.translation, 'items: translation', id); pair(r.note, 'items: note', id);
    });
    dup(D.items, r => r.sentence + '|' + r.base, 'items sentence');
    if (D.reverse) {
      D.reverse.forEach(r => {
        const id = r.base + ' | ' + r.sentence;
        if (gaps(r.sentence) !== 1) p('reverse: needs exactly one ___:', id);
        if (cats && !cats.has(r.category)) p('reverse: unknown category', r.category, id);
        if (!['m', 'f', 'n', 'pl'].includes(r.gender)) p('reverse: gender must be m/f/n/pl:', id);
        ruleOk(r.rule, id);
        both(r.gloss, 'reverse: gloss', id); both(r.translation, 'reverse: translation', id); pair(r.note, 'reverse: note', id);
      });
      dup(D.reverse, r => r.base, 'reverse base word');
      const train = new Set(D.items.map(r => r.base));
      D.reverse.forEach(r => { if (train.has(r.base)) p('reverse word also in items (needs its own list):', r.base); });
    }
    for (const key of ['prepositions', 'direction', 'nominativeOrGenitive']) if (D[key]) {
      D[key].forEach(r => {
        if (gaps(r.sentence) !== 1) p(key + ': needs exactly one ___:', r.sentence);
        both(r.translation, key + ': translation', r.sentence); both(r.reason, key + ': reason', r.sentence);
        if (key === 'prepositions' && !['в', 'у', 'на'].includes(r.preposition)) p(key + ': preposition must be в/у/на:', r.sentence);
        if (key === 'direction' && !['akk', 'lok'].includes(r.answer)) p(key + ': answer must be akk/lok:', r.sentence);
        if (key === 'nominativeOrGenitive' && !['nom', 'gen'].includes(r.answer)) p(key + ': answer must be nom/gen:', r.sentence);
      });
      dup(D[key], r => r.sentence + '|' + (r.base || ''), key + ' sentence');
    }
  }

  /* verb trainers */
  if (D.verbs) {
    const n = D.verbs[0].forms.length;
    dup(D.verbs, v => v.infinitive, 'verb');
    D.verbs.forEach(v => {
      if (v.forms.length !== n) p('verbs: wrong number of forms:', v.infinitive);
      if (cats && !cats.has(v.group)) p('verbs: unknown group', v.group, v.infinitive);
      ruleOk(v.rule, v.infinitive); both(v.gloss, 'verbs: gloss', v.infinitive); pair(v.note, 'verbs: note', v.infinitive);
    });
    const known = new Set(D.verbs.map(v => v.infinitive));
    for (const key of ['items', 'reverse']) (D[key] || []).forEach(r => {
      const pos = 'person' in r ? r.person : r.form;
      if (!known.has(r.infinitive)) p(key + ': unknown verb', r.infinitive);
      if (gaps(r.sentence) !== 1) p(key + ': needs exactly one ___:', r.sentence);
      if (!(pos >= 0 && pos < n)) p(key + ': person/form out of range:', r.sentence);
      both(r.translation, key + ': translation', r.sentence);
    });
    if (D.items && D.reverse) {
      const s = new Set(D.items.map(r => r.sentence));
      D.reverse.forEach(r => { if (s.has(r.sentence)) p('reverse sentence also in items:', r.sentence); });
    }
  }

  /* vocabulary trainers */
  if (D.phrases) {
    const topics = D.topics ? new Set(D.topics.map(t => t.id)) : null;
    D.phrases.forEach(r => {
      if (topics && !topics.has(r.topic)) p('phrases: unknown topic', r.topic, r.uk);
      if (!r.uk) p('phrases: Ukrainian text missing'); both(r.translation, 'phrases: translation', r.uk);
      if (!['i', 'f', ''].includes(r.register)) p('phrases: register must be i/f/empty:', r.uk);
      if (!Array.isArray(r.variants)) p('phrases: variants must be an array:', r.uk);
      else if (r.variants.includes(r.uk)) p('phrases: variant repeats the main form:', r.uk);
      pair(r.note, 'phrases: note', r.uk);
    });
    dup(D.phrases, r => r.uk, 'phrase');
    if (D.replies) {
      const known = new Set(D.phrases.map(r => r.uk));
      D.replies.forEach(r => { if (!known.has(r.question)) p('replies: unknown question:', r.question); if (!known.has(r.answer)) p('replies: unknown answer:', r.answer); });
    }
    if (D.timelines) D.timelines.forEach(l => l.items.forEach(i => both(i.translation, 'timeline ' + l.id, i.uk)));
  }

  /* gender trainer */
  if (D.nouns) {
    dup(D.nouns, n => n.word, 'noun');
    D.nouns.forEach(n => {
      if (!['m', 'f', 'n', 'pl'].includes(n.gender)) p('nouns: gender must be m/f/n/pl:', n.word);
      if (!['p', 'a', 't', 'x'].includes(n.kind)) p('nouns: kind must be p/a/t/x:', n.word);
      if (!n.german || !n.english) p('nouns: German or English missing:', n.word);
      ruleOk(n.rule, n.word); pair(n.note, 'nouns: note', n.word);
    });
    (D.trickyRules || []).forEach(k => ruleOk(k, 'trickyRules'));
    (D.plurals || []).forEach(n => { if (!['p', 'a', 't', 'x'].includes(n.kind)) p('plurals: kind must be p/a/t/x:', n.word); });
    (D.adjectives || []).forEach(a => {
      const f = [a.masculine, a.feminine, a.neuter, a.plural];
      if (new Set(f).size !== 4) p('adjectives: forms must differ:', a.masculine);
      if (!['any', 'col', 'thing'].includes(a.combines)) p('adjectives: combines must be any/col/thing:', a.masculine);
      ruleOk(a.rule, a.masculine); both(a.gloss, 'adjectives: gloss', a.masculine);
    });
  }

  /* typing trainer */
  if (D.sentences) D.sentences.forEach(s => both(s.translation, 'sentences: translation', s.uk));
  if (D.words) dup(D.words, w => w, 'word');

  const found = Object.keys(D).map(k => k + (Array.isArray(D[k]) ? '[' + D[k].length + ']' : '')).join(' ');
  return { file: path.relative(ROOT, file), probs, found };
}

/* every page that loads data points to an existing file, and every data file is used */
function checkLinks() {
  const probs = [], used = new Set();
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.name.startsWith('.') || e.name === 'tests' ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
  for (const page of walk(ROOT)) {
    const m = /UK\.loadData\('([^']+)'/.exec(fs.readFileSync(page, 'utf8')); if (!m) continue;
    const target = path.resolve(path.dirname(page), m[1]); used.add(target);
    if (!fs.existsSync(target)) probs.push(path.relative(ROOT, page) + ' loads missing ' + m[1]);
  }
  for (const f of dataFiles()) if (!used.has(f)) probs.push(path.relative(ROOT, f) + ' is not used by any page');
  return probs;
}
function dataFiles() { const d = path.join(ROOT, 'data'); return fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().map(f => path.join(d, f)); }

module.exports = { checkFile, checkLinks, dataFiles };

if (require.main === module) {
  const files = process.argv.slice(2).length ? process.argv.slice(2).map(f => path.resolve(f)) : dataFiles();
  let total = 0;
  for (const f of files) {
    const r = checkFile(f);
    console.log((r.probs.length ? '✗ ' : '✓ ') + r.file + '  (' + r.found + ')');
    r.probs.forEach(x => console.log('    ' + x));
    total += r.probs.length;
  }
  const links = checkLinks(); links.forEach(x => console.log('✗ ' + x)); total += links.length;
  process.exit(total ? 1 : 0);
}
