# Tests

Wiederholbare Tests für die ganze Seite. Kein npm-Install nötig: Playwright wird global verwendet
(`npm root -g`), Chromium liegt in der Cloud-Umgebung unter `/opt/pw-browsers` – **nicht** `playwright install` ausführen.
Lokal reicht `npm i -g playwright && npx playwright install chromium`.

```bash
node tests/run.js                      # alles (≈ 1 Minute)
node tests/run.js locative time        # nur Testdateien, deren Name das enthält
node tests/run.js daten                # nur der Datencheck
node tests/run.js --shots /tmp/shots   # zusätzlich Screenshots schreiben
```
Exit-Code 1, wenn eine Prüfung fehlschlägt; jede fehlgeschlagene Prüfung wird mit Erwartung und Ergebnis ausgegeben.

## Inhalt

| Datei | Prüft |
|---|---|
| `run.js` | Runner: Datencheck aller Seiten + alle `pages/*.test.js` (4 parallel, `--jobs n`) |
| `lib.js` | Hilfen: Seite öffnen (eigener Kontext, Fake-Stimme, Fehler sammeln, optional falsche Uhr), `t.ok/eq/zero`, `t.next`, `t.shot` |
| `check-data.js` | Datencheck ohne Browser (auch einzeln: `node tests/check-data.js <seite.html>`) |
| `pages/generic.test.js` | jede Seite: Link von der Startseite, kein seitliches Scrollen bei 390 px, DE/EN, Hell/Dunkel, alle Tabs und Modi, Vorlesen |
| `pages/common.test.js` | `assets/common.js`: Theme/Sprache seitenübergreifend, Vorlesen mit/ohne ukrainische Stimme, ohne Speech-API |
| `pages/<seite>.test.js` | je Trainer: viele Aufgaben pro Modus richtig beantwortet (Großbuchstaben, `'`, Varianten), Falschantworten, Tipp, Sonderfunktionen (Verbsuche, Umwandler, Ziffernblatt, Zeitstrahl, Tipp-Simulation …) |
| `visual.js`, `compare.py` | visueller Vorher/Nachher-Vergleich (siehe unten) |

Seitenfehler (`pageerror`) und `console.error` lassen den jeweiligen Test automatisch fehlschlagen.

## Neue Seite → neuer Test

`pages/<name>.test.js` anlegen (Vorlage: der Test der ähnlichsten Seite), Muster:
```js
module.exports = async t => {
  const page = await t.open('grammar/<thema>/<thema>-trainer.html', { clock: true });
  // aktuelle Aufgabe über window.__<name> bestimmen, Antwort eintippen, prüfen:
  t.eq(await t.verdict(page), 'Richtig', 'Beschreibung');
  await t.next(page);
};
```
`clock: true` installiert Playwrights falsche Uhr, damit `t.next()` die 250-ms-Sperre nach dem Feedback vorspult statt zu warten.
Nicht verwenden, wenn die Seite echte Zeit misst (Tipp-Trainer) oder Zeigerbewegungen mit Timern testet.
Der allgemeine Test (`generic`) und der Datencheck erfassen neue `*-trainer.html` automatisch.

## Visueller Vergleich (bei Änderungen an `assets/` oder Umbauten)

```bash
git stash && node tests/visual.js /tmp/vis-before && git stash pop
node tests/visual.js /tmp/vis-after
python3 tests/compare.py /tmp/vis-before /tmp/vis-after /tmp/vis-diff
```
Deterministische Screenshots aller Seiten und Tabs; `compare.py` ignoriert Kantenglättungs-Rauschen der Schrift und
legt für echte Änderungen Nebeneinander-Bilder (vorher | nachher | Differenz) an.
