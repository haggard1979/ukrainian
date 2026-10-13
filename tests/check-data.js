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
  if (D.items && D.items[0] && 'distractors' in D.items[0] && !D.stages) {
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
  if (D.phrases && !D.cases) {
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
  if (D.nouns && D.adjectives) {   // gender trainer
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

  /* personal pronouns */
  if (D.pronouns) {
    const caseIds = new Set((D.cases || []).map(c => c.id));
    (D.cases || []).forEach(c => { both(c.label, 'cases: label', c.id); both(c.question, 'cases: question', c.id); if (!c.uk) p('cases: Ukrainian name missing:', c.id); });
    const P = new Map(D.pronouns.map(x => [x.base, x]));
    D.pronouns.forEach(x => {
      both(x.gloss, 'pronouns: gloss', x.base);
      caseIds.forEach(c => { if (!x.forms[c]) p('pronouns: form missing', x.base, c); });
      Object.keys(x.afterPreposition || {}).forEach(c => { if (!caseIds.has(c)) p('pronouns: unknown case', c, x.base); });
    });
    const formsIn = (x, c) => [x.forms[c], (x.afterPreposition || {})[c]].filter(Boolean);
    for (const key of ['items', 'reverse']) (D[key] || []).forEach(r => {
      const x = P.get(r.pronoun), form = key === 'items' ? (r.answers || [])[0] : r.form;
      if (!x) { p(key + ': unknown pronoun', r.pronoun, r.sentence); return; }
      if (!caseIds.has(r.case) || r.case === 'nom') p(key + ': case must be gen/dat/acc/ins/loc:', r.sentence);
      if (gaps(r.sentence) !== 1) p(key + ': needs exactly one ___:', r.sentence);
      if (!formsIn(x, r.case).includes(form)) p(key + ': form', form, 'is not', r.pronoun, 'in case', r.case + ':', r.sentence);
      both(r.translation, key + ': translation', r.sentence);
      if (key === 'items') both(r.reason, 'items: reason', r.sentence);
    });
    if (D.items && D.reverse) {
      dup(D.items, r => r.sentence, 'items sentence'); dup(D.reverse, r => r.sentence, 'reverse sentence');
      const s = new Set(D.items.map(r => r.sentence));
      D.reverse.forEach(r => { if (s.has(r.sentence)) p('reverse sentence also in items:', r.sentence); });
    }
  }

  /* numbers + nouns */
  if (D.numerals && D.nouns) {
    const nm = D.numerals;
    for (const k of ['unitsMasculine', 'unitsFeminine', 'unitsNeuter', 'teens', 'tens', 'hundreds']) if (!Array.isArray(nm[k]) || nm[k].length !== 10) p('numerals:', k, 'needs 10 entries');
    if (!Array.isArray(nm.thousand) || nm.thousand.length !== 3) p('numerals: thousand needs 3 forms');
    const topics = new Set((D.topics || []).map(x => x.id));
    dup(D.nouns, x => x.singular, 'noun');
    D.nouns.forEach(x => {
      if (!topics.has(x.topic)) p('nouns: unknown topic', x.topic, x.singular);
      if (!['m', 'f', 'n'].includes(x.gender)) p('nouns: gender must be m/f/n:', x.singular);
      if (new Set([x.singular, x.plural, x.genitivePlural]).size !== 3) p('nouns: the three forms must differ:', x.singular);
      for (const l of ['de', 'en']) if (!x.gloss || !x.gloss[l] || !x.gloss[l].singular || !x.gloss[l].plural) p('nouns: gloss', l, 'needs singular and plural:', x.singular);
      pair(x.note, 'nouns: note', x.singular);
    });
  }

  /* ordinal numbers */
  if (D.stems && D.endings) {
    const need = [...Array(19).keys()].map(i => i + 1).concat([20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
    need.forEach(k => { if (!D.stems[k]) p('stems: missing', k); });
    Object.keys(D.thousandStems).forEach(k => { if (!/тисячн$/.test(D.thousandStems[k])) p('thousandStems:', k, 'must end in тисячн'); });
    for (const type of ['hard', 'soft']) for (const g of ['m', 'f', 'n', 'pl']) for (const c of ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'])
      if (!D.endings[type] || !D.endings[type][g] || !D.endings[type][g][c] || !D.endings[type][g][c].length) p('endings: missing', type, g, c);
    (D.softStems || []).forEach(s => { if (!Object.values(D.stems).includes(s)) p('softStems: unknown stem', s); });
    const caseIds = new Set((D.cases || []).map(c => c.id));
    (D.nouns || []).forEach(x => {
      if (!['m', 'f', 'n'].includes(x.gender)) p('nouns: gender must be m/f/n:', x.word);
      both(x.gloss, 'nouns: gloss', x.word);
    });
    dup(D.nouns || [], x => x.word, 'noun');
    (D.items || []).forEach(r => {
      if (!Number.isInteger(r.number) || r.number < 1 || r.number > 9999) p('items: number must be 1–9999:', r.sentence);
      if (!caseIds.has(r.case)) p('items: unknown case', r.case, r.sentence);
      if (!['m', 'f', 'n', 'pl'].includes(r.gender)) p('items: gender must be m/f/n/pl:', r.sentence);
      if (gaps(r.sentence) !== 1) p('items: needs exactly one ___:', r.sentence);
      if (!Array.isArray(r.answers) || !r.answers.length) p('items: no answer:', r.sentence);
      both(r.translation, 'items: translation', r.sentence); both(r.reason, 'items: reason', r.sentence);
    });
    dup(D.items || [], r => r.sentence, 'items sentence');
    /* the answers themselves are checked against the generator in tests/pages/ordinals.test.js */
  }

  /* comparative / superlative trainer */
  if (D.adjectives && D.stages) {
    const catIds = new Set(D.categories.map(c => c.id)), bases = new Map(D.adjectives.map(x => [x.base + ':' + x.category, x]));
    D.adjectives.forEach(x => {
      both(x.gloss, 'adjectives: gloss', x.base);
      if (x.sup !== 'най' + x.comp) p('adjectives: superlative must be най + comparative:', x.base, x.comp, x.sup);
      if (!catIds.has(x.category)) p('adjectives: unknown category', x.category, x.base);
      pair(x.note, 'adjectives: note', x.base);
    });
    dup(D.adjectives, x => x.base + ':' + x.category, 'adjective');
    D.items.forEach(r => {
      const id = r.sentence;
      if (gaps(r.sentence) !== 1) p('items: need exactly one gap:', id);
      if (!catIds.has(r.category)) p('items: unknown category', r.category, id);
      if (!['comp', 'sup'].includes(r.degree)) p('items: degree must be comp or sup:', id);
      ruleOk(r.rule, id); both(r.translation, 'items: translation', id); both(r.gloss, 'items: gloss', id); pair(r.note, 'items: note', id);
      if (!Array.isArray(r.answers) || !r.answers.length) p('items: no answer:', id);
      if (!Array.isArray(r.distractors) || r.distractors.length !== 3) p('items: need exactly 3 distractors:', id);
      else if (r.distractors.some(d => r.answers.includes(d)) || new Set(r.distractors).size !== 3) p('items: distractors must be wrong and distinct:', id);
      /* the answer must start with the stem of the form in the table (analytic answers are skipped) */
      const e = bases.get(r.base + ':' + (r.category === 'an' ? 'an' : r.category)) || D.adjectives.find(x => x.base === r.base);
      if (e && r.category !== 'an' && r.category !== 'adv') {
        const form = e[r.degree], stem = form.replace(/ий$/, '');
        if (!r.answers[0].startsWith(stem)) p('items: answer does not match the table form', r.answers[0], '/', form, '/', id);
      }
      if (e && r.category === 'adv' && !r.answers.includes(e[r.degree])) p('items: adverb answer must be the table form', r.answers[0], '/', e[r.degree], '/', id);
    });
    dup(D.items, r => r.degree + ':' + r.base + ':' + r.answers[0] + ':' + r.sentence, 'item');
    D.stages.forEach(r => {
      if (!r.sentence.includes(r.form)) p('stages: form not in sentence:', r.form, '/', r.sentence);
      if (!['pos', 'comp', 'sup'].includes(r.answer)) p('stages: answer must be pos, comp or sup:', r.sentence);
      both(r.translation, 'stages: translation', r.sentence); both(r.reason, 'stages: reason', r.sentence);
    });
    dup(D.stages, r => r.sentence, 'stage sentence');
    D.constructions.forEach(r => {
      if (gaps(r.sentence) !== 1) p('constructions: need exactly one gap:', r.sentence);
      if (!Array.isArray(r.answers) || r.answers.length !== 3 || !/^за /.test(r.answers[0]) || !/^від /.test(r.answers[1]) || !/^ніж /.test(r.answers[2])) p('constructions: answers must be за…, від…, ніж…:', r.sentence);
      both(r.translation, 'constructions: translation', r.sentence); both(r.reason, 'constructions: reason', r.sentence);
    });
    dup(D.constructions, r => r.sentence, 'construction sentence');
    D.reverse.forEach(r => {
      if (!r.sentence.includes(r.form)) p('reverse: form not in sentence:', r.form, '/', r.sentence);
      if (!Array.isArray(r.bases) || !r.bases.length) p('reverse: no base:', r.sentence);
      if (!['comp', 'sup'].includes(r.degree)) p('reverse: degree must be comp or sup:', r.sentence);
      r.bases.forEach(b => { if (!D.adjectives.some(x => x.base === b)) p('reverse: base not in the adjective table:', b); });
      ruleOk(r.rule, r.sentence); both(r.translation, 'reverse: translation', r.sentence);
    });
    dup(D.reverse, r => r.sentence, 'reverse sentence');
    const itemSent = new Set(D.items.map(r => r.sentence.replace('___', r.answers[0])));
    D.reverse.forEach(r => { if (itemSent.has(r.sentence)) p('reverse sentence also used in the typing exercises:', r.sentence); });
  }

  /* case domino */
  if (D.cases && D.phrases && D.phrases[0] && D.phrases[0].prep) {
    const caseIds = new Set(D.cases.map(c => c.id)), prepCase = {}, nouns = new Map((D.nouns || []).map(n => [n.base, n]));
    D.cases.forEach(c => { both(c.name, 'cases: name', c.id); both(c.note, 'cases: note', c.id); c.preps.forEach(pr => { if (pr in prepCase) p('cases: preposition governs two cases:', pr); prepCase[pr] = c.id; }); });
    dup(D.nouns || [], n => n.base, 'domino noun');
    (D.nouns || []).forEach(n => { for (const c of ['gen', 'acc', 'ins', 'loc', 'dat']) if (!Array.isArray(n.forms[c]) || !n.forms[c].length) p('nouns: missing form', n.base, c); });
    D.phrases.forEach(r => {
      const id = r.prep + ' ' + r.form;
      if (!caseIds.has(r.case)) p('phrases: unknown case', r.case, id);
      if (prepCase[r.prep] !== r.case) p('phrases: preposition does not govern this case:', id, r.case);
      const n = nouns.get(r.noun);
      if (!n) p('phrases: unknown noun', r.noun, id);
      else if (!n.forms[r.case].includes(r.form)) p('phrases: form is not in the paradigm of', r.noun, r.case, r.form);
      if (/\s/.test(r.form)) p('phrases: form must be one word:', id);
      both(r.translation, 'phrases: translation', id);
    });
    dup(D.phrases, r => r.prep + ' ' + r.form, 'phrase');
    D.cases.forEach(c => { if (D.phrases.filter(r => r.case === c.id).length < 5) p('phrases: at least 5 per case needed:', c.id); });
  }

  /* word games */
  if (D.words && D.words[0] && D.words[0].topic && !D.letters) {
    const tids = new Set(D.topics.map(x => x.id)), per = {};
    D.words.forEach(w => {
      if (!tids.has(w.topic)) p('games: unknown topic', w.topic, w.word);
      per[w.topic] = (per[w.topic] || 0) + 1;
      both(w.gloss, 'games: gloss', w.word);
      if (/\s/.test(w.word)) p('games: word must be a single word:', w.word);
      if (w.word !== w.word.toLowerCase()) p('games: word must be lower case:', w.word);
    });
    dup(D.words.filter(w => w.emoji), w => w.emoji, 'games emoji');
    D.words.forEach(w => { if (w.emoji !== undefined && !/\p{Extended_Pictographic}|[\u{1F7E0}-\u{1F7EB}]/u.test(w.emoji)) p('games: emoji is not an emoji:', w.word, w.emoji); });
    dup(D.words, w => w.word, 'games word'); dup(D.words, w => w.gloss.de, 'games gloss (de)'); dup(D.words, w => w.gloss.en, 'games gloss (en)');
    tids.forEach(id => { if ((per[id] || 0) < 8) p('games: topic needs at least 8 words:', id); });
  }

  /* listening trainer */
  if (D.items && D.items[0] && D.items[0].wrong) {
    const tids = new Set(D.topics.map(x => x.id));
    D.items.forEach(r => {
      if (!tids.has(r.topic)) p('listening: unknown topic', r.topic, r.uk);
      both(r.translation, 'listening: translation', r.uk); both(r.question, 'listening: question', r.uk); both(r.answer, 'listening: answer', r.uk);
      if (!Array.isArray(r.wrong) || r.wrong.length !== 3) p('listening: need exactly 3 wrong answers:', r.uk);
      else r.wrong.forEach(w => both(w, 'listening: wrong answer', r.uk));
      const texts = [r.answer.de, ...(r.wrong || []).map(w => w.de)];
      if (new Set(texts).size !== texts.length) p('listening: duplicate answer options:', r.uk);
      const words = r.uk.split(/[\s—,.?!:]+/).filter(Boolean);
      if (words.filter(w => w === r.gap).length !== 1) p('listening: gap word must occur exactly once:', r.gap, '/', r.uk);
      if (r.translation.de.split('\n').length !== r.uk.split('\n').length || r.translation.en.split('\n').length !== r.uk.split('\n').length) p('listening: translation lines differ from text lines:', r.uk);
    });
    dup(D.items, r => r.uk, 'listening text');
  }

  /* typing trainer */
  if (D.sentences) D.sentences.forEach(s => both(s.translation, 'sentences: translation', s.uk));
  if (D.words && typeof D.words[0] === 'string') dup(D.words, w => w, 'word');

  /* pronunciation trainer */
  if (D.letters) {
    const tids = new Set((D.topics || []).map(x => x.id));
    D.topics.forEach(x => both(x.tip, 'topic tip', x.id));
    if (D.letters.length !== 33) p('letters: expected 33, got', D.letters.length);
    D.letters.forEach(l => {
      both(l.sound, 'letters: sound', l.upper); both(l.example && l.example.gloss, 'letters: example gloss', l.upper);
      if (l.example && l.example.stressed.replace(/\u0301/g, '') !== l.example.word) p('letters: stressed differs from word:', l.example.word);
    });
    dup(D.letters, l => l.upper, 'letter');
    D.words.forEach(w => {
      if (!tids.has(w.topic)) p('words: unknown topic', w.topic, w.word);
      both(w.gloss, 'words: gloss', w.word);
      if (w.stressed.replace(/\u0301/g, '') !== w.word) p('words: stressed differs from word:', w.word);
      if (!/\u0301/.test(w.stressed) && !/^[^аеєиіїоуюя]*[аеєиіїоуюя][^аеєиіїоуюя]*$/i.test(w.word)) p('words: stress mark missing:', w.word);
    });
    dup(D.words, w => w.word, 'word');
    D.pairs.forEach(x => { both(x.tip, 'pairs: tip', x.a.word); both(x.a.gloss, 'pairs: gloss', x.a.word); both(x.b.gloss, 'pairs: gloss', x.b.word); if (x.a.word === x.b.word) p('pairs: identical words', x.a.word); });
  }

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
