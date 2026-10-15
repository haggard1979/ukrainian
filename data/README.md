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
- **Unsichere Einträge** bekommen ein Feld `"review": {"de": "…", "en": "…"}` mit dem konkreten Zweifel (z. B. „Wortwahl prüfen: тин?“).
  Erlaubt an jedem Datensatz, auch an verschachtelten (z. B. an einem einzelnen Wort eines Gemäldes). Die Trainer ignorieren das Feld;
  `data/index.html` zeigt alle Daten lesbar an, hebt diese Einträge hervor und listet sie oben auf. Nach der Prüfung durch
  Muttersprachler den Eintrag korrigieren und `review` entfernen.
- Geprüft wird alles mit `node tests/check-data.js` (läuft auch in `node tests/run.js`), u. a. dass `review` beide Sprachen hat und
  englische Texte keine deutschen Kopien sind.

## Dateien

`index.html` in diesem Ordner ist die Datenansicht (alle Dateien als Karten, Filter „Nur Bitte prüfen“, Suche) – neue Dateien dort in `FILES` eintragen.

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
| `domino.json` | Fall-Domino | `cases`, `nouns`, `phrases` |
| `mistakes.json` | Fehlerjagd | `topics`, `items` |
| `art.json` | Bilderraten | `artist`, `paintings` |
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
- `words`: `topic`, `word` (ein Wort, Kleinbuchstaben, Apostroph `’`), `gloss` `{de, en}` (deutsch mit Artikel), `emoji` (optional, für das Bilder-Memory; nur wo ein Emoji eindeutig passt, je Wort ein eigenes). Glossen sind eindeutig,
  je Thema mindestens 8 Wörter. Wortraten nutzt Wörter mit 4–10 Buchstaben, Buchstabensalat 4–9 ohne Apostroph, Wortsuche 3–8 (leicht) bzw. 3–10 ohne Apostroph, Memory alle.

### Fall-Domino (`domino`)

- `cases`: `id` (`gen`, `acc`, `ins`, `loc`, `dat`), `name` `{de, en}`, `uk`, `preps` (nur Präpositionen, die **genau einen** Fall verlangen), `note` `{de, en}` (Erklärung bei Fehlern).
- `nouns`: `base`, `forms` je Fall (Liste gültiger Formen, auch Varianten wie `брату` / `братові`) – daraus entscheidet das Spiel, ob ein Stein passt.
- `phrases`: `case`, `prep`, `noun`, `form` (muss in `nouns[noun].forms[case]` stehen), `translation` `{de, en}`. Mindestens 5 je Fall.
  Das Spiel verwirft Runden, in denen ein Stein auch für einen anderen Schritt passen würde (z. B. feminine Dativ = Lokativ).

### Fehlerjagd (`mistakes`)

- `topics`: `id`, `label` (`cases`, `gender`, `numbers`, `verbs`, `comparison`, `pronouns`).
- `items`: `topic`, `sentence` (der Satz **mit** dem Fehler), `index` (Position des falschen Worts, 0-basiert, Wörter durch Leerzeichen getrennt;
  Satzzeichen hängen am Wort), `wrong` (das falsche Wort ohne Satzzeichen – muss genau einmal im Satz vorkommen), `correct`, `options`
  (drei Formen, `correct` zuerst, alle verschieden), `translation` (des richtigen Satzes), `explanation` `{de, en}`.
  Genau ein Wort pro Satz ist falsch.

### Bilderraten (`art`)

- `artists`: Objekt `id` → `{name {de, en}, years}` (z. B. `1862–1912`; nur Künstler, die seit über 70 Jahren tot sind).
- `paintings`: `id`, `artist` (Schlüssel aus `artists`), `image` (Pfad ab Repo-Wurzel, `assets/art/<id>.jpg`, ≈ 900 px breit), `orient` (`landscape`/`portrait`), optional `year`, `title` `{uk, de, en}`,
  `source` (Commons-Seite der Datei – nur **gemeinfreie** Werke, Quelle und Lizenz dort prüfen), `alt` `{de, en}` (Bildbeschreibung),
  `correct` (mindestens 5 Wörter `{uk, de, en}`, die im Bild **deutlich** zu sehen sind), `wrong` (mindestens 3 Wörter, die **eindeutig nicht** im Bild vorkommen).
  Je Runde zieht die Seite 5 richtige + 3 falsche Wörter. Ein Wort darf nicht gleichzeitig in `correct` und `wrong` stehen.

### Stadtplan-Quiz (`city`)

- `size`: Gitter `{cols, rows}` des Stadtplans; `houses`: Felder mit Wohnhäusern (nur Deko), je `{col, row}`.
- `rules`: `na`, `v`, `case` (wann на, wann в/у, Lokativ vs. Akkusativ) – erscheinen im Feedback und im Regeln-Tab.
- `places`: `id`, `word`, `gloss` `{de, en}`, `emoji` (Bild auf dem Plan), `kind` (`building`/`open`), `prep` (`в` oder `на`),
  `where` (= `prep` + Lokativ, z. B. „на пошті“), `whither` (= `prep` + Akkusativ, „на пошту“), `to` (до + Genitiv, „до пошти“ – für „Як пройти до …?“),
  `col`/`row` (Feld, eindeutig), `note` `{de, en}`.
- `route`: Textbausteine der Wegbeschreibung, je `{uk, de, en}`: `go` / `goOn` (1, 2, 3 Häuserblöcke geradeaus / noch …), `turn.left|right`,
  `goal.left|right` (Ziel verborgen), `there.left|right` (mit Platzhaltern `{uk}`/`{de}`/`{en}` für den Ort), `ask` (`{to}`), `words` (Wortliste für die Regeln).
  Die Routen selbst erzeugt die Seite: Start an einer Kreuzung mit Blickrichtung, 1–3 Blöcke, optional abbiegen und 1–3 Blöcke, Ziel = Gebäude links/rechts des letzten Blocks.
  Präposition nach Vokal als „в“ (Я в школі, Я йду в школу); „у“ wird im Text erklärt.

### Wer bin ich? (`people`)

- `rules`: `name`, `from`, `live`, `nat`, `lang`, `job`, `age` – im Feedback (passend zur Frage) und im Regeln-Tab.
- `texts`: Satzbausteine des Steckbriefs je Person `1` (ich), `m` (він), `f` (вона): `name`, `from`, `live` / `liveNow` (Wohnort = / ≠ Herkunft),
  `age`, `lang` / `lang2` (mit Zweitsprache), `job`, `study` (Studierende). Platzhalter `{name} {from} {nat} {in} {age} {lang} {lang2} {ins} {nom}`.
- `questions` (`m`/`f`): Fragen zum Steckbrief (`from`, `nat`, `lang`, `live`, `job`, `age`); `gaps` (`m`/`f`): Lückensätze mit genau einer `___`
  (`nat`, `from`, `lang`, `job`, `study`); `who` (`m`/`f`): vorgelesene Beschreibungen (`nat`, `from`, `natStudy`, `fromStudy`).
- `years`: `one` / `few` / `many` = рік / роки / років (Alter: 1, 21 … / 2–4, 22–24 … / sonst).
- `countries`: `id`, `name` (Nominativ), `from` (з + Genitiv), `in` (в/у + Lokativ), `nat` `{m, f}`, `language` `{uk, ins, gloss}`
  (Adjektiv zu мова + Instrumental für „говорить …“), `gloss` `{de, en}`, `names` `{m: […], f: […]}` (Vornamen, je mindestens 2, insgesamt eindeutig), `note`, ggf. `review`.
- `professions`: `id`, `emoji`, `m`, `f`, `ins` `{m, f}` (für „працює …“), `gloss` `{m: {de, en}, f: {de, en}}`, `study: true` für студент (вчиться statt працює), `note`, ggf. `review`.
- Die Personen erzeugt die Seite: Land, Geschlecht, Vorname, Beruf, Alter, Wohnort (zur Hälfte ein anderes Land) und evtl. Zweitsprache zufällig.

### Wetterbericht (`weather.json`)

Die Seite erzeugt das Wetter jeder Runde selbst: Wetterlage aus `conditions`, Temperatur zufällig im Schnitt aus Klima der Stadt
(`cities[].min/max`) und Bereich der Wetterlage (`conditions[].min/max`); das Adverb folgt aus der Temperatur (`adverbs`).

- `rules`: `adverb`, `degree`, `city`, `precip` (Regeln-Tab und Hinweise im Feedback).
- `cities`: `id`, `name` (Nominativ), `gloss`, `in` (у/в + Lokativ am Satzanfang: „у Києві“, „в Одесі“), `ask` (nach „Яка погода …“:
  „в Києві“, „у Львові“ – Wohlklang), `wrong` (falsche Form für „Beschreiben“, meist Akkusativ/Nominativ „у Рим“; `""` bei
  unveränderlichen Namen wie Осло), `min`/`max` (plausible Temperatur in °C), optional `note`.
- `conditions`: `id`, `uk` (Lernwort), `emoji`, `gloss`, `where` (für „Де сьогодні …?“, nach Vokal `йде`), entweder `join`
  (an den Satz angehängt: „і сонячно“) oder `sentence` (eigener Satz: „Іде дощ.“), `rain` (`true`/`false`/`null` = Frage „Чи йде дощ?“
  nicht stellen), `min`/`max` (Schnee ≤ +2, Regen ≥ +1).
- `adverbs`: `id`, `uk` (auf -о), `gloss`, `min`/`max` – lückenlos aufeinanderfolgende Temperaturbereiche.
- `numbers`: `units`, `teens`, `tens` (bis 40), `zero`, `plus`, `minus`, `degree` = [градус, градуси, градусів].
- `report`: Satzvorlagen `question` (`{in}`), `temperature` (`{t}`), `noRain`, `today` (`{adv}`), `whereQuestion` (`{what}`),
  `answers` (Fragen im Modus „Hören“: `city`, `temp`, `rain`, `cond`), `rainAnswers` (`yes`/`no`/`snow` mit `uk`, `de`, `en`).
- `topics` + `vocab` (`topic`, `uk`, `gloss`): Wendungen und Jahreszeiten im Lernen-Tab.

### Markt (`market`)

- `numerals`: Zahlwörter wie in `counting.json` (`unitsMasculine`, `unitsFeminine`, `unitsNeuter`, `teens`, `tens`, `hundreds`) – die Seite erzeugt daraus Zahlen 1–999.
- `currency`: `forms` = [1, 2–4, 5+] (`гривня`, `гривні`, `гривень`), `gender` (`f` → одна/дві), `abbr` (`грн`), `gloss`.
- `units`: `piece` (`abbr`, `gloss`), `kg` und `l` mit `forms` [1, 2–4, 5+], `gender`, `abbr`, `gloss`.
- `notes`: Geldscheine für das Wechselgeld, je `{value, from}` – `from` = „з + Genitiv“ (`зі ста гривень`, `з двохсот гривень` …).
  Gezahlt wird mit dem kleinsten Schein, der größer als die Summe ist.
- `phrasing`: ukrainische Bausteine der Seite: `costs`/`costPlural` (коштує/коштують), `list`, `total`, `change` (mit `{from}`), `howMany`, `howMuch`, `howMuchPlural`.
- `stalls`: Marktstände `{id, uk, emoji, label}`.
- `goods`: `id`, `stall`, `uk` (Grundform), `emoji`, `gender` (`m`/`f`/`n`), `forms` (zählbare Waren: [Nom. Sg., Nom. Pl. für 2–4, Gen. Pl. für 5+]; fehlt bei Sammelwörtern wie картопля),
  `unit` (`piece`, `kg`, `l`), `of` (bei `kg`/`l`: Genitiv nach der Mengenangabe, z. B. `помідорів`, `картоплі`, `молока`), `price` (typischer Preis in грн je Einheit), `gloss`, optional `note`.
  „Wie viele?“ nutzt nur Waren mit `forms`; Stückwaren brauchen `forms`.
- `rules`: Regeln-Tab (`count`, `gender`, `hryvnia`, `cost`, `weight`, `change`); `expressions`: nützliche Sätze `{uk, de, en}`.

### Tippen (`typing`)

`sentences`: `uk`, `translation`; `words`: Wortliste für die Wort-Übungen.
