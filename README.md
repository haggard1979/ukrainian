# Ukrainisch lernen

Eine kleine, statische Lern-Website für Ukrainisch – gedacht für deutschsprachige Lernende, die Oberfläche lässt sich
auf Englisch umschalten. Grammatik, Aussprache, Smalltalk und Tippen üben, mit Feedback, Regeln und Vorlesefunktion.

**Online:** <https://haggard1979.github.io/ukrainian/>

## Was es gibt

| Bereich | Trainer | Übungen |
|---|---|---|
| Grammatik | Lokativ (*Місцевий відмінок*) | Form tippen / auswählen, „в oder на?“, Grundform bestimmen |
| | Akkusativ (*Знахідний відмінок*) | Form tippen / auswählen, „Wohin oder wo?“, Grundform bestimmen |
| | Genitiv (*Родовий відмінок*) | Form tippen / auswählen, „Nominativ oder Genitiv?“, Grundform bestimmen |
| | Genus (*Рід*) | Genus von Nomen bestimmen, Adjektiv/Pronomen passend wählen oder tippen |
| | Komparativ und Superlativ (*Ступені порівняння*) | Form tippen / auswählen, Stufe bestimmen, Vergleichswort (*за / від / ніж*), Grundform bestimmen, Formenliste |
| | Personalpronomen (*Особові займенники*) | Form tippen / auswählen (mit н-Formen), Fall bestimmen, Pronomen bestimmen |
| | Zahlen (*Числівники*) | Zahl ↔ Wort, Umwandler |
| | Ordnungszahlen (*Порядкові числівники*) | Zahl → Ordnungszahl (passend zum Nomen), Ordnungszahl → Zahl, Form auswählen / tippen in allen Fällen, Umwandler |
| | Zahl + Nomen (*Числівник + іменник*) | Welche Form? (*брат / брати / братів*), Nomen tippen, ganz in Worten, Umwandler |
| | Uhrzeiten (*Котра година?*) | Umgangssprache, offiziell, „О котрій?“, Umwandler mit Ziffernblatt |
| | Datum (*Дні, місяці, роки*) | Wochentage, Monate, Datum, Jahreszahlen, Umwandler |
| | Zeitangaben (*Коли?*) | Lernliste mit Zeitstrahl, Karteikarten, Übersetzen, Auswählen |
| | Präsens / Vergangenheit | Form tippen / auswählen, „I. oder II. Konjugation?“ bzw. „Genus & Zahl?“, Grundform bestimmen, Verbliste |
| Aussprache & Hören | Aussprache-Trainer (*Вимова*) | Alphabet mit Lautbeschreibung, Nachsprechen mit Spracherkennung (Chrome/Edge/Safari), Hören & Auswählen (и/і …), Diktat |
| | Hör-Trainer (*Аудіювання*) | Sätze und Mini-Dialoge hören: Verstehen (mit Frage), Lückendiktat, Satzdiktat, langsam oder normal |
| Spiele | Wortraten (*Вгадай слово*) | Wort Buchstabe für Buchstabe raten – 7 Stiche statt Galgen |
| | Memory (*Знайди пару*) | ukrainisches Wort ↔ Bedeutung, 6 oder 8 Paare, Zugzähler |
| | Bilder-Memory (*Знайди картинку*) | ukrainisches Wort ↔ Emoji, ohne Deutsch, 6 oder 8 Paare |
| | Kreuzworträtsel (*Кросворд*) | erzeugtes Rätsel mit 5 / 7 / 9 Wörtern, deutsche Hinweise, Prüfen, Tipp, Bestzeit |
| | Fall-Domino (*Доміно відмінків*) | Kette aus Steinen: Präposition + Wort im verlangten Fall (Genitiv, Akkusativ, Instrumental, Lokativ, Dativ) |
| | Fehlerjagd (*Знайди помилку*) | 48 Sätze mit einem Fehler: falsches Wort antippen, richtige Form wählen (Fälle, Genus, Zahl + Nomen, Verben, Steigerung, Pronomen) |
| | Bilderraten (*Що на картині?*) | 9 gemeinfreie Gemälde von Mykola Pymonenko: Wörter wählen, die im Bild zu sehen sind (richtige und falsche Wörter gemischt), mit Galerie |
| | Buchstabensalat (*Анаграма*) | durcheinandergewürfelte Buchstaben ordnen, mit Tipp |
| | Wortsuche (*Пошук слів*) | Wörter im Gitter 8 × 8 oder 10 × 10 finden, Ziehen oder Antippen, Bestzeit |
| Smalltalk | Smalltalk (*Розмова*) | Lernliste, Karteikarten, Übersetzen, passende Antwort |
| Tippen | Tipp-Trainer (*Набір тексту*) | Wörter und Sätze auf der ukrainischen Tastatur, mit Zeitmessung |

Allen Seiten gemeinsam sind:
- tolerante Antwortprüfung: Großschreibung, Apostroph-Varianten und Betonungszeichen spielen keine Rolle, gängige Varianten werden akzeptiert;
- Bildschirmtastatur;
- Vorlesen (wenn eine ukrainische Stimme installiert ist); im Aussprache-Trainer zusätzlich Spracheingabe über die Web-Speech-API des Browsers (Mikrofon-Erlaubnis nötig, Audio geht an den Browser-Hersteller);
- Hell-/Dunkel-Modus;
- Lernfortschritt im Browser (`localStorage`), schwierige Aufgaben kommen öfter dran.

## Aufbau

Kein Build, keine Abhängigkeiten, kein Backend – reines HTML, CSS und JavaScript.

```
index.html                  Startseite
grammar/<thema>/…-trainer.html, pronunciation/, listening/, games/<spiel>/, smalltalk/, typing/   die Trainer (je eine HTML-Datei: Logik, Oberflächentexte, Regeln)
data/<name>.json            die Übungsdaten jeder Seite (Sätze, Wörter, Regeln) – Format in data/README.md
assets/tokens.css           Farben (hell/dunkel), Schriften, Größen
assets/trainer.css          gemeinsames Layout der Trainer
assets/common.js            gemeinsames JavaScript (Theme, Sprache, Vorlesen, Daten laden)
tests/                      automatische Tests, siehe tests/README.md
tools/previews.*            Icons und Link-Vorschauen (Teams, WhatsApp …) erzeugen
```

Die Übungsdaten liegen getrennt von den Seiten als JSON mit benannten Feldern. So lassen sich neue Beispiele eintragen,
ohne Code anzufassen. Die Daten könnten später auch von einem REST-Service kommen – dafür muss pro Seite nur die URL in
`UK.loadData(…)` geändert werden.

## Lokal ansehen

Die Seiten laden ihre Daten per `fetch()`. Das blockieren Browser bei Dateien, die direkt von der Festplatte geöffnet
werden (`file://`). Deshalb lokal einen einfachen Webserver im Projektordner starten:

```bash
python3 -m http.server 8000
```

und <http://localhost:8000/> öffnen.

## Neue Beispiele eintragen

1. Passende Datei in `data/` öffnen, z. B. `data/genitive.json`.
2. Einen Eintrag nach dem Muster der vorhandenen ergänzen – alle Texte auf Deutsch **und** Englisch, ukrainischer
   Apostroph `’`, die Lücke im Satz als `___`. Die Felder sind in `data/README.md` beschrieben.
3. Prüfen: `node tests/check-data.js` (Datencheck) oder `node tests/run.js` (alle Tests).

## Icons und Link-Vorschau

Jede Seite hat ein eigenes Vorschaubild (`assets/preview/`) und Open-Graph-Tags, damit geteilte Links in Teams, WhatsApp,
Slack, Signal usw. mit Titel, Beschreibung und Bild erscheinen; dazu Favicon, Apple-Touch-Icon und Web-App-Manifest.
Titel und Beschreibungen stehen in `tools/previews.json`; nach Änderungen oder für neue Seiten:

```bash
node tools/previews.js
```

## Tests

```bash
node tests/run.js              # Datencheck + Browser-Tests aller Seiten (≈ 1 Minute)
node tests/run.js genitive     # nur einzelne Seiten
```

Benötigt Node.js und Playwright mit Chromium (global installiert: `npm i -g playwright && npx playwright install chromium`).
Die Tests starten selbst einen lokalen Webserver. Details in [tests/README.md](tests/README.md).

## Weiterentwicklung mit Claude Code

Die Seite wird mit [Claude Code](https://claude.com/claude-code) entwickelt. `CLAUDE.md` beschreibt Aufbau und
Konventionen. In `.claude/skills/` liegen Abläufe für wiederkehrende Aufgaben:

| Skill | Wofür |
|---|---|
| `neue-uebungsseite` | eine neue Übungsseite anlegen |
| `beispiele-ergaenzen` | weitere Beispiele in eine bestehende Seite eintragen |
| `seite-testen` | testen |
| `feature-ausliefern` | Commit, Push, Pull Request |

## Hinweise

- Sätze, Übersetzungen und Regeln sind selbst verfasst und nicht durchgehend von Muttersprachlern geprüft.
  Korrekturen sind willkommen.
- Das Wappen auf der Startseite (kleines Staatswappen der Ukraine, gemeinfrei) stammt als SVG aus dem npm-Paket
  `coat-of-arms` (MIT).
