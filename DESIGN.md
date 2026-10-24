---
version: alpha
name: "Raumplaner Wohnung"
description: "Ein lokaler, maßhaltiger Wohnungsplaner als ruhiger digitaler Architekten-Arbeitstisch."
colors:
  primary: "#274C52"
  ink: "#203034"
  muted: "#6D7777"
  paper: "#F2EFE8"
  panel: "#FFFDF9"
  line: "#D8D6CF"
  accent-soft: "#DCE7E6"
  chrome: "#172629"
  canvas: "#EBE8DF"
  measure: "#94502F"
  danger: "#B64D45"
  danger-soft: "#F6DFDC"
typography:
  sans:
    fontFamily: "var(--font-geist-sans), Arial, sans-serif"
  utility:
    fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  DEFAULT: "0.625rem"
  sm: "0.4375rem"
  md: "0.75rem"
  lg: "1.125rem"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  panel: "1rem"
  section: "1.5rem"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel}"
    rounded: "{rounded.sm}"
    height: "2.125rem"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  toolbar:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.paper}"
    height: "4.625rem"
  status:
    backgroundColor: "{colors.chrome}"
    textColor: "{colors.accent-soft}"
    height: "2.125rem"
  room-plan:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
  measure-label:
    backgroundColor: "{colors.measure}"
    textColor: "{colors.paper}"
  danger-alert:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.panel}"
  caption:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.muted}"
  divider:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
  danger-surface:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.ink}"
---

# Raumplaner Wohnung Design System

## Overview

### Creative North Star

Der Planer fühlt sich wie ein präziser Architekten-Arbeitstisch an: eine matte Zeichenfläche, eine dunkle Werkzeugleiste, ruhige Materialproben und eine orangebraune Maßspur. Die dominante Mitte bleibt Arbeitsfläche. Katalog, Eigenschaften und Dokumentdetails sind Werkzeuge, keine konkurrierenden Dashboards.

- **Zielgruppe und Hauptaufgabe:** Eine Bewohnerin oder ein Bewohner prüft lokal Möblierung, Abstände, Orientierung und Einrichtungsideen vor Kauf oder Aufbau.
- **Markt und Sprache:** Österreich, deutschsprachige Oberfläche, metrische Eingabe in Zentimetern und interne Geometrie in Metern.
- **Nutzungsszene:** Desktop- und Tablet-orientierte Planungsarbeit mit häufigem Wechsel zwischen 2D, 3D, Maßprüfung und Export.
- **Register:** Produktiv, technisch und wohnlich; keine Marketingoberfläche.
- **Signatur:** Die feine Maßleiste und das 5-cm-Zeichenraster rahmen dieselbe planrichtige Fläche in 2D und 3D.
- **Zurückhaltung:** Navigation, Eingaben, Warnungen und Exporte bleiben konventionell, ruhig und eindeutig.
- **Anti-Referenzen:** Kein generisches Analyse-Dashboard, keine Immobilienbroschüre, keine unbewiesene Fotorealistik, keine Kartenwand und keine abgeschnittene horizontale Raumleiste.

### Token ownership and runtime mapping

Das bestehende Laufzeit-System bleibt kanonisch. Globale Rollen liegen in `app/globals.css`; die planerbezogenen Ableitungen liegen in `app/planner/workspace/planner-workspace.css`. Dieses Dokument spiegelt die akzeptierten Werte und erklärt ihre Verwendung.

| DESIGN.md | Laufzeit | Verwendung |
|---|---|---|
| `colors.primary` | `--accent` | Auswahl, sichere Hauptaktionen, Fokuskontext |
| `colors.ink` | `--ink` | Text, technische Konturen |
| `colors.paper` | `--paper` | Dokumenthintergrund |
| `colors.panel` | `--panel`, `--planner-surface` | Katalog, Inspector, Drawer |
| `colors.chrome` | `--planner-chrome` | Werkzeug- und Statusleisten |
| `colors.canvas` | `--planner-canvas` | zentrale Planfläche |
| `colors.measure` | `--planner-measure` | Maße, Rastermarken, technische Hinweise |
| `colors.danger` | `--danger` | harte Kollisionen und Speicherfehler |
| `typography.utility` | `--font-geist-mono` | Maße, Status und Planmetadaten |
| `rounded.sm` | lokale 7-px-Kontrollen | kompakte Eingaben und Werkzeugknöpfe |

Neue planerbezogene Werte werden zuerst in der jeweiligen CSS-Tokenquelle geändert und in dieser Tabelle gespiegelt. Komponenten konsumieren semantische Variablen, keine unabhängigen Kopien.

## Colors

`paper` und `panel` bilden die matte Zeichenunterlage. `chrome` fasst Werkzeuge optisch zusammen, ohne die Arbeitsfläche zu verdunkeln. `ink` trägt Wände und Typografie. `measure` ist ausschließlich für Maß- und Orientierungshinweise vorgesehen. `danger` markiert harte Kollisionen oder nicht gespeicherte Änderungen; Informationen werden nie nur über Farbe vermittelt.

## Typography

Geist Sans trägt Navigation und Klartext. Geist Mono ist die technische Zweitstimme für Maße, Koordinaten, Status und Schemaangaben. Überschriften sind kompakt und leicht negativ gespationiert. Großbuchstaben bleiben kurzen Kicker-Labels vorbehalten. Zahlenfelder zeigen Einheiten sichtbar neben dem Wert.

## Layout

Die Arbeitsoberfläche besitzt vier feste Rollen: Werkzeugleiste oben, Katalog links, dominante Planfläche in der Mitte, Eigenschaften rechts und eine schmale Statusleiste unten. Dokumentdetails erscheinen als bewusst nicht-modaler Drawer. Unter 1024 px werden Katalog und Eigenschaften zu einzeln einblendbaren Werkzeugflächen über der weiterhin vollständig lesbaren Planfläche. Unter 640 px dürfen Werkzeuggruppen horizontal scrollen; wichtige Raum- und Ansichtsaktionen bleiben beschriftet.

Jede Zone besitzt ihren eigenen Scrollvertrag. Die Planfläche wird nicht durch lange Kataloginhalte verlängert. Panel-Scrollbars bleiben sichtbar und nutzen den globalen Scrollbarstil. Die Raumauswahl ist ein kompakter nativer Select; der plattformeigene Popup-Stil ist für diese einfache Auswahl ausdrücklich akzeptiert.

## Elevation & Depth

Hierarchie entsteht primär durch Tonflächen, Linien und das Raster. Stärkere Schatten sind auf schwebende Werkzeug-Drawer und die spätere 3D-Szene begrenzt. Der Plan selbst bleibt flach und maßorientiert. Der versetzte Schatten der leeren Planfläche ist die einzige plakative Tiefengeste des Shell-Zustands und entfällt, sobald der echte Canvas rendert.

## Shapes

Technische SVG- und Canvas-Linien bleiben präzise und eckig. Große Werkzeugflächen verwenden 11–18 px Radius nur, wenn sie schweben; fest eingebaute Seitenpanels bleiben kantiger. Kontrollen verwenden 7–10 px. Pillenformen sind Statuspunkten vorbehalten.

## Components

### Controls and states

Jedes interaktive Element besitzt Default, Hover, `focus-visible`, Aktiv, Deaktiviert und – falls anwendbar – Busy. Die Mindesthöhe kompakter Desktopkontrollen beträgt 34 px; wichtige Touchaktionen werden in späteren mobilen Ansichten auf mindestens 44 px erweitert. Icon-only-Aktionen benötigen einen deutschen zugänglichen Namen.

### Workspace panels

Katalog und Inspector sind Desktop-Seitenflächen und unter 1024 px nicht-modale Werkzeug-Drawer. Sie sperren die Planfläche nicht, beanspruchen keinen Fokus-Trap und werden über dieselben Toolbar-Schalter geöffnet und geschlossen. Der Dokument-Drawer stellt den Fokus beim Schließen auf seinen Auslöser zurück.

### Forms and direct manipulation

Jede Zieh-, Dreh- und Größenaktion erhält eine numerische Alternative mit beschriftetem Zahlenfeld. Position und Maße erscheinen in Zentimetern, die kanonische Speicherung erfolgt in Metern. Fehler werden am Plan oder Feld erklärt; Browserdialoge sind ausgeschlossen.

### Status and feedback

Die untere Live-Statusleiste unterscheidet `Bereit`, `Wird lokal gespeichert`, `Lokal gespeichert` und `Speichern fehlgeschlagen`. „Gespeichert“ bedeutet ausschließlich lokal bestätigt. Kollisionswarnungen bleiben nahe an der Arbeitsfläche sichtbar und verändern deren Geometrie nicht.

### Motion

Bewegung erklärt Zustandswechsel und dauert höchstens 160–220 ms. `prefers-reduced-motion` reduziert Übergänge auf praktisch sofortige Änderungen ohne räumliche Bewegung. 3D-Kamerabewegung bleibt unterbrechbar.

## Do's and Don'ts

- **Do:** Plan, 3D, Status und Export aus demselben V3-Dokument ableiten.
- **Do:** Maße, Quelle und Sicherheit direkt beim betroffenen Element nennen.
- **Do:** Die zentrale Arbeitsfläche auch bei schmaler Breite als Hauptinhalt erhalten.
- **Don't:** Private Analysefotos in öffentliche oder druckbare Oberflächen übernehmen.
- **Don't:** Dekoration vor Fensterbedienung, Steckdosen, Türschwenk oder Durchgänge platzieren.
- **Don't:** Ziehen als einzigen Bearbeitungsweg anbieten oder UI-Zustände in der Dokument-History speichern.
