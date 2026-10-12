---
name: feature-ausliefern
description: Fertiges Feature der Ukrainisch-Lernseite ausliefern – Branch vorbereiten, committen, pushen und (nur auf Wunsch des Nutzers) Pull Request erstellen und per Merge-Commit nach main mergen. Verwenden zu Beginn einer neuen Aufgabe (Branch neu aufsetzen) und wenn ein Feature fertig ist oder der Nutzer „commit and push“ bzw. „erstelle den Pull Request und merge ihn“ sagt.
---

# Feature ausliefern

Repo: `haggard1979/ukrainian`, GitHub Pages aus `main`. Entwicklungs-Branch: `claude/trusting-newton-0teko1`.
Kein `gh`-CLI – GitHub-Aktionen über die `mcp__github__*`-Werkzeuge (bei Bedarf per ToolSearch laden).

## 1. Vor einer neuen Aufgabe: Branch neu aufsetzen

Pull Requests werden jeweils gemergt, daher vom aktuellen `main` neu starten:
```bash
git status --short                       # muss leer sein; sonst erst klären, was mit den Änderungen passiert
git fetch origin main claude/trusting-newton-0teko1
git log --oneline origin/main..origin/claude/trusting-newton-0teko1   # leer = alles gemergt
git checkout -B claude/trusting-newton-0teko1 origin/main
```
Hat der Branch noch **nicht gemergte** Commits, nicht verwerfen: auf `origin/main` rebasen oder den Nutzer fragen.

## 2. Vor dem Commit prüfen

- Skill `seite-testen` für alle geänderten Seiten (Datencheck, `smoke.js`, Antwort-Test; bei `assets/`-Änderungen
  zusätzlich der visuelle Vergleich über alle Seiten). Keine Fehler, kein `console.error`.
- `git diff` selbst lesen: keine Testskripte, Screenshots oder Scratchpad-Dateien im Repo, keine Debug-Ausgaben.
- Neue Seite: in `index.html` (DE+EN) und in `CLAUDE.md` (Struktur, Speicher-Schlüssel, Test-Hook) eingetragen?

## 3. Commit und Push

Commit-Message auf Englisch (Kurzzeile im Imperativ, danach Stichpunkte, was und warum). Am Ende die
Attributionszeilen, die die aktuelle System-Erinnerung vorgibt (Co-Authored-By / Claude-Session). Keine Modellnamen
oder -IDs in Commit, PR oder Code.
```bash
git add -A && git commit -F <scratchpad>/msg.txt
git push -u origin claude/trusting-newton-0teko1
```
Push nur bei Netzwerkfehlern wiederholen: bis zu 4-mal mit 2 s, 4 s, 8 s, 16 s Pause.

## 4. Pull Request – nur auf ausdrücklichen Wunsch

Erst wenn der Nutzer es sagt (üblich: „ja, erstelle den Pull Request und merge ihn“):
1. `mcp__github__create_pull_request`: owner `haggard1979`, repo `ukrainian`, head `claude/trusting-newton-0teko1`, base `main`.
   Titel auf Deutsch. Beschreibung auf Deutsch mit den Abschnitten:
   ```markdown
   ## Zusammenfassung
   - was gebaut/geändert wurde (Stichpunkte)

   ## Test
   - womit und mit welchem Ergebnis getestet wurde (Anzahl Aufgaben pro Modus, Fehler 0, Screenshots 390 px hell/dunkel)
   ```
   Am Ende die PR-Attributionszeilen aus der aktuellen System-Erinnerung.
2. `mcp__github__merge_pull_request` mit `merge_method: "merge"` (Merge-Commit, kein Squash/Rebase) und
   `sha` = vollständiger 40-stelliger Hash von `git rev-parse HEAD` (muss dem gepushten Stand entsprechen).
3. Ergebnis prüfen (`git fetch origin main` und `git log --oneline -3 origin/main`). Die Seite ist danach nach kurzer Zeit
   unter `https://haggard1979.github.io/ukrainian/` online.

Ohne Aufforderung keinen PR anlegen; nach dem Push stattdessen fragen, ob ein PR erstellt und gemergt werden soll.

## 5. Abschluss an den Nutzer (Deutsch)

- Screenshots der neuen/geänderten Seite schicken (SendUserFile; Handy-Breite, hell und dunkel).
- Kurz zusammenfassen: was gebaut wurde, was getestet wurde (mit Zahlen), Commit/PR-Link.
- Bei neuen Inhalten empfehlen, Sätze und Übersetzungen von Muttersprachlern prüfen zu lassen.
