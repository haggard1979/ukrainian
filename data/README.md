# Übungsdaten

Alle Inhalte der Trainer liegen als JSON in diesem Ordner, eine Datei pro Seite. Die Seiten laden sie beim Start mit
`UK.loadData('../../data/<name>.json', …)` (siehe `assets/common.js`). Die Dateien sind so aufgebaut, dass sie später
unverändert von einem REST-Service ausgeliefert werden können, z. B. `GET /api/exercises/genitive`. Dafür muss in der
jeweiligen Seite nur die URL in `UK.loadData()` geändert werden.

In den Seiten bleiben nur die Oberflächentexte (`T`), der Inhalt des Regeln-Tabs und technische Konstanten
(Tastaturlayout, Schwierigkeitsstufen).

## Gemeinsame Konventionen

- Zeichensatz UTF-8, ukrainischer Apostroph immer `’` (U+2019).
- Texte in zwei Sprachen stehen als Objekt `{"de": "…", "en": "…"}`. Leere optionale Texte sind `""`.
- Eine Lücke im Satz ist `___` (genau eine pro Satz).
- `rules`: `{"<key>": {"title": {"de","en"}, "text": {"de","en"}}}`. Andere Datensätze verweisen über `rule` auf einen Key.
- `categories` / `topics`: `[{"id": "…", "label": {"de","en"}}]`.
- Geprüft wird alles mit `node tests/check-data.js` (läuft auch in `node tests/run.js`).

## Dateien

| Datei | Seite | Inhalt |
|---|---|---|
| `locative.json` | Lokativ | `rules`, `categories`, `items`, `prepositions`, `reverse` |
| `accusative.json` | Akkusativ | `rules`, `categories`, `items`, `direction`, `reverse` |
| `genitive.json` | Genitiv | `rules`, `categories`, `items`, `nominativeOrGenitive`, `reverse` |
| `gender.json` | Genus | `rules`, `trickyRules`, `nouns`, `plurals`, `adjectives` |
| `comparison.json` | Komparativ & Superlativ | `rules`, `categories`, `adjectives`, `items`, `stages`, `constructions`, `reverse` |
| `pronouns.json` | Personalpronomen | `cases`, `pronouns`, `items`, `reverse` |
| `present.json` | Präsens | `rules`, `categories`, `verbs`, `altForms`, `items`, `reverse` |
| `past.json` | Vergangenheit | `rules`, `categories`, `verbs`, `altForms`, `items`, `reverse` |
| `numbers.json` | Zahlen | Wortlisten für den Zahlen-Generator |
| `counting.json` | Zahl + Nomen | `numerals`, `topics`, `nouns` |
| `ordinals.json` | Ordnungszahlen | `cases`, `cardinals`, `stems`, `thousandStems`, `stemVariants`, `endings`, `softStems`, `nouns`, `items` |
| `time.json` | Uhrzeiten | Wortlisten für den Uhrzeit-Generator |
| `dates.json` | Datum | Wochentage, Monate, Ordnungszahl-Stämme, Grundzahlen |
| `when.json` | Zeitangaben | `topics`, `phrases`, `timelines` |
| `smalltalk.json` | Smalltalk | `topics`, `phrases`, `replies` |
| `pronunciation.json` | Aussprache | `letters`, `topics`, `words`, `pairs` |
| `listening.json` | Hören | `topics`, `items` |
| `games.json` | Spiele (alle vier Spielseiten) | `topics`, `words` |
| `typing.json` | Tippen | `sentences`, `words` |

### Fall-Trainer (`locative`, `accusative`, `genitive`)

`items` – „Form tippen“ / „Form auswählen“:

| Feld | Bedeutung |
|---|---|
| `category` | Wortart, Key aus `categories` (`f`, `m`, `n`, `pl`, `adj`, `pron`) |
| `base` | Grundform (Nominativ) |
| `gloss` | Bedeutung `{de, en}` |
| `sentence` | Satz mit `___` |
| `translation` | Übersetzung `{de, en}` |
| `answers` | richtige Formen, erste = Hauptlösung |
| `distractors` | 3 falsche Formen für die Auswahl |
| `rule` | Key aus `rules` |
| `note` | Hinweis zu diesem Satz `{de, en}` |

`reverse` – „Grundform bestimmen“ (eigene Wortliste): `category`, `gender` (`m`/`f`/`n`/`pl`), `base`, `gloss`,
`sentence`, `form` (die Form in der Lücke), `translation`, `rule`, `note`.

Gegenüberstellung (je Seite eine Liste):

- `prepositions` (Lokativ, „в oder на?“): `sentence`, `preposition` (`в`/`у`/`на`), `translation`, `reason`.
- `direction` (Akkusativ, „Wohin oder wo?“): `sentence`, `base`, `accusative`, `locative`, `answer` (`akk`/`lok`),
  `translation`, `reason`, `gloss`.
- `nominativeOrGenitive` (Genitiv): `sentence`, `base`, `nominative`, `genitive`, `answer` (`nom`/`gen`),
  `translation`, `reason`, `gloss`.

### Genus (`gender`)

- `nouns`: `word`, `gender` (`m`/`f`/`n`/`pl` = nur Plural), `german` (mit Artikel – daraus wird ein abweichendes
  deutsches Genus erkannt), `english`, `rule`, `kind` (`p` Person, `a` Tier, `t` Gegenstand, `x` abstrakt), `note`.
- `plurals`: normale Plurale nur für die Adjektiv-Übungen: `word`, `german`, `english`, `kind`.
- `adjectives`: `masculine`, `feminine`, `neuter`, `plural`, `gloss`, `combines` (`any`; `col` = nur Gegenstände und
  Tiere; `thing` = nur Gegenstände), `rule`.
- `trickyRules`: Regel-Keys, deren Wörter unter „Nur Knackpunkte“ fallen.

### Komparativ und Superlativ (`comparison`)

- `categories`: `reg` (-іший), `sh` (-ший / Lautwechsel), `irr` (unregelmäßig), `an` (більш / менш), `adv` (Adverbien).
- `adjectives`: Formentabelle für den Tab „Formen“: `base`, `comp`, `sup` (immer `най` + `comp`), `category`, `gloss`, `note`; Adverbien mit `category: "adv"`.
- `items` – Form tippen / auswählen: `category`, `base`, `gloss`, `degree` (`comp`/`sup`), `sentence` (mit `___`), `translation`, `answers`
  (erste = Hauptlösung, gebeugt passend zum Satz; analytische Varianten erlaubt), `distractors` (3 sicher falsche Formen), `rule`, `note`.
- `stages` – „Welche Stufe?“: `sentence`, `form` (kommt im Satz vor), `base`, `answer` (`pos`/`comp`/`sup`), `translation`, `reason`.
- `constructions` – Vergleichswort: `sentence` (mit `___`), `compared` (Nominativ des Verglichenen), `answers` (genau drei: `за` + Akk., `від` + Gen., `ніж` + Nom.), `translation`, `reason`.
- `reverse` – Grundform bestimmen (eigene Sätze): `sentence`, `form`, `bases` (akzeptierte Grundformen), `degree`, `translation`, `rule`.

### Personalpronomen (`pronouns`)

- `cases`: `id` (`nom`, `gen`, `dat`, `acc`, `ins`, `loc`), `label` `{de, en}`, `uk` (ukrainischer Name), `question` `{de, en}`.
- `pronouns`: `base` (я, ти, він …), `gloss`, `forms` (je Fall), `afterPreposition` (н-Formen nach Präpositionen, nur wo
  sie abweichen: він/воно/вона/вони in Genitiv, Akkusativ, Lokativ).
- `items` – Form tippen / auswählen / Fall bestimmen: `pronoun`, `case`, `sentence` (mit `___`), `answers` (erste =
  Hauptlösung; muss eine Form des Pronomens in diesem Fall sein), `translation`, `reason` (warum dieser Fall/diese Form).
- `reverse` – Pronomen bestimmen (eigene Sätze): `pronoun`, `case`, `sentence`, `form`, `translation`.

### Verben (`present`, `past`)

- `verbs`: `infinitive`, `group` (Key aus `categories`), `conjugation` (nur Präsens: `1`, `2`, `0` = unregelmäßig),
  `rule`, `gloss`, `forms` (Präsens: я, ти, він/вона, ми, ви, вони; Vergangenheit: m, f, n, Plural), `note`,
  `altInfinitives` (nur Präsens, optional: weitere akzeptierte Infinitive).
- `altForms`: `{"<Infinitiv>": [weitere akzeptierte Formen]}`.
- `items` / `reverse`: `infinitive`, `person` (Präsens, 0–5) bzw. `form` (Vergangenheit, 0–3), `sentence`,
  `translation`; Vergangenheit zusätzlich `who` (`я:m`, `я:f`, `ти:m`, `ти:f` – Geschlechtshinweis).

### Vokabeln (`when`, `smalltalk`)

- `phrases`: `topic` (Key aus `topics`), `uk`, `translation`, `register` (`i` informell, `f` formell, `""` beides),
  `variants` (weitere akzeptierte Schreibweisen), `note`.
- `replies` (Smalltalk, „Passende Antwort“): `question`, `answer` – beide verweisen auf `phrases[].uk`.
- `timelines` (Zeitangaben): `[{"id", "items": [{"uk", "translation"}]}]`.

### Generatoren (`numbers`, `time`, `dates`)

Wortlisten, aus denen die Seiten die Lösungen erzeugen (die Logik bleibt in der Seite):

- `numbers`: `units`, `unitsFeminine`, `teens`, `tens`, `hundreds` (Index = Ziffer), `thousand` / `million`
  (Formen für 1, 2–4, 5+).
- `time`: `hours.nominative` und `hours.locative` (Ordnungszahlen für die Stunden 1–23, Index = Stunde),
  `hours.accusative` und `hours.genitive` (1–12, für die Umgangssprache), `numbers.unitsFeminine|teens|tens` (Minuten).
- `dates`: `weekdays` (`uk`, `acc`, `g`, `de`, `en`), `months` (`uk`, `loc`, `gen`, `de`, `en`, Herkunft `ode`/`oen`),
  `ordinalStems`, `ordinalEndings`, `cardinals`.

### Zahl + Nomen (`counting`)

- `numerals`: `unitsMasculine`, `unitsFeminine`, `unitsNeuter` (1 und 2 im Genus: один/одна/одне, два/дві), `teens`, `tens`,
  `hundreds` (Index = Ziffer), `thousand` (Formen für 1, 2–4, 5+).
- `nouns`: `topic` (Key aus `topics`), `singular` (nach 1), `plural` (nach 2–4), `genitivePlural` (nach 0, 5–20 …),
  `gender` (`m`/`f`/`n`, bestimmt das Zahlwort), `gloss` `{de: {singular, plural}, en: {singular, plural}}`, `note`.

### Ordnungszahlen (`ordinals`)

- `cardinals`: Grundzahlen für die Wörter vor dem letzten Element (wie `numbers.json`).
- `stems`: Stamm der Ordnungszahl je Wert (1–19, 20, 30 … 90, 100 … 900). Zusammengesetzte Zahlen entstehen im Code:
  21 = Grundzahl „двадцять“ + Stamm von 1. `thousandStems`: runde Tausender als ein Wort (`"2": "двотисячн"`);
  `stemVariants`: weitere akzeptierte Stämme (`двохтисячн`).
- `endings`: `hard` / `soft` → Genus (`m`, `f`, `n`, `pl`) → Fall (`nom`, `gen`, `dat`, `acc`, `ins`, `loc`) → Liste von Endungen,
  erste = Hauptendung. `acc` ist die unbelebte Form; belebte Maskulina/Plural nehmen im Generator die Genitiv-Endung.
  `softStems`: Stämme mit weicher Endung (nur `трет`).
- `nouns`: `word`, `gender` (`m`/`f`/`n`), `gloss` – Nomen für „Zahl → Ordnungszahl“ (das Genus bestimmt die Endung).
- `items`: Sätze für „Form auswählen/tippen“: `number`, `case`, `gender` (`m`/`f`/`n`/`pl`), `animate` (für Akkusativ),
  `sentence` (mit `___`), `answers` (erste = Hauptlösung; im Test gegen den Generator geprüft), `translation`, `reason`.

### Aussprache (`pronunciation`)

- `letters`: 33 Buchstaben – `upper`, `lower`, `name` (Buchstabenname), `trap` (sieht aus wie ein lateinischer Buchstabe,
  klingt anders), `sound` `{de, en}` (Lautbeschreibung), `example` (`word`, `stressed` mit Betonungszeichen U+0301, `gloss`).
- `topics`: `id`, `label`, `tip` `{de, en}` (Hinweis bei Fehlern, auch der „Tipp“-Knopf).
- `words`: `topic`, `word`, `stressed`, `gloss`, `variants` (weitere Schreibweisen, die die Spracherkennung liefern kann, z. B. Ziffern `3`).
- `pairs`: Minimalpaare für „Hören & Auswählen“: `a`, `b` (`word`, `gloss`), `tip`.

### Hören (`listening`)

- `topics`: `id`, `label`.
- `items`: `topic`, `uk` (Text; Dialogzeilen mit `\n` getrennt, Zeilen beginnen mit „— “), `translation` `{de, en}` (ebenso zeilenweise),
  `gap` (Wort für das Lückendiktat; kommt genau einmal im Text vor), `gapVariants` (weitere akzeptierte Schreibweisen, z. B. Ziffern),
  `question` `{de, en}`, `answer` `{de, en}` (richtige Antwort), `wrong` (3 falsche Antworten `{de, en}`).
  Dialoge (mehrere Zeilen) kommen im Satzdiktat nicht vor.

### Spiele (`games`)

- `topics`: `id`, `label`.
- `words`: `topic`, `word` (ein Wort, Kleinbuchstaben, Apostroph `’`), `gloss` `{de, en}` (deutsch mit Artikel). Glossen sind eindeutig,
  je Thema mindestens 8 Wörter. Wortraten nutzt Wörter mit 4–10 Buchstaben, Buchstabensalat 4–9 ohne Apostroph, Wortsuche 3–8 (leicht) bzw. 3–10 ohne Apostroph, Memory alle.

### Tippen (`typing`)

`sentences`: `uk`, `translation`; `words`: Wortliste für die Wort-Übungen.
