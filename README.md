# Ukrainisch lernen

Eine kleine, statische Lern-Website für Ukrainisch – gedacht für deutschsprachige Lernende, die Oberfläche lässt sich
auf Englisch umschalten. Grammatik, Smalltalk und Tippen üben, mit Feedback, Regeln und Vorlesefunktion.

**Online:** <https://haggard1979.github.io/ukrainian/>

## Was es gibt

| Bereich | Trainer | Übungen |
|---|---|---|
| Grammatik | Lokativ (*Місцевий відмінок*) | Form tippen / auswählen, „в oder на?“, Grundform bestimmen |
| | Akkusativ (*Знахідний відмінок*) | Form tippen / auswählen, „Wohin oder wo?“, Grundform bestimmen |
| | Genitiv (*Родовий відмінок*) | Form tippen / auswählen, „Nominativ oder Genitiv?“, Grundform bestimmen |
| | Genus (*Рід*) | Genus von Nomen bestimmen, Adjektiv/Pronomen passend wählen oder tippen |
| | Personalpronomen (*Особові займенники*) | Form tippen / auswählen (mit н-Formen), Fall bestimmen, Pronomen bestimmen |
| | Zahlen (*Числівники*) | Zahl ↔ Wort, Umwandler |
| | Uhrzeiten (*Котра година?*) | Umgangssprache, offiziell, „О котрій?“, Umwandler mit Ziffernblatt |
| | Datum (*Дні, місяці, роки*) | Wochentage, Monate, Datum, Jahreszahlen, Umwandler |
| | Zeitangaben (*Коли?*) | Lernliste mit Zeitstrahl, Karteikarten, Übersetzen, Auswählen |
| | Präsens / Vergangenheit | Form tippen / auswählen, „I. oder II. Konjugation?“ bzw. „Genus & Zahl?“, Grundform bestimmen, Verbliste |
| Smalltalk | Smalltalk (*Розмова*) | Lernliste, Karteikarten, Übersetzen, passende Antwort |
| Tippen | Tipp-Trainer (*Набір тексту*) | Wörter und Sätze auf der ukrainischen Tastatur, mit Zeitmessung |

Allen Seiten gemeinsam sind:
- tolerante Antwortprüfung: Großschreibung, Apostroph-Varianten und Betonungszeichen spielen keine Rolle, gängige Varianten werden akzeptiert;
- Bildschirmtastatur;
- Vorlesen (wenn eine ukrainische Stimme installiert ist);
- Hell-/Dunkel-Modus;
- Lernfortschritt im Browser (`localStorage`), schwierige Aufgaben kommen öfter dran.

## Aufbau

Kein Build, keine Abhängigkeiten, kein Backend – reines HTML, CSS und JavaScript.

```
index.html                  Startseite
grammar/<thema>/…-trainer.html, smalltalk/, typing/   die Trainer (je eine HTML-Datei: Logik, Oberflächentexte, Regeln)
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
