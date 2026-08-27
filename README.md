# KI-Tool-Ideen-Generator

Eine interaktive Web-App für selbständige Berater, Coaches, Heiler und Experten:
In sieben kurzen Fragen entstehen 5 individuelle, außergewöhnliche KI-Tool-Ideen,
die exakt zur eigenen Zielgruppe, zum eigenen Angebot und zur eigenen Methode passen.

## Nutzung

Die App läuft komplett im Browser – keine Anmeldung, keine Datenbank, keine externen
API-Aufrufe. Alle Angaben werden ausschließlich lokal verarbeitet und nirgends
gespeichert oder übertragen.

- Lokal öffnen: `index.html` direkt im Browser öffnen, oder
- Lokal per Server testen: `python3 -m http.server` im Projektordner starten und
  `http://localhost:8000` aufrufen.
- **GitHub Pages:** Repository-Einstellungen → *Pages* → Branch auswählen, aus dem
  `index.html` im Wurzelverzeichnis direkt ausgeliefert wird.

## Projektstruktur

```
index.html      Struktur & Inhalte aller Bildschirme (Start, 7 Fragen, Ergebnisse)
css/style.css   Responsives Premium-Design
js/app.js       Navigation, Validierung und regelbasierte Ideen-Generierung
```

## Funktionsweise der Ideen-Generierung

Aus den sechs inhaltlichen Antworten (Zielgruppe, Problem, Traum-Ergebnis,
Haupt-Angebot, Expertise, eigene Methode) werden fünf unterschiedliche Tool-Konzepte
abgeleitet – jeweils aus einer anderen Kategorie (Diagnose, Analyse/Audit, Strategie,
Coach, Matcher) und einem anderen interaktiven Format. Jedes Feld einer Ergebnis-Karte
(Hook, Eingaben, Ergebnis, WOW-Moment, Expertise-Bezug, Brücke zum Angebot) wird
sichtbar aus den konkreten Nutzerantworten gebildet. Zusätzlich wird jede Idee anhand
von sieben Kriterien bewertet, die stärkste Idee automatisch als Top-Empfehlung
markiert und mit Gewinn-Argumenten versehen.
