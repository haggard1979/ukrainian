---
name: seite-testen
description: Seiten der Ukrainisch-Lernseite prüfen – die feste Testsuite in tests/ ausführen (Datencheck, allgemeiner Browser-Test, Antwort-Tests je Trainer), Tests für neue/geänderte Funktionen ergänzen, Screenshots auf Handy-Breite ansehen und visueller Vorher/Nachher-Vergleich. Verwenden nach jeder Änderung an einer Seite oder an assets/ und vor jedem Commit.
---

# Seite testen

Die Tests liegen fest im Repo unter `tests/` (Details: `tests/README.md`). Sie werden **nicht** jedes Mal neu geschrieben,
sondern ausgeführt und bei neuen Funktionen ergänzt. Screenshots und Wegwerf-Skripte gehören ins Scratchpad.

Playwright ist global installiert, Chromium liegt unter `/opt/pw-browsers`. **Niemals `playwright install` ausführen.**

## 1. Suite ausführen

```bash
node tests/run.js                                   # alles, ≈ 1 Minute
node tests/run.js <seite>                           # z. B. locative, time, generic, common, daten
node tests/run.js <seite> --shots <scratchpad>/shots
```
Ergebnis muss `0 failed` sein. Schlägt etwas fehl: erst klären, ob die Seite oder die Erwartung im Test falsch ist –
einen Test nie abschwächen, nur damit er grün wird. Ist die Erwartung falsch (z. B. gewolltes Verhalten), Test anpassen
und das im Commit erwähnen.

## 2. Tests ergänzen

- **Neue Seite:** `tests/pages/<name>.test.js` aus dem Test der ähnlichsten Seite ableiten. Pflicht: jeder Modus mit
  vielen Aufgaben (Antwort über `window.__<name>` ermitteln; Satz allein ist oft mehrdeutig → Grundform mit abgleichen),
  Eingaben variieren (Großbuchstaben, `'` statt `’`, letzte Variante), Falschantwort mit Lösung im Feedback,
  Sonderfunktionen der Seite, `t.linkedFromIndex('<deutscher Linktext>', REL)`.
  Datencheck und `generic` erfassen neue `*-trainer.html` automatisch; neues Datenformat → `tests/check-data.js` erweitern.
- **Neue Funktion / Fehlerkorrektur:** eine Prüfung in den Test der Seite aufnehmen, die ohne die Änderung fehlschlagen würde.
- **Änderung an `assets/`:** gehört nach `tests/pages/common.test.js` bzw. `generic.test.js`.
- Helfer aus `tests/lib.js`: `t.open(rel, {clock, locale, width, scheme, voice:'uk'|'none'|'noapi', touch})`,
  `t.ok`, `t.eq`, `t.zero(fehler, anzahl, text)`, `t.verdict`, `t.fb`, `t.next` (respektiert die 250-ms-Sperre),
  `t.visible`, `t.shot`, `t.linkedFromIndex`.
- Fallstricke: Tastatur-Tests vorher `#card .card-head` klicken (Fokus nicht im Eingabefeld); bei Koordinaten-Tests
  (Ziffernblatt) `boundingBox()` nach jedem Scrollen neu holen; `clock: true` nicht für Seiten mit echter Zeitmessung.
- Gegenprobe bei neuen Tests: Seite absichtlich kaputt machen (z. B. `norm()` ändern) → Test muss rot werden; danach zurücksetzen.

## 3. Screenshots ansehen

Mit `--shots` erzeugte Bilder (390 px, hell/dunkel/Englisch für jede Seite) mit dem Read-Tool ansehen – vor allem
Tabellen, mehrspaltige Layouts und den Dunkel-Modus auf Handy-Breite. Wichtige Bilder dem Nutzer schicken (SendUserFile).

## 4. Visueller Vergleich (bei Änderungen an `assets/` oder Umbauten)

```bash
git stash && node tests/visual.js <scratchpad>/vis-before && git stash pop
node tests/visual.js <scratchpad>/vis-after
python3 tests/compare.py <scratchpad>/vis-before <scratchpad>/vis-after <scratchpad>/vis-diff
```
Bei einem reinen Umbau müssen 0 Dateien „changed“ sein; bei gewollten Änderungen die Differenzbilder ansehen.

## 5. Abschluss

Dem Nutzer kurz berichten: Anzahl Prüfungen / fehlgeschlagen, was neu getestet wird, wichtigste Screenshots.
