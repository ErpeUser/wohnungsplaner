# Tischvergleich im Wohnungsplan – Design

## Intent

Der Wohnungsplaner soll vier vom Nutzer verlinkte Esstische im bestehenden Wohnküchen-Grundriss maßhaltig vergleichen können. Jede Tischvariante muss über sichtbare Reiter und Ausziehstufen umschaltbar sein. Die Umschaltung soll die echte Tisch-Platzierung und ihre 2D-/3D-Geometrie aktualisieren, während die vorhandenen Kaleo-Stühle mitgeführt und als vier Sitzplätze dargestellt werden. Quellen, Bild-URLs, Crawl-Status und Unsicherheiten müssen versioniert nachvollziehbar bleiben.

## Why

Die Entscheidung soll auf dem realen Platzbedarf im Raum beruhen. Deshalb sind Außenmaße, Ausziehzustände, Stuhl-Fußabstände und die verbleibenden Durchgänge wichtiger als ein bloßes Produktkarten-UI.

## Goals

- Vier Produktmodelle als klar benannte Varianten im Katalog und im Tischvergleich.
- Jede belastbar belegte Ausziehstufe in Metern und Zentimetern abbilden.
- Den bestehenden Tisch im Dokument per einer semantischen Command-Aktion auf Modell und Variante umstellen.
- Vier vorhandene Kaleo-Stühle im selben Essgruppen-Kontext sichtbar und kollisionsgeprüft halten.
- Einen kompakten, zugänglichen Reiterbereich mit Modell-, Zustand-, Maß- und Quelleninformationen anbieten.
- Original-Links, Canonical-Links, Bild-URLs, Crawl-Zeitpunkt und Belegstatus im Repository speichern.
- Temu 609726 ausdrücklich als ungeklärt markieren, solange keine verlässlichen Maße vorliegen; keine erfundene Geometrie als bestätigt ausgeben.
- Regressionstests für Daten, Command, Geometrie, vier Stühle und UI-Verhalten ergänzen.

## Non-goals

- Kein Kauf, keine Warenkorb- oder Preisautomatisierung.
- Keine Anmeldung oder Umgehung von Temu-/AliExpress-Sicherheitsprüfungen.
- Keine externen Produktbilder in lokale Backups einbetten.
- Keine fotorealistischen GLB-Modelle ohne freigegebene, maßhaltige Assets.

## Anti-goals

- Ein Modell darf nicht nur als Textlabel wechseln, während die Planfläche unverändert bleibt.
- Eine blockierte Quelle darf nicht stillschweigend durch frei erfundene Maße ersetzt werden.
- Die Vergleichsoberfläche darf die bestehende Planfläche nicht in einen horizontal abgeschnittenen Katalog verwandeln.

## Constraints

- Bestehendes V3-Dokument bleibt die gemeinsame Quelle für 2D, 3D, Kollisionen, Export und lokale Persistenz.
- Interne Geometrie bleibt in Metern; UI zeigt Zentimeter.
- Bestehende Bozan- und Kaleo-IDs sowie Legacy-Migrationspfade bleiben rückwärtskompatibel.
- Das aktuelle Design-System aus `DESIGN.md` und `UX-CONTRACT.md` bleibt gültig.
- Temu-Seiten können live Login/Sicherheitsseiten liefern; Crawl-Ergebnis und Confidence müssen deshalb pro Produkt sichtbar sein.
- Alle Schreibänderungen werden über einen Feature-Branch und einen GitHub-PR in `main` integriert.

## Evidence snapshot

| Modell | Zustände | Maßhaltige Geometrie | Quellenstatus |
|---|---|---|---|
| AliExpress 1005013489223528 | rund 100 × 100 × 75 cm; oval 140 × 100 × 75 cm | bestätigt aus OG-Titel und Produktbild/Spiegelquelle; Höhe als Produktgrafik prüfen | direct page partly blocked, mirror image retained |
| Temu 606997911062061 | rund Ø120 × 75,5 cm; oval 160 × 120 × 75,5 cm | bestätigt durch Canonical-Slug und dimensionsgleichen Mirror; MDF, Stauraum, Schiebetüren | live page blocked; mirror evidence, confidence `estimated` |
| Kaufland 567080013 | oval 120 × 80 × 75,5 cm; oval 160 × 80 × 75,5 cm | bestätigt; Maßgrafik nennt 1,8-cm-Platte, 60-cm-Enden und 40-cm-Mittelblatt | direct page and measurement gallery |
| Temu 609726356120319 | unbekannt | kein belastbarer Datensatz verfügbar | direct/login and indexed search blocked; no fabricated geometry |

## Chosen approach

Wir erweitern den vorhandenen V3-Planer. Ein neues, fokussiertes Tabellenmodul hält die vier Produktdefinitionen, die Variantenzustände und die Quellenbelege. Ein neuer `setPlacementProduct`-Command ersetzt bei der bestehenden `living-bozan-table`-Platzierung atomar `catalogId`, `size`, Material und Metadaten. Die drei bestehenden Kaleo-Placements bleiben in ihrer Gruppe; ein vierter Kaleo-Platz wird als `living-kaleo-chair-north` ergänzt, sofern er noch nicht vorhanden ist, und durch die Vergleichsaktionen mitgeführt. Parametrische 2D-/3D-Symbole verwenden weiterhin die vorhandenen Plan- und Fallback-Pfade.

Die UI sitzt als zusammenklappbarer Bereich über der Planfläche bzw. im bestehenden Drawer-Vertrag. Oben stehen vier Modell-Reiter; darunter nur die für das Modell gültigen Zustands-Reiter. Maße, Sitzkapazität, Belegstatus und ein Link zur Quelle sind direkt sichtbar. Bei `unknown` wird die Übernahme deaktiviert und ein klarer Hinweis angezeigt. Das aktive Modell und der Zustand werden lokal als UI-Sitzung gehalten; die übernommene Platzierung wird als Dokumentänderung gespeichert und rückgängig machbar.

## Remaining builder decisions

- Exakte AliExpress-Höhe, falls die Produktgrafik keine eindeutige Zahl enthält: als 75 cm aus der Produktgrafik/vergleichbaren Listingdaten führen und in der Quelle als `estimated` markieren.
- Für das ungeklärte Temu-609726-Modell werden keine Maße und keine Platzierung angeboten; der Reiter bleibt ein Recherche-Hinweis.
- Der vierte Stuhl wird südlich der Tischmitte positioniert, mit 180°-Drehung, und gegen Sofa-/Durchgangskollisionen geprüft. Falls diese Position mit einem ausgewählten Ausziehzustand kollidiert, zeigt die UI die Kollision und lässt die Variante nicht automatisch als „sicher“ erscheinen.

## Builder-check decisions (2026-11-11)

- `living-kaleo-chair-north` wird als neuer vierter Platz ergänzt; die bisherige Legacy-ID bleibt in den Retired-Sets, damit alte Saves weiterhin migriert werden. Die Migration ergänzt den Platz nur, wenn er fehlt, und übernimmt Nutzerpositionen für bestehende Platzierungen.
- `setPlacementProduct` aktualisiert die Produktgeometrie gegen einen vollständigen Gruppenbericht. Die übrige Essgruppe wird bei der Prüfung ignoriert, damit die bewusst verknüpften Stühle keine Selbstkollision erzeugen; Wände, Couch und Durchgänge bleiben harte bzw. warnende Treffer.
- Die bestehende Wohnungsmodell-Rebase darf ein bereits gewähltes Vergleichsmodell nicht zurücksetzen. Rebase erkennt deshalb einen aktiven Vergleichs-`catalogId` oder eine Vergleichsquelle und bewahrt diese Platzierung, während übrige Möbel aus dem aktuellen Dokument ersetzt werden.
- Die bestehenden Parser-Metadaten bleiben schlank. Canonical-/Bild-/Crawl-Belege liegen im statischen Tabellenmodul und `docs/table-sources.json`; die Platzierung speichert nur Quelle, Confidence und kurze Notizen.
- Das Panel verwendet native Disclosure plus echte `tablist`/`tab`/`tabpanel`-Semantik, eigene Tastatur-Navigation und einen eigenen kleinen Scrollbereich an engen Breakpoints. Es wird nicht als Dialog oder Fokusfalle implementiert.

## Builder-check rulings

- Der vierte Kaleo-Platz wird im aktuellen Ausgangsdokument verpflichtend ergänzt: ID `living-kaleo-chair-north`, Position südlich der Tischmitte mit 180°-Drehung, couchabgewandt. Eine spätere manuelle Löschung bleibt erhalten; die Migration ergänzt ihn nur in älteren 3er-Saves oder wenn die ID als veralteter North-Platz bereits vorhanden war.
- `setPlacementProduct` ersetzt nur `living-bozan-table`. Die vier Stühle behalten Position, Rotation und Gruppe. Für die Kollisionsprüfung werden Mitglieder derselben `living-dining-group` wie beim Gruppenverschieben ignoriert; alle externen harten Kollisionen blockieren, Durchgangstreffer bleiben Warnungen. Das Panel zeigt diese Warnung vor dem Anwenden und markiert die Variante nicht als kollisionsfrei.
- Quellen bleiben außerhalb des V3-Dokuments als statisch typisierte Evidence-Records plus `docs/table-sources.json`. Die Platzierung speichert nur die schema-kompatiblen Kurzfelder; Original-, Canonical- und Bild-URLs werden im Vergleichspanel getrennt verlinkt.
- Temu 609726 erscheint als deaktivierter Modell-Tab innerhalb der Viererleiste mit `aria-disabled="true"`, Status „Quelle blockiert“ und Recherchehinweis. Es erhält keinen Katalogeintrag und kann keine Geometrie/Mutation erzeugen.
