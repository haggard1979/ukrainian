# Ukrainisch lernen – Projektnotizen für Claude

Statische Lern-Website für Ukrainisch (Zielgruppe: deutschsprachige Lernende, Oberfläche Deutsch/Englisch umschaltbar).
Gehostet über GitHub Pages aus `main` (`https://haggard1979.github.io/ukrainian/`). Kein Build, keine Abhängigkeiten,
kein Backend. Jede Seite ist eine HTML-Datei mit ihrer Logik, ihren Oberflächentexten und ihrem seitenspezifischen CSS;
die Übungsdaten liegen als JSON in `data/` (siehe unten), gemeinsames Aussehen und Verhalten in drei Dateien in `assets/`.
Weil die Seiten ihre Daten per `fetch()` laden, funktionieren sie nur über HTTP (GitHub Pages; lokal z. B.
`python3 -m http.server` im Repo-Ordner), nicht als `file://` – dann erscheint ein Hinweis statt der Übung.

Der Nutzer schreibt Deutsch; Antworten an ihn auf Deutsch. Code, Kommentare und Commit-Messages auf Englisch.

## Struktur

```
assets/tokens.css                           Farb-Tokens hell/dunkel, Schriften, Größen (alle Seiten inkl. Startseite)
assets/trainer.css                          Layout und Komponenten der Trainer-Seiten (nicht index.html)
assets/common.js                            Gemeinsames JS als window.UK: Theme, Sprache, Kreuzstich, Vorlesen, Daten laden
data/<name>.json                            Übungsdaten je Seite mit benannten Feldern, Format in data/README.md
tests/                                      Testsuite (node tests/run.js), siehe tests/README.md
tools/previews.json, tools/previews.js      Icons + Link-Vorschau (Teams, WhatsApp …): Titel/Beschreibung je Seite → Bilder und <head>-Tags
assets/icons/, favicon.ico, site.webmanifest  Icons (Ї in Gold auf Blau), von tools/previews.js erzeugt
assets/preview/<name>.png                   Vorschaubild je Seite (1200 × 630, Open Graph), von tools/previews.js erzeugt
README.md                                   Projektbeschreibung für Menschen (Seitenübersicht, lokal ansehen, Beispiele eintragen)
.claude/skills/                             Projekt-Skills: neue-uebungsseite, beispiele-ergaenzen, seite-testen, feature-ausliefern
index.html                                  Startseite: Wappen + Flagge, Abschnitte Grammatik / Smalltalk / Tippen
grammar/locative/locative-trainer.html      Lokativ (Місцевий відмінок) – Vorlage der Fall-Trainer
grammar/accusative/accusative-trainer.html  Akkusativ (Знахідний відмінок) – aus dem Lokativ-Trainer abgeleitet
grammar/genitive/genitive-trainer.html      Genitiv (Родовий відмінок) – aus dem Akkusativ-Trainer abgeleitet
grammar/gender/gender-trainer.html          Genus von Nomen + Adjektiv-/Pronomen-Kongruenz (Рід): Genus bestimmen, Adjektiv wählen/tippen
grammar/pronouns/pronouns-trainer.html      Personalpronomen (Особові займенники) in allen Fällen inkl. н-Formen nach Präpositionen
grammar/numbers/numbers-trainer.html        Grundzahlen (Числівники) + Umwandler
grammar/counting/counting-trainer.html      Zahl + Nomen (Числівник + іменник): один брат / два брати / п’ять братів + Umwandler
grammar/ordinals/ordinals-trainer.html      Ordnungszahlen (Порядкові числівники) bis 9 999 in allen Fällen/Genera + Umwandler
grammar/time/time-trainer.html              Uhrzeiten (Котра година?) + Umwandler mit klickbarem Ziffernblatt
grammar/dates/dates-trainer.html            Wochentage, Monate, Datum, Jahreszahlen (Дні, місяці, роки) + Datums-Umwandler
grammar/when/when-trainer.html              Zeitangaben (Коли?): Jahres-/Tageszeiten, gestern/morgen, nächste Woche …
grammar/present/present-trainer.html        Präsens (Теперішній час) + durchsuchbare Verbliste
grammar/past/past-trainer.html              Vergangenheit (Минулий час) + durchsuchbare Verbliste
smalltalk/smalltalk-trainer.html            Smalltalk-Wendungen (Розмова) – Vorlage der Vokabel-Trainer
typing/typing-trainer.html                  Tipp-Trainer (Набір тексту) mit Zeitmessung
```

Pfadregel: Seiten in `grammar/<thema>/` verlinken zurück mit `../../index.html`, binden `../../assets/…` ein und laden `../../data/…`,
Seiten in `smalltalk/` und `typing/` entsprechend mit `../`.
Neue Grammatik-Seiten kommen nach `grammar/<thema>/<thema>-trainer.html` und werden in `index.html` und `README.md` eingetragen.
Weitere Beispiele für eine bestehende Seite: nur `data/<name>.json` ändern (Skill `beispiele-ergaenzen`).

**Link-Vorschau und Icons:** Jede Seite hat im `<head>` einen erzeugten Block zwischen `<!-- preview … -->` und `<!-- /preview -->`
(Beschreibung, `theme-color`, Favicon, Apple-Touch-Icon, Manifest, Open-Graph- und Twitter-Tags). Nicht von Hand ändern:
Titel, ukrainischer Name und Beschreibung stehen in `tools/previews.json`; danach `node tools/previews.js` ausführen
(erzeugt Icons, `assets/preview/*.png`, Manifest und die Blöcke neu; braucht Google Fonts). `og:image` muss eine absolute URL
sein – sie hängt an `baseUrl` in `tools/previews.json` (bei Umzug der Seite anpassen). `tests/pages/meta.test.js` prüft alles.

## Gemeinsame Bausteine (ausgelagert nach `assets/`)

Gemeinsames liegt **einmal** in `assets/` – eine Korrektur dort wirkt auf alle Seiten. Deshalb nach jeder Änderung an
`assets/` alle Seiten prüfen (Skill `seite-testen`, visueller Vorher/Nachher-Vergleich). Nichts davon in Seiten zurückkopieren.

- **Kopf jeder Trainer-Seite** (Pfade je nach Tiefe):
  ```html
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600&family=Onest:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="../../assets/tokens.css">
  <link rel="stylesheet" href="../../assets/trainer.css">
  <script src="../../assets/common.js"></script>
  ```
  `common.js` ohne `defer`: es setzt das gespeicherte Theme (`data-theme`) vor dem ersten Rendern und setzt `no-tts`.
  Seitenspezifisches CSS kommt in einen `<style>`-Block am Anfang des Bodys. `index.html` bindet nur `tokens.css` und
  `common.js` ein und hat ihr eigenes Layout-CSS im `<head>`.
- **`assets/tokens.css`** – Farb-Tokens (in `:root`, Dark-Varianten unter `@media (prefers-color-scheme: dark)` mit
  `:root:not([data-theme="light"])` und unter `:root[data-theme="dark"]`): `--bg --surface --field --ink --muted --line --blue
  --blue-soft --on-blue --gold --gold-soft --red --red-soft --green --green-soft`, Schriften `--font-uk` (Fira Sans, für Ukrainisch)
  und `--font-ui` (Onest), Schriftgrößen `--fs-*`, `--radius`. Seiten-CSS verwendet nur diese Tokens (dann klappt Dunkel automatisch).
- **`assets/trainer.css`** – Grundregeln, Layout und alle wiederkehrenden Komponenten (Kopfzeile, Tabs, `.seg`, `.chip`, `.card`,
  Feedback `.fb`, `.kb`, `.opts`, Statistik, Regeln, `.say`, `.say-note`, Flaggenstreifen, Kreuzstich) inkl. „Ukrainian theme“-Block.
  Eine Komponente, die mehrere Seiten nutzen (könnten), gehört hierher statt ins Seiten-CSS.
- **`assets/common.js`** – API auf `window.UK`; die Seite behält ihren Zustand (`lang`, `store`) und reicht ihn hinein:
  | Funktion | Zweck |
  |---|---|
  | `UK.initialLang()` / `UK.storeLang(l)` | Sprache aus `localStorage['ukrainian.lang']` bzw. `navigator.language` / speichern |
  | `UK.renderTheme(lang)` / `UK.initTheme(getLang)` | Knopf `#theme-toggle` beschriften / verdrahten (`localStorage['ukrainian.theme']`, Systemwechsel) |
  | `UK.stitch()` | Kreuzstich-Muster in `<pattern id="stitch-tile">` erzeugen |
  | `UK.speak(text)` / `UK.sayButton(btn,getText)` | Vorlesen nur mit ukrainischer Stimme, sonst Hinweis `#say-note` / Lautsprecher-Knopf |
  | `UK.initAutoSay(store,save)` | Chip `#auto-say` ↔ `store.say` |
  | `UK.loadData(url,init)` | JSON laden, dann `init(D)`; `<html data-ready>` = `0` → `1` (bzw. `error` mit Hinweis `#load-error`) |
  | `UK.rows(list,paths)` / `UK.rules(rules,lang)` / `UK.cats(list)` | Adapter: benannte JSON-Datensätze → interne Positions-Arrays bzw. `{t,x}`-Regeln, `{id,label,en}`-Kategorien |

  Verdrahtung in jeder Trainer-Seite (aus einer bestehenden Seite übernehmen):
  ```js
  UK.stitch();
  var lang=UK.initialLang();            // in setLang(l): lang=l;UK.storeLang(l);
  function speak(text){UK.speak(text);}
  function sayButton(btn,getText){return UK.sayButton(btn,getText);}
  UK.initAutoSay(store,save);
  function renderTheme(){UK.renderTheme(lang);}   // wird in applyLang() aufgerufen
  UK.initTheme(function(){return lang;});
  ```
  Neue gemeinsame Funktionen kommen nach `common.js` (als `UK.xyz`), nicht in die einzelnen Seiten.
- **Übungsdaten (`data/<name>.json`):** Das Seitenskript steht in `UK.loadData('../../data/<name>.json',function(D){ … });`.
  Am Anfang macht ein Adapter daraus die internen Variablen, z. B.
  `var RAW=UK.rows(D.items,['category','base','gloss.de',…]);`, `var RULES=UK.rules(D.rules,'de');`, `var CATS=UK.cats(D.categories);`.
  Die übrige Seitenlogik arbeitet mit diesen Variablen wie früher. Inhalte also **in der JSON-Datei** ändern, nicht in der Seite.
  Die JSON-Dateien sind so gebaut, dass sie später ein REST-Service ausliefern kann (Format: `data/README.md`).
- **In jeder Seite (bewusst nicht ausgelagert, weil seitenabhängig):** `T={de,en}` mit allen Oberflächentexten, Regeln-Tab, `norm()`,
  Aufgabenauswahl/Fortschritt, Bildschirmtastatur-Belegung, Markup der Kopfzeile (Flaggen-SVGs). Bei Änderungen an diesen
  Mustern (z. B. Verbsuche, `norm()`) prüfen, ob dieselbe Korrektur in anderen Seiten nötig ist.

Weitere gemeinsame Regeln und Muster:

- **Design-Regeln:** gedecktes Blau/Gold („ukrainisches Thema, nicht schreiend“). Blau = Bedienelemente, Gold = Schmuck
  (Kartenoberkante, Rauten vor Überschriften), **Rot/Grün nur für Feedback** (richtig/falsch). Flaggenstreifen oben
  (`body::before`), Kreuzstich-Bordüre oben und unten (`.stitch`, Muster per JS in `#stitch-tile` erzeugt).
  Wappen/Flagge nur auf `index.html`, dort in offiziellen Farben (`#005bbb` / `#ffd500`).
- **Kopfzeile:** `.head-row` mit `h1 lang="uk"` und `.head-tools` = Hell/Dunkel-Knopf `#theme-toggle` + Sprachumschalter
  (Flaggen 🇦🇹 für Deutsch, 🇬🇧 für Englisch als Inline-SVG, **nicht** Deutschland, keine Emoji-Flaggen).
- **Sprache (i18n):** `T={de:{…},en:{…}}`, `t(key)`; statische Texte über `data-i18n`, `data-i18n-aria`, `data-i18n-ph`;
  ganze Blöcke über `data-show-lang="de|en"`. `applyLang()` setzt alles, `setLang()` rendert offene Karte/Feedback neu.
  Sprachwahl in `localStorage['ukrainian.lang']` (seitenübergreifend); Default nach `navigator.language`.
- **Vorlesen:** Chip `#auto-say` (automatisch vorlesen) und Hinweis `#say-note`, wenn keine ukrainische Stimme installiert ist
  (kein Ausweichen auf andere Stimmen). Ohne Speech-API bekommt `<html>` die Klasse `no-tts` und alle `.say`/`.say-ui` verschwinden.
- **Bildschirmtastatur** (`#kb`): ukrainische Buchstaben + `’`, je nach Seite Leertaste, `⌫`; Ein/Aus wird gespeichert.
- **Antwortvergleich:** `norm()` ist bewusst tolerant: Kleinschreibung, Betonungszeichen weg, `' ʼ ‘ ’` vereinheitlicht,
  lateinische Doppelgänger (a e i o p c x y) → kyrillisch, Satzzeichen/Mehrfach-Leerzeichen ignoriert, je nach Seite
  führende Präpositionen/Pronomen/`сьогодні`/`зараз` entfernt. Lateinische Eingaben lösen einen Hinweis aus.
  Mehrwort-Antworten zeigen im Feedback einen Wortvergleich (`lcs()`: falsche Wörter durchgestrichen, fehlende markiert).
- **Fortschritt:** Jede Seite hat ihren eigenen `localStorage`-Schlüssel (`lokativ.v1`, `akkusativ.v1`, `genitiv.v1`, `gender.v1`, `pronouns.v1`, `numbers.v1`, `counting.v1`, `ordinals.v1`, `time.v1`,
  `dates.v1`, `when.v1`, `present.v1`, `past.v1`, `smalltalk.v1`, `typing.v1`). Auswahl: Gewichtung nach Lernstand
  (`s>=2` = sicher), falsche Aufgaben kommen nach 3 Runden wieder (`retry`). Alle Zugriffe auf `localStorage` in `try/catch`.
- **Tastatur-Bedienung:** Enter = weiter nach dem Feedback (250-ms-Sperre gegen Doppel-Enter), 1–4 bzw. 1–6 für Auswahl-Knöpfe.
- Test-Hooks: viele Seiten legen ihre Daten auf `window.__<name>` (z. B. `__lokativ`, `__akkusativ`, `__genitiv`, `__gender`, `__pronouns`, `__numbers`, `__counting`, `__ordinals`, `__time`,
  `__dates`, `__when`, `__present`, `__past`, `__smalltalk`, `__typing`) – nur für automatisierte Tests.

## Seiten-Typen und Vorlagen

Die Datenfelder aller Seiten beschreibt `data/README.md`; hier nur das Verhalten.

1. **Fall-Trainer** (Lokativ, Akkusativ, Genitiv): Modi `type` (Form tippen), `choice` (aus 4 Formen), `prep` (Lokativ: „в oder на?“;
   Akkusativ: „Wohin oder wo?“; Genitiv: „Nominativ oder Genitiv?“), `rev` (Grundform + Genus bestimmen, **eigene Wortliste**
   `reverse`, nicht die der Tipp-Übungen `items`). Regeln in `rules`, Wortarten in `categories`.
2. **Verb-Trainer** (Präsens, Vergangenheit): Verbtabellen `verbs`, Übungssätze `items`, eigene Sätze für „Grundform bestimmen“
   `reverse` (meist ohne Pronomen bzw. Subjekt). Feedback zeigt immer die ganze Konjugations-/Formentabelle. Vergangenheit:
   Sätze mit я/ти tragen einen Geschlechtshinweis (`who`), in `rev` erscheint die Übersetzung erst nach der Antwort.
3. **Generator-Trainer** (Zahlen, Zahl + Nomen, Ordnungszahlen, Uhrzeiten, Datum): Lösungen werden per Funktion aus den Wortlisten erzeugt, erste Variante =
   Hauptlösung, weitere Varianten werden akzeptiert. Jeweils Tab „Umwandeln“. Uhrzeiten: Umgangssprache (на/пів на/за), offiziell
   (24 h), „О котрій?“ (о/об + Lokativ), Wort → Uhrzeit. Datum: nur der letzte Teil einer Jahreszahl ist Ordnungszahl.
   Zahl + Nomen: Klasse nach der letzten Ziffer (`classify`: 1 → Nom. Sg., 2–4 → Nom. Pl., sonst/11–14 → Gen. Pl.), Zahlwort im
   Genus des Nomens; Aufgaben = Nomen × Klasse nach Lernstand, die Zahl wird passend gezogen (11–14 bevorzugt).
   Ordnungszahlen: `split(n)` zerlegt in Grundzahlen davor + Stamm des letzten Elements (runde Tausender ein Wort: двотисячний),
   `forms(n,Genus,Fall,belebt)` hängt die Endung an (harter/weicher Stamm, nur трет- weich); Aufgaben-Muster = letztes Wort × Genus;
   Sätze (`items`) üben Fälle, ihre `answers` werden im Test gegen den Generator geprüft.
4. **Vokabel-Trainer** (Smalltalk, Zeitangaben): `topics` + `phrases`; Tabs „Lernen“ (Liste mit Vorlesen; Zeitangaben zusätzlich
   Zeitstrahl `timelines`) und „Üben“ (Karteikarten, Übersetzen, Smalltalk: „Passende Antwort“ über `replies`, Zeitangaben:
   „Auswählen“ mit Distraktoren aus demselben Thema).
5. **Genus-Trainer:** `nouns` (mit deutschem Wort samt Artikel), `plurals` (nur für Adjektiv-Übungen), `adjectives`.
   Adjektiv-Aufgaben = Adjektiv × Genus, das Nomen wird passend gezogen (Farben nicht mit Personen usw.).
   Abweichendes deutsches Genus wird aus dem Artikel erkannt und im Feedback erwähnt; „Nur Knackpunkte“ filtert Ausnahmen (`trickyRules`).
6. **Personalpronomen:** `pronouns` (Formen je Fall, `afterPreposition` = н-Formen), `items` (Satz, Pronomen, Fall, Antwort,
   Begründung), `reverse` (eigene Sätze). Modi: Form tippen/auswählen (die Form mit/ohne н- ist immer unter den Optionen),
   Fall bestimmen, Pronomen bestimmen (*його* → *він* und *воно* richtig). Die Seite liest die JSON-Objekte direkt (kein Positions-Adapter).
7. **Tipp-Trainer:** eigene Logik (Zeichen grau → schwarz, falsch = rot, fertig erst bei fehlerfreiem Text; zählt falsche
   Anschläge und Rücktaste; optional ЙЦУКЕН-Simulation über `KeyboardEvent.code`; Ergebnisse/Bestwerte in `typing.v1`).
   Daten: `sentences`, `words`.

Neue Seiten entstehen aus der ähnlichsten bestehenden Seite – Ablauf und Gerüst-Skript im Skill `neue-uebungsseite`.

## Inhaltliche Konventionen

- Ukrainischer Apostroph im Text immer `’` (U+2019), Eingabe von `'` wird akzeptiert.
- Ukrainische Wörter im Markup mit `lang="uk"` auszeichnen (Schrift + Vorlesen).
- Varianten großzügig akzeptieren (у/в, ввечері/увечері, -ся/-сь nach Vokal, йду/іду, Kurzformen …), aber die normgerechte
  Form als Hauptlösung anzeigen (z. B. *об одинадцятій*, *у* vor Konsonant / *в* vor Vokal).
- Alle Inhalte (Übersetzungen, Hinweise, Regeln) gibt es auf Deutsch **und** Englisch.
- Sätze/Übersetzungen sind selbst verfasst; beim Abschluss dem Nutzer empfehlen, sie von Muttersprachlern prüfen zu lassen.
- Daten vor dem Einbau prüfen: `node tests/check-data.js data/<name>.json` (Pflichtfelder de/en, genau eine Lücke `___`,
  Regel-Keys vorhanden, keine Duplikate, Lösung ≠ Distraktoren, keine Überschneidung zwischen Übungs- und Rückwärts-Liste …).
  Inhaltliches (Endungen passen zur Gruppe, Sätze natürlich) zusätzlich selbst prüfen.

## Testen

Feste, wiederholbare Testsuite in `tests/` (Details `tests/README.md`, Ablauf im Skill `seite-testen`):
```bash
node tests/run.js                  # alles: Datencheck + Browser-Tests aller Seiten, ≈ 1 Minute, muss "0 failed" melden
node tests/run.js locative --shots <dir>
```
`tests/pages/generic.test.js` prüft jede Seite allgemein (Link, Handy-Breite, DE/EN, Hell/Dunkel, Tabs/Modi, Vorlesen),
`common.test.js` das gemeinsame JS, `<seite>.test.js` die Antworten aller Modi und Sonderfunktionen je Trainer.
**Neue Seiten und neue Funktionen bekommen Tests in `tests/pages/`.** Die Tests starten selbst einen kleinen Webserver
(wegen `fetch()` der Daten) und warten, bis `<html data-ready="1">` gesetzt ist. Playwright ist global installiert, Chromium unter
`/opt/pw-browsers` – **nicht** `playwright install` ausführen. Die Sprachausgabe wird in den Tests durch eine Fake-Stimme ersetzt.
Screenshots (`--shots`) bei 390 px hell und dunkel ansehen; Screenshots und Wegwerf-Skripte gehören ins Scratchpad.

Netzwerk: Wikimedia/jsDelivr/unpkg sind in der Cloud-Umgebung gesperrt, die npm-Registry ist erreichbar
(so kam das Wappen-SVG aus dem npm-Paket `coat-of-arms`, MIT).

## Arbeitsablauf (so wie bisher mit dem Nutzer vereinbart; Details im Skill `feature-ausliefern`)

- Entwicklungs-Branch: `claude/trusting-newton-0teko1`. Vor jeder neuen Aufgabe vom aktuellen `main` neu aufsetzen
  (`git fetch origin main && git checkout -B claude/trusting-newton-0teko1 origin/main`), da Pull Requests jeweils gemergt werden.
- Pro Feature: committen, pushen, dann auf Nachfrage des Nutzers Pull Request erstellen und per **Merge-Commit** nach `main` mergen
  (der Nutzer bestätigt das jeweils mit „ja, erstelle den Pull Request und merge ihn“). Ohne Aufforderung keinen PR anlegen.
- PR-Beschreibung auf Deutsch mit „Zusammenfassung“ und „Test“.
- Nach Abschluss eines Features dem Nutzer Screenshots schicken und kurz zusammenfassen, was gebaut und getestet wurde.
