---
name: beispiele-ergaenzen
description: Weitere Übungsbeispiele in eine bestehende Seite der Ukrainisch-Lernseite eintragen oder vorhandene korrigieren – Sätze, Wörter, Wendungen, Verben in data/<name>.json. Verwenden, wenn der Nutzer mehr Beispiele, neue Wörter/Sätze oder Korrekturen an Inhalten möchte (nicht für neue Übungsarten oder Seiten).
---

# Beispiele ergänzen

Die Übungsinhalte stehen in `data/<name>.json`, nicht in den HTML-Seiten. Für neue Beispiele wird **nur die JSON-Datei**
geändert; die Seite lädt sie beim Start (`UK.loadData`). Das Format jeder Datei beschreibt `data/README.md`.

## 1. Vorbereiten

- Branch vom aktuellen `main` neu aufsetzen (Skill `feature-ausliefern`, Schritt 1).
- `data/README.md` und einige vorhandene Einträge der Liste lesen: Stil, Länge und Art der Sätze übernehmen.
- Unklar, was genau ergänzt werden soll (Thema, Umfang, welche Übungsart)? Kurz beim Nutzer nachfragen.

## 2. Einträge schreiben

Gemeinsame Regeln (Details pro Datei in `data/README.md`):

- Alle Texte zweisprachig als `{"de": "…", "en": "…"}`; optionale Notizen entweder in beiden Sprachen oder `""` in beiden.
- Ukrainischer Apostroph immer `’` (U+2019); keine lateinischen Buchstaben in ukrainischen Wörtern.
- Genau eine Lücke `___` pro Satz; `answers[0]` ist die normgerechte Hauptlösung, Varianten danach.
- Verweise müssen existieren: `rule` → `rules`, `category` → `categories`, `topic` → `topics`, Verben in `items` → `verbs`.
  Neue Regel oder Kategorie → zuerst dort eintragen (Titel und Text in beiden Sprachen).
- Fall-Trainer: genau 3 `distractors`, alle verschieden und keiner gleich einer Lösung (andere Fälle desselben Wortes).
  Wörter für „Grundform bestimmen“ (`reverse`) dürfen nicht in `items` vorkommen – eigene Wortliste.
- Verb-Trainer: `items` und `reverse` haben keine gemeinsamen Sätze; `reverse`-Sätze meist ohne Pronomen.
- Smalltalk-`replies` verweisen auf vorhandene `phrases[].uk`.
- Natürliche, alltagsnahe Sätze; Übersetzungen idiomatisch, nicht Wort für Wort.
- Keine Duplikate (gleicher Satz mit gleicher Grundform, gleiches Wort, gleiche Wendung).
- **Unsicher?** (Wortwahl, Variante, Natürlichkeit, Übersetzung) → Eintrag trotzdem aufnehmen, aber mit
  `"review": {"de": "…", "en": "…"}` und dem konkreten Zweifel markieren. Solche Einträge erscheinen in `data/index.html`
  gesammelt unter „Bitte prüfen“. Ist der Zweifel geklärt: korrigieren und `review` entfernen.

**Lernfortschritt:** Er hängt an den kennzeichnenden Feldern eines Eintrags (z. B. Kategorie + Grundform + Hauptlösung,
Satz, Wort bzw. ukrainische Wendung). Neue Einträge sind unproblematisch. Werden diese Felder bei einem **vorhandenen**
Eintrag geändert, beginnt sein Fortschritt bei den Lernenden von vorn – Korrekturen trotzdem machen, aber im Commit erwähnen.

Generator-Seiten (`numbers`, `time`, `dates`) enthalten nur Wortlisten; dort entstehen keine „Beispiele“ durch neue Einträge.
Änderungen an diesen Listen verändern die erzeugten Lösungen – mit dem Seitentest prüfen.

## 3. Prüfen

```bash
node tests/check-data.js data/<name>.json   # Format, Verweise, Duplikate, Apostroph …
node tests/run.js <name> daten generic       # Seite mit den neuen Daten im Browser
```
Beide müssen fehlerfrei sein. Neue Einträge inhaltlich selbst gegenlesen (Endung passt zur Regel, Genus, Aspekt, Übersetzung).
Bei vielen neuen Einträgen eine Stichprobe im Browser ansehen: `node tests/run.js <name> --shots <scratchpad>/shots`.

## 4. Ausliefern

- Commit (Englisch), z. B. `Add 20 genitive sentences with quantities`, mit Anzahl und Art der Einträge.
- Weiter mit Skill `feature-ausliefern` (Push; Pull Request nur auf Wunsch des Nutzers).
- Dem Nutzer kurz auflisten, was ergänzt wurde (Anzahl je Liste, Beispiele), und empfehlen, die neuen Sätze von
  Muttersprachlern prüfen zu lassen.
