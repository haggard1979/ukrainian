# Ukrainisch lernen – Projektnotizen für Claude

Statische Lern-Website für Ukrainisch (Zielgruppe: deutschsprachige Lernende, Oberfläche Deutsch/Englisch umschaltbar).
Gehostet über GitHub Pages aus `main` (`https://haggard1979.github.io/ukrainian/`). Kein Build, keine Abhängigkeiten,
kein Backend: jede Seite ist **eine eigenständige HTML-Datei** mit inline CSS und JavaScript.

Der Nutzer schreibt Deutsch; Antworten an ihn auf Deutsch. Code, Kommentare und Commit-Messages auf Englisch.

## Struktur

```
index.html                                  Startseite: Wappen + Flagge, Abschnitte Grammatik / Smalltalk / Tippen
grammar/locative/locative-trainer.html      Lokativ (Місцевий відмінок) – Vorlage der Fall-Trainer
grammar/accusative/accusative-trainer.html  Akkusativ (Знахідний відмінок) – aus dem Lokativ-Trainer abgeleitet
grammar/numbers/numbers-trainer.html        Grundzahlen (Числівники) + Umwandler
grammar/time/time-trainer.html              Uhrzeiten (Котра година?) + Umwandler mit klickbarem Ziffernblatt
grammar/dates/dates-trainer.html            Wochentage, Monate, Datum, Jahreszahlen (Дні, місяці, роки) + Datums-Umwandler
grammar/when/when-trainer.html              Zeitangaben (Коли?): Jahres-/Tageszeiten, gestern/morgen, nächste Woche …
grammar/present/present-trainer.html        Präsens (Теперішній час) + durchsuchbare Verbliste
grammar/past/past-trainer.html              Vergangenheit (Минулий час) + durchsuchbare Verbliste
smalltalk/smalltalk-trainer.html            Smalltalk-Wendungen (Розмова) – Vorlage der Vokabel-Trainer
typing/typing-trainer.html                  Tipp-Trainer (Набір тексту) mit Zeitmessung
```

Pfadregel: Seiten in `grammar/<thema>/` verlinken zurück mit `../../index.html`, Seiten in `smalltalk/` und `typing/` mit `../index.html`.
Neue Grammatik-Seiten kommen nach `grammar/<thema>/<thema>-trainer.html` und werden in `index.html` eingetragen.

## Gemeinsame Bausteine (in jeder Seite kopiert, nicht ausgelagert)

Es gibt **keine** gemeinsamen CSS/JS-Dateien. Gleiche Bausteine stehen in jeder Datei. **Eine Korrektur an einem
gemeinsamen Baustein muss in allen betroffenen Seiten nachgezogen werden** (Beispiel aus der Vergangenheit:
die Verbsuche-Korrektur wurde zuerst nur in einer Seite gemacht und fehlte in der nächsten).

- **Kopf/CSS:** Neue Seiten übernehmen den kompletten `<head>` + Haupt-`<style>` aus
  `grammar/locative/locative-trainer.html` (alles bis zum letzten `</style>` vor `<div class="wrap">`), mit angepasstem `<title>`.
  Seitenspezifisches CSS kommt in einen zweiten `<style>`-Block am Anfang des Bodys.
- **Farb-Tokens** (in `:root`, dazu Dark-Varianten unter `@media (prefers-color-scheme: dark)` mit `:root:not([data-theme="light"])`
  und unter `:root[data-theme="dark"]`): `--bg --surface --field --ink --muted --line --blue --blue-soft --on-blue --gold --gold-soft
  --red --red-soft --green --green-soft`, Schriften `--font-uk` (Fira Sans, für Ukrainisch) und `--font-ui` (Onest).
- **Design-Regeln:** gedecktes Blau/Gold („ukrainisches Thema, nicht schreiend“). Blau = Bedienelemente, Gold = Schmuck
  (Kartenoberkante, Rauten vor Überschriften), **Rot/Grün nur für Feedback** (richtig/falsch). Flaggenstreifen oben
  (`body::before`), Kreuzstich-Bordüre oben und unten (`.stitch`, Muster per JS in `#stitch-tile` erzeugt).
  Wappen/Flagge nur auf `index.html`, dort in offiziellen Farben (`#005bbb` / `#ffd500`).
- **Kopfzeile:** `.head-row` mit `h1 lang="uk"` und `.head-tools` = Hell/Dunkel-Knopf `#theme-toggle` + Sprachumschalter
  (Flaggen 🇦🇹 für Deutsch, 🇬🇧 für Englisch als Inline-SVG, **nicht** Deutschland, keine Emoji-Flaggen).
- **Sprache (i18n):** `T={de:{…},en:{…}}`, `t(key)`; statische Texte über `data-i18n`, `data-i18n-aria`, `data-i18n-ph`;
  ganze Blöcke über `data-show-lang="de|en"`. `applyLang()` setzt alles, `setLang()` rendert offene Karte/Feedback neu.
  Sprachwahl in `localStorage['ukrainian.lang']` (seitenübergreifend); Default nach `navigator.language`.
- **Hell/Dunkel:** Snippet `/* ---------- light / dark … */`; `localStorage['ukrainian.theme']`; ein Inline-Skript im `<head>`
  setzt `data-theme` vor dem ersten Rendern. `renderTheme()` wird in `applyLang()` aufgerufen.
- **Vorlesen:** Snippet `/* ---------- read aloud (Web Speech API …) */` mit `speak(text)`, `sayButton(btn,getText)`,
  Chip `#auto-say` (automatisch vorlesen) und Hinweis `#say-note`, wenn keine ukrainische Stimme installiert ist
  (kein Ausweichen auf andere Stimmen). Ohne Speech-API bekommt `<html>` die Klasse `no-tts` und alle `.say`/`.say-ui` verschwinden.
- **Bildschirmtastatur** (`#kb`): ukrainische Buchstaben + `’`, je nach Seite Leertaste, `⌫`; Ein/Aus wird gespeichert.
- **Antwortvergleich:** `norm()` ist bewusst tolerant: Kleinschreibung, Betonungszeichen weg, `' ʼ ‘ ’` vereinheitlicht,
  lateinische Doppelgänger (a e i o p c x y) → kyrillisch, Satzzeichen/Mehrfach-Leerzeichen ignoriert, je nach Seite
  führende Präpositionen/Pronomen/`сьогодні`/`зараз` entfernt. Lateinische Eingaben lösen einen Hinweis aus.
  Mehrwort-Antworten zeigen im Feedback einen Wortvergleich (`lcs()`: falsche Wörter durchgestrichen, fehlende markiert).
- **Fortschritt:** Jede Seite hat ihren eigenen `localStorage`-Schlüssel (`lokativ.v1`, `akkusativ.v1`, `numbers.v1`, `time.v1`,
  `dates.v1`, `when.v1`, `present.v1`, `past.v1`, `smalltalk.v1`, `typing.v1`). Auswahl: Gewichtung nach Lernstand
  (`s>=2` = sicher), falsche Aufgaben kommen nach 3 Runden wieder (`retry`). Alle Zugriffe auf `localStorage` in `try/catch`.
- **Tastatur-Bedienung:** Enter = weiter nach dem Feedback (250-ms-Sperre gegen Doppel-Enter), 1–4 bzw. 1–6 für Auswahl-Knöpfe.
- Test-Hooks: viele Seiten legen ihre Daten auf `window.__<name>` (z. B. `__lokativ`, `__akkusativ`, `__numbers`, `__time`,
  `__dates`, `__when`, `__present`, `__past`, `__smalltalk`, `__typing`) – nur für automatisierte Tests.

## Seiten-Typen und Vorlagen

1. **Fall-Trainer** (Lokativ, Akkusativ): Modi `type` (Form tippen), `choice` (aus 4 Formen), `prep` (Lokativ: „в oder на?“;
   Akkusativ: „Wohin oder wo?“), `rev` (Grundform + Genus bestimmen, **eigene Wortliste**, nicht die der Tipp-Übungen).
   Datenzeilen `RAW` mit 12 Feldern: `[cat, Grundform, Glosse de, Satz mit ___, Übersetzung de, [Lösungen], [3 Distraktoren],
   Regel-Key, Notiz de, Glosse en, Übersetzung en, Notiz en]`. Regeln in `RULES`/`RULES_EN`, Kategorien in `CATS`.
2. **Verb-Trainer** (Präsens, Vergangenheit): Verbtabellen `RAWV`, Übungssätze `RAW`, eigene Sätze für „Grundform bestimmen“
   `RAWR` (meist ohne Pronomen bzw. Subjekt). Feedback zeigt immer die ganze Konjugations-/Formentabelle. Vergangenheit:
   Sätze mit я/ти tragen einen Geschlechtshinweis (`who`), in `rev` erscheint die Übersetzung erst nach der Antwort.
3. **Generator-Trainer** (Zahlen, Uhrzeiten, Datum): Lösungen werden per Funktion erzeugt, erste Variante = Hauptlösung,
   weitere Varianten werden akzeptiert. Jeweils Tab „Umwandeln“. Uhrzeiten: Umgangssprache (на/пів на/за), offiziell (24 h),
   „О котрій?“ (о/об + Lokativ), Wort → Uhrzeit. Datum: nur der letzte Teil einer Jahreszahl ist Ordnungszahl.
4. **Vokabel-Trainer** (Smalltalk, Zeitangaben): `TOPICS` + `RAWS` mit 8 Feldern `[topic, uk, de, en, register (i/f/''),
   [Varianten], Notiz de, Notiz en]`; Tabs „Lernen“ (Liste mit Vorlesen; Zeitangaben zusätzlich Zeitstrahl) und „Üben“
   (Karteikarten, Übersetzen, Smalltalk: „Passende Antwort“ über `PAIRS`, Zeitangaben: „Auswählen“ mit Distraktoren aus demselben Thema).
5. **Tipp-Trainer:** eigene Logik (Zeichen grau → schwarz, falsch = rot, fertig erst bei fehlerfreiem Text; zählt falsche
   Anschläge und Rücktaste; optional ЙЦУКЕН-Simulation über `KeyboardEvent.code`; Ergebnisse/Bestwerte in `typing.v1`).

Neue Seiten wurden bisher so gebaut: Body mit Platzhaltern `{{HEADTOOLS}}`, `{{DATA}}`/`{{GEN}}`, `{{SPEECH}}`, `{{THEME}}`
schreiben und per Python-Skript mit den Bausteinen aus `grammar/locative/locative-trainer.html` zusammensetzen
(head-tools = `<div class="head-tools">…</div></div>`, Speech = ab `/* ---------- read aloud` bis `renderAutoSay();`,
Theme = ab `/* ---------- light / dark` bis `darkMq.addEventListener('change',renderTheme);`). Ähnliche Seiten wurden auch
direkt aus einer bestehenden Seite abgeleitet (Akkusativ aus Lokativ, Zeitangaben aus Smalltalk).

## Inhaltliche Konventionen

- Ukrainischer Apostroph im Text immer `’` (U+2019), Eingabe von `'` wird akzeptiert.
- Ukrainische Wörter im Markup mit `lang="uk"` auszeichnen (Schrift + Vorlesen).
- Varianten großzügig akzeptieren (у/в, ввечері/увечері, -ся/-сь nach Vokal, йду/іду, Kurzformen …), aber die normgerechte
  Form als Hauptlösung anzeigen (z. B. *об одинадцятій*, *у* vor Konsonant / *в* vor Vokal).
- Alle Inhalte (Übersetzungen, Hinweise, Regeln) gibt es auf Deutsch **und** Englisch.
- Sätze/Übersetzungen sind selbst verfasst; beim Abschluss dem Nutzer empfehlen, sie von Muttersprachlern prüfen zu lassen.
- Daten vor dem Einbau mit einem kleinen Node-Skript prüfen (Feldanzahl, genau eine Lücke `___`, Regel-Keys vorhanden,
  keine Duplikate, Lösung ≠ Distraktoren, Endungen passen zur Gruppe, keine Überschneidung zwischen Übungs- und Rückwärts-Liste).

## Testen

Kein Test-Framework im Repo. Getestet wird mit Playwright (global installiert; Chromium unter `/opt/pw-browsers`, **nicht**
`playwright install` ausführen). Muster:

```js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
// page.goto('file:///…/grammar/xyz/xyz-trainer.html'); Antworten über window.__<name> ermitteln, eintippen, Feedback prüfen
```

Üblich pro Seite: viele Aufgaben pro Modus mit richtigen Antworten (auch Großbuchstaben, `'`, Varianten) → alle „Richtig“;
Falschantworten, Tipp, Sprachwechsel, Hell/Dunkel, Link von der Startseite; `pageerror`/`console.error` sammeln (muss leer sein).
Die Sprachausgabe ist im Headless-Browser nicht vorhanden → `speechSynthesis` per `addInitScript` mit einer Fake-Stimme `uk-UA`
stubben. Screenshots bei 390 px Breite (Handy) und hell/dunkel prüfen; Tabellen und mehrspaltige Layouts auf Handy-Breite kontrollieren.
Achtung bei Koordinaten-Tests (Ziffernblatt): nach Scrollen Bounding-Box neu holen.

Netzwerk: Wikimedia/jsDelivr/unpkg sind in der Cloud-Umgebung gesperrt, die npm-Registry ist erreichbar
(so kam das Wappen-SVG aus dem npm-Paket `coat-of-arms`, MIT).

## Arbeitsablauf (so wie bisher mit dem Nutzer vereinbart)

- Entwicklungs-Branch: `claude/trusting-newton-0teko1`. Vor jeder neuen Aufgabe vom aktuellen `main` neu aufsetzen
  (`git fetch origin main && git checkout -B claude/trusting-newton-0teko1 origin/main`), da Pull Requests jeweils gemergt werden.
- Pro Feature: committen, pushen, dann auf Nachfrage des Nutzers Pull Request erstellen und per **Merge-Commit** nach `main` mergen
  (der Nutzer bestätigt das jeweils mit „ja, erstelle den Pull Request und merge ihn“). Ohne Aufforderung keinen PR anlegen.
- PR-Beschreibung auf Deutsch mit „Zusammenfassung“ und „Test“.
- Nach Abschluss eines Features dem Nutzer Screenshots schicken und kurz zusammenfassen, was gebaut und getestet wurde.
