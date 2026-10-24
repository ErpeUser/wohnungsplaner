# UX Contract · Raumplaner Wohnung

Stand: 24. Oktober 2026. Die visuelle Sprache ist in [DESIGN.md](./DESIGN.md) festgelegt. Dieses Dokument ist die kanonische Quelle für beobachtbares Verhalten der Planungsoberfläche.

## Produkt- und Datenkontext

| Bereich | Quelle | UI-Folge |
|---|---|---|
| Raumgeometrie und feste Einbauten | `app/planner/domain/apartment-v3.ts` und V3-Schema | Einbauten sind sichtbar, auswählbar und gegen Verschieben/Entfernen gesperrt. |
| Platzierung und Raumwechsel | `app/planner/domain/commands.ts` | Nur erfolgreiche, vollständig gültige Dokumentbefehle werden übernommen. |
| Kollisionen | `app/planner/domain/collisions.ts` | Raumgrenzen, Einbauten, Möbel und Türschwenk blockieren; Durchgänge warnen ohne Blockade. |
| Lokale Speicherung | `app/planner/store/persistence.ts` | Autosave nach 300 ms, validiertes Backup vor Überschreiben, sichtbarer Fehler ohne Verlust des offenen Dokuments. |
| Sitzungshistorie | `app/planner/store/history.ts` | Dokumentänderungen sind rückgängig; Auswahl, Kamera und Panelzustand bleiben außerhalb der History. |

Es gibt keine Benutzerkonten, Berechtigungen, Zahlungen, externen Mutationen oder personenbezogenen Daten. Alle Entwürfe bleiben im lokalen Browser-Speicher, bis die Person selbst exportiert.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | `RoomSelector` | dieses Dokument + `room-selector.tsx` | `native`; plattformeigenes Popup ausdrücklich akzeptiert | Label, Tastatur, vollständige Raumliste |
| Scrollbar | globale App-Styles | `DESIGN.md` + `app/globals.css` | globale Basis; komponentenbezogen nur Gutter/Geometrie | Standard- und WebKit-Regeln, Hochkontrast |
| Numeric editing | `InspectorPanel` | dieses Dokument + Commands | native Number-Inputs in cm/Grad | Labels, Grenzen, Command-Ergebnis |
| Panel control | `PlannerToolbar` + Store `panels` | dieses Dokument | Desktop-Seitenfläche / nicht-modaler Drawer unter 1024 px | `aria-expanded`, sichtbarer Inhalt, Fokus |
| Details drawer | `DetailsDrawer` | dieses Dokument | nicht-modal, kein Fokus-Trap | Schließen stellt Triggerfokus wieder her |
| Status | `PlannerStatus` | dieses Dokument + Persistenzzustand | eine höfliche Live-Region | Autosavezustände und stabile Geometrie |
| Document commands | `applyPlannerCommand` | Domain-Command-Union | semantische Commands | Unit- und UI-Tests |
| Undo/Redo | `createPlannerHistory` | History-Modul | nur Dokumentzustand | deaktivierte Zustände, Redo-Verlust nach neuem Befehl |

## Arbeitsabläufe

| Vorgang | Auslöser | Laufender Zustand | Erfolg | Fehler | Fokus |
|---|---|---|---|---|---|
| Möbel ändern | Ziehen oder beschriftetes Zahlenfeld | unmittelbare lokale Prüfung | Plan, Inspector und History aktualisieren; Autosave startet | Originalzustand bleibt, Erklärung am Plan | bleibt am aktiven Steuerelement |
| Raum wechseln | Raumwahl oder vollständig übertragene Platzierung | keine Zwischenansicht | Kontext und sichtbarer Ausschnitt wechseln | ungültiger Transfer bleibt vollständig im Ausgangsraum | Raumwahl bzw. Objekt |
| Rückgängig/Wiederholen | Toolbar-Schaltfläche | sofort | nur Dokument wird gewechselt und erneut gespeichert | nicht verfügbarer Schritt ist deaktiviert | bleibt auf der Schaltfläche |
| Import prüfen | Datei/JSON wählen | Vorschau ohne Mutation | erst explizites Übernehmen ersetzt Dokument und setzt History zurück | verständliche Inline-Meldung, aktueller Plan bleibt erhalten | Vorschau oder Fehlerüberschrift |
| Backup wiederherstellen | Wiederherstellen-Aktion | validieren und lokal schreiben | Dokument ersetzt, History zurückgesetzt | aktueller Plan bleibt geöffnet | Status/Auslöser |
| Exportieren | beschriftete Exportaktion | stabile Aktionsgeometrie | lokaler Download aus kanonischem Dokument bzw. Canvas | dauerhafte Meldung mit erneutem Versuch | Auslöser |

## Zustände und Feedback

- Die Autosave-Zustände lauten exakt `Bereit`, `Wird lokal gespeichert …`, `Lokal gespeichert` und `Speichern fehlgeschlagen · Änderungen bleiben geöffnet`.
- „Lokal gespeichert“ behauptet keine Server- oder Cloud-Sicherung.
- Harte Kollisionen verhindern die gesamte Änderung. Durchgangsverengungen sind sichtbare Warnungen und lassen die Änderung zu.
- Leere Auswahl erklärt den nächsten Schritt. Leerer Katalog, fehlgeschlagener Asset-Load und WebGL-Ausfall erhalten später jeweils einen eigenen, handlungsorientierten Zustand.
- Browserfunktionen `alert`, `confirm` und `prompt` sind verboten.

## Direkte Manipulation und Tastatur

- Jede Drag-Aktion besitzt eine nicht-drag-basierte Alternative über Zahlenfelder oder Befehle.
- 2D/3D und Kamera sind echte Schaltflächen mit gedrücktem Zustand.
- Deaktivierte Undo/Redo-Aktionen lösen keine Handler aus.
- Fokus ist jederzeit sichtbar und darf nicht von Toolbar, Drawer oder Statusleiste verdeckt werden.
- Nicht-modale Drawer beanspruchen keinen Fokus-Trap. Schließen stellt den Fokus auf den auslösenden Toolbar-Button zurück.
- Globale Buchstabenkürzel sind ausgeschlossen. Spätere Shortcuts dürfen nicht während Texteingabe oder IME-Komposition auslösen.

## Responsive und Scrollbesitz

- Ab 1024 px: Katalog links, Planfläche Mitte, Inspector rechts. Die Planfläche ist der dominante Bereich.
- Unter 1024 px: eine Spalte; beim Eintritt in den Kompaktmodus schließen Katalog und Inspector. Danach werden sie einzeln über Toolbar-Schalter als nicht-modale Werkzeugflächen eingeblendet.
- Unter 640 px: Werkzeuggruppen dürfen horizontal scrollen, ohne Raumwahl oder Ansichtswechsel abzuschneiden.
- Panelinhalte besitzen ihren eigenen vertikalen Scrollbereich. Die Planfläche besitzt Zoom/Pan, aber keinen konkurrierenden Dokument-Scroller.
- Bei 200 % Zoom müssen Toolbar, Plan und alle numerischen Alternativen erreichbar bleiben.

## Autosave, Recovery und Konflikte

- Nur erfolgreiche Dokumentbefehle planen nach 300 ms einen Save. Kamera, Ansicht, Auswahl und Panels lösen keinen Save aus.
- Ein neuer Dokumentbefehl verwirft einen noch nicht gestarteten Save und speichert nur den jüngsten Stand.
- Vor jedem Überschreiben wird die letzte valide aktuelle Fassung gesichert. Schlägt ein Schreibvorgang fehl, werden aktueller Speicherstand und Backup bestmöglich auf ihre vorherigen Werte zurückgesetzt.
- Beschädigte Daten ersetzen nie still den Grundplan. V2-Daten werden explizit migriert; unbekannte Einträge bleiben in einer Sicherung und werden gemeldet.
- Mehrere Browser-Tabs werden derzeit nicht synchronisiert. „Zuletzt gespeicherter Tab gewinnt“ bleibt ein bekannter lokaler Grenzfall und darf nicht als konfliktfreie Zusammenarbeit dargestellt werden.

## Import, Export und Entfernen

- Import ist zweistufig: Vorschau ohne Mutation, danach explizites Übernehmen. Ein Import setzt Undo/Redo zurück.
- Exporte lesen ausschließlich das V3-Dokument oder die kanonische 2D-Szene; sie erzeugen kein zweites Wohnungsmodell.
- Bewegliche Möbel dürfen direkt entfernt werden, weil Undo zuverlässig verfügbar ist. Feste Einbauten können nicht entfernt werden.
- Es gibt keinen permanenten Löschvorgang für die Wohnung und daher keinen Hard-Delete-Dialog.

## Barrierefreiheit und Lokalisierung

- Ziel ist WCAG 2.2 AA mit nativen Landmarken, deutschen Namen, sichtbarem Fokus und mindestens 24 × 24 px großen Zielen; wichtige Touchaktionen streben 44 × 44 px an.
- UI-Sprache ist Deutsch (`de-AT` für Zahlen), Speicherung nutzt stabile technische IDs.
- Flächen erscheinen in m², bearbeitbare Positionen und Maße in cm, Winkel in Grad.
- Farbe ist nie das einzige Zustandsmerkmal. Status, Kollisionen und Sperren besitzen Text.
- `prefers-reduced-motion` entfernt räumliche Animationen. Erzwungene Systemfarben bleiben operabel.

## Dokumenttitel und Navigation

Die Route `/planner` setzt den Titel `Raumplaner — Wohnung`. 2D/3D sind gleichrangige Ansichten desselben Dokuments und keine eigenen Routen. Fehlerseiten bleiben Aufgabe der globalen App-Shell; es existiert kein rollenbasierter 403-Fall.
