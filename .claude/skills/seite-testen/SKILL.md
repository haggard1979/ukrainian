---
name: seite-testen
description: Eine oder mehrere Seiten der Ukrainisch-Lernseite prüfen – Datencheck, Browser-Test mit Playwright (alle Modi, Sprache, Hell/Dunkel, Fehler), Screenshots auf Handy-Breite und visueller Vorher/Nachher-Vergleich. Verwenden nach jeder Änderung an einer Seite oder an assets/ und vor jedem Commit.
---

# Seite testen

Kein Test-Framework im Repo. Alle Werkzeuge liegen in diesem Skill-Ordner und werden aus dem Repo-Wurzelverzeichnis
aufgerufen. Ausgaben (Screenshots, eigene Testskripte) gehören ins Scratchpad, **nicht** ins Repo.

Playwright ist global installiert, Chromium liegt unter `/opt/pw-browsers`. **Niemals `playwright install` ausführen.**
Einbinden immer so:
```js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
```

## 1. Datencheck (ohne Browser)

```bash
node .claude/skills/seite-testen/check-data.js grammar/<thema>/<thema>-trainer.html
```
Liest die Daten-Literale (`var RAW=[…]`, `RULES`, `CATS`, `RAWP`, `RAWR`, `RAWV`, `RAWS`, `TOPICS`, `PAIRS` …) aus dem Skript
und prüft je nach Seitentyp: Feldanzahl, genau eine Lücke `___`, Regel-/Kategorie-/Themen-Keys vorhanden (de **und** en),
keine Duplikate, Lösung ≠ Distraktor, 3 Distraktoren, Notizen in beiden Sprachen, keine Überschneidung zwischen
Übungs- und Rückwärts-Liste, `PAIRS` verweisen auf vorhandene Wendungen, Apostroph `’`, keine lateinischen Doppelgänger
in kyrillischen Wörtern. Exit-Code 1 bei Problemen. Für neue Datenformate das Skript erweitern statt Prüfungen wegzulassen.
Generator-Seiten (Zahlen, Uhrzeit, Datum) bekommen nur die allgemeinen Prüfungen – ihre Funktionen im Browser über
`window.__<name>` mit vielen Werten durchtesten (Hauptlösung + Varianten akzeptiert?).

## 2. Allgemeiner Browser-Test

```bash
node .claude/skills/seite-testen/smoke.js <scratchpad>/smoke grammar/<thema>/<thema>-trainer.html index.html
```
Pro Seite: Fake-Stimme `uk-UA`, Link von `index.html` vorhanden, kein horizontales Scrollen bei 390 px,
DE↔EN (`<html lang>`, Titel, `localStorage['ukrainian.lang']`), Hell/Dunkel-Knopf, jeder Tab und jeder Modus einmal,
Vorlese-Knopf erreicht die Stimme; `pageerror`/`console.error` werden gesammelt. Screenshots 390 px hell/dunkel und 900 px.
Exit-Code 1 bei Problemen. **Screenshots ansehen** (Read-Tool) – vor allem Tabellen, mehrspaltige Layouts und Dunkel-Modus
auf Handy-Breite.

## 3. Seitenspezifischer Antwort-Test

Vorlage: `functional-example.js` (Akkusativ, Modus „Form tippen“) ins Scratchpad kopieren und anpassen. Prinzip:
- aktuelle Aufgabe über den Test-Hook `window.__<name>` bestimmen (Satz allein ist oft mehrdeutig – Grundform o. Ä. mit abgleichen),
- pro Modus viele Aufgaben (≈100) richtig beantworten, Eingabe variieren: Großbuchstaben, `'` statt `’`, Varianten
  (letzte Lösung der Liste) → alle „Richtig“; Anzahl verschiedener Aufgaben ausgeben,
- Falschantwort (zeigt Lösung, Regel, bei Mehrwort-Antworten Wortvergleich), lateinische Eingabe (Hinweis im Feedback),
  Tipp-Knopf, Sprachwechsel bei offenem Feedback, Auswahl-Modi über Tasten 1–4/1–6,
- nach dem Feedback **260 ms warten**, bevor „Weiter“ geklickt wird (250-ms-Sperre gegen Doppel-Enter),
- Tastatur-Tests: Fokus vorher auf die Karte setzen (`#card .card-head` klicken), nicht ins Eingabefeld,
- Koordinaten-Tests (z. B. Ziffernblatt der Uhrzeit-Seite): nach jedem Scrollen `boundingBox()` neu holen,
- Vorlesen: `speechSynthesis` per `addInitScript` stubben (siehe `smoke.js`), auch die Fälle „keine ukrainische Stimme“
  (Hinweis `#say-note` sichtbar) und „keine Speech-API“ (`<html class="no-tts">`, keine `.say`-Knöpfe) prüfen.
Ergebnis muss sein: `problems 0` und `ERRORS []`.

## 4. Visueller Vergleich (bei Änderungen an `assets/` oder Umbauten)

```bash
git stash            # oder: Stand vor der Änderung auschecken
node .claude/skills/seite-testen/visual.js <scratchpad>/vis-before
git stash pop
node .claude/skills/seite-testen/visual.js <scratchpad>/vis-after
python3 .claude/skills/seite-testen/compare.py <scratchpad>/vis-before <scratchpad>/vis-after <scratchpad>/vis-diff
```
`visual.js` fotografiert `index.html` und jede `*-trainer.html` mit allen Tabs (390 px hell/Deutsch, 900 px dunkel/Englisch),
deterministisch (fester Zufall, feste Uhrzeit, keine Animationen). `compare.py` meldet echte Änderungen und ignoriert
Kantenglättungs-Rauschen der Schrift; für geänderte Dateien entstehen Nebeneinander-Bilder (vorher | nachher | Differenz).
Bei einem reinen Umbau müssen 0 Dateien „changed“ sein; bei gewollten Änderungen die Differenzbilder ansehen.

## 5. Abschluss

- Dem Nutzer die wichtigsten Screenshots schicken (SendUserFile, Handy-Breite, ggf. hell und dunkel) und kurz sagen,
  was getestet wurde (Anzahl Aufgaben pro Modus, Fehler 0).
- Testskripte und Screenshots nicht committen.
