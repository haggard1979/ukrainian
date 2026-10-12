---
name: neue-uebungsseite
description: Neue Übungsseite (Trainer) für die Ukrainisch-Lernseite anlegen – z. B. einen weiteren Fall (Genitiv, Dativ …), eine Zeitform, ein Vokabelthema. Verwenden, wenn der Nutzer eine neue Seite, einen neuen Trainer oder ein neues Thema möchte.
---

# Neue Übungsseite anlegen

Ziel: eine neue, eigenständige HTML-Seite, die genauso aussieht und sich genauso bedient wie die bestehenden Trainer.
Gemeinsames Aussehen und Verhalten kommt aus `assets/` (siehe CLAUDE.md, Abschnitt „Gemeinsame Bausteine“) –
**nicht** kopieren, sondern einbinden.

## 1. Vorlage wählen

| Neue Seite ähnelt …                                   | Vorlage                                         |
|-------------------------------------------------------|-------------------------------------------------|
| Fall (Endung in Satzlücke, Grundform rückwärts)       | `grammar/accusative/accusative-trainer.html`    |
| Verbformen mit Konjugationstabelle                    | `grammar/present/…` bzw. `grammar/past/…`       |
| Lösungen per Funktion erzeugt + „Umwandeln“           | `grammar/numbers/…`, `grammar/time/…`, `grammar/dates/…` |
| Vokabeln/Wendungen mit „Lernen“ + „Üben“              | `grammar/when/…` (Zeitstrahl) bzw. `smalltalk/…` |

Bei Unklarheit, welcher Typ passt oder was genau geübt werden soll, den Nutzer kurz fragen (Modi, Umfang).

## 2. Gerüst erzeugen

Aus dem Repo-Wurzelverzeichnis:

```bash
python3 .claude/skills/neue-uebungsseite/scaffold.py <vorlage.html> grammar/<thema>/<thema>-trainer.html <speichername> "<Titel deutsch>"
```

Das Skript setzt Asset-Pfade und Zurück-Link passend zur Verzeichnistiefe, `<title>`, `T.de.title`,
`var KEY='<speichername>.v1'` und `window.__<speichername>`. Alles andere wird danach von Hand ersetzt.

Pflicht im `<head>` (macht das Skript bereits richtig):
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600&family=Onest:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../../assets/tokens.css">
<link rel="stylesheet" href="../../assets/trainer.css">
<script src="../../assets/common.js"></script>   <!-- ohne defer: setzt das Theme vor dem ersten Rendern -->
```
Seitenspezifisches CSS: im `<style>`-Block direkt am Anfang des `<body>`, nur Farb-Tokens verwenden (`var(--blue)` …),
damit Dunkel-Modus automatisch funktioniert.

## 3. Inhalt ersetzen

- `h1 lang="uk"`, Einleitungstext (`data-show-lang="de"` / `"en"`), Tabs, Modus-Knöpfe.
- Daten im Format des Seitentyps (CLAUDE.md, „Seiten-Typen“). Fall-Trainer: eigene Wortliste für `rev`.
- `T.de` **und** `T.en` vollständig (auch `title`, Regeln, Notizen, Hinweise). Keine Texte nur auf Deutsch.
- Ukrainisch im Markup mit `lang="uk"`, Apostroph `’`. Varianten großzügig akzeptieren, Normform zuerst.
- `norm()` an das Thema anpassen (z. B. welche Präpositionen/Pronomen vorne ignoriert werden).
- Die Verdrahtung mit `assets/common.js` aus der Vorlage unverändert lassen:
  `UK.stitch()`, `var lang=UK.initialLang()`, in `setLang` `UK.storeLang(l)`, `speak`/`sayButton` → `UK.speak`/`UK.sayButton`,
  `UK.initAutoSay(store,save)`, `renderTheme()` → `UK.renderTheme(lang)`, `UK.initTheme(function(){return lang;})`.
  `renderTheme()` muss in `applyLang()` aufgerufen werden.
- Fehlt etwas Gemeinsames (neue Komponente, die mehrere Seiten brauchen könnten), gehört es nach
  `assets/trainer.css` bzw. `assets/common.js` – danach alle Seiten kurz prüfen (Skill `seite-testen`, visueller Vergleich).

## 4. Einbinden

- `index.html`: Eintrag in der passenden Liste (`<li><a href="grammar/<thema>/<thema>-trainer.html">` mit
  `<span class="title" data-i18n="<key>">` und `<span class="uk" lang="uk">…</span>`), dazu `<key>` in `T.de` und `T.en`.
- `CLAUDE.md`: Strukturliste, `localStorage`-Schlüssel und Test-Hook ergänzen.

## 5. Prüfen und ausliefern

- Daten und Seite mit dem Skill `seite-testen` prüfen (Datencheck, Playwright, Screenshots 390 px hell/dunkel).
- Danach Skill `feature-ausliefern` (Commit, Push; PR nur auf Wunsch des Nutzers).
- Dem Nutzer empfehlen, die selbst verfassten Sätze/Übersetzungen von Muttersprachlern prüfen zu lassen.
