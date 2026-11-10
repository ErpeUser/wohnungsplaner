# Plan- und raumtreue Überarbeitung – Umsetzungsplan

**Status 2026-10-25:** Aufgaben 1–10 umgesetzt und frisch verifiziert; Detailnachweise stehen im SDD-Ledger und im Abschlussaudit.

> **Ausführung:** `superpowers:executing-plans` mit TDD und abschließender unabhängiger Prüfung.

**Ziel:** Den bestehenden V3-Wohnungsplaner anhand des offiziellen Plans und der Raumordner korrigieren, ohne eine zweite Datenquelle oder unnötige Bibliothek einzuführen.

**Spec:** `docs/superpowers/specs/2026-10-25-plan-und-raumtreue-design.md`

## Globale Regeln

- Nutzeränderungen und bereits vorhandene uncommittete Dateien bleiben unangetastet.
- Vor jeder Produktionsänderung muss ein passender Test fehlschlagen.
- Private Fotos und Pläne werden analysiert, aber nicht in den Web-Build kopiert.
- 2D und 3D lesen denselben `PlannerDocumentV3`-Stand.
- Gedruckte Planwerte, planmaßstäbliche Schätzungen, Handmaße und Gestaltungsannahmen werden unterscheidbar dokumentiert.
- Neue Abhängigkeiten werden nur aufgenommen, wenn ein vorhandenes Framework die Anforderung nicht sauber erfüllen kann.

## Aufgabe 1: Beweis- und Geometrievertrag

- [ ] Neue Tests für Raumanzahl, offizielle Flächen, WNF, Loggia/Balkon und Metadaten schreiben.
- [ ] Automatischen Polygon-/Flächenvergleich ergänzen.
- [ ] Falsch als `confirmed` markierte Konturen auf `estimated` korrigieren.
- [ ] Wohnküchen-Abweichung anhand der fokussierten Planprüfung korrigieren oder ausdrücklich als nicht seriös zentimetergenau ableitbar kennzeichnen.
- [ ] Audit mit Quelle, Maßvergleich und Foto-Wand-Zuordnung anlegen.
- [ ] Fokussierte Domain-Tests ausführen.

## Aufgabe 2: Explizite Türanschläge

- [ ] Schematest für eine gespeicherte explizite Schwenkrichtung und rückwärtskompatibles Laden schreiben.
- [ ] `PlannerOpening` und Zod-Schema um die Schwenkrichtung erweitern.
- [ ] Alle neun Türen gemäß offiziellem Plan korrigieren; bestätigte und geschätzte Höhen trennen.
- [ ] Eine gemeinsame reine Türpose für 2D, 3D und Kollision verwenden.
- [ ] Tests für Anschlag, offene Endpunkte und Schwenkflächen ausführen.

## Aufgabe 3: Sichtbarer 2D-Zoom

- [ ] Tests für `+`, `−`, Zoomanzeige, Mausrad/Trackpad und Reset schreiben.
- [ ] Zoommathematik für Zeiger- und Mittelpunktzoom vereinheitlichen.
- [ ] Sichtbare, zugängliche Steuerelemente ergänzen.
- [ ] Ansichtsmitte bei Größenänderung erhalten.
- [ ] UI- und reine Viewport-Tests ausführen.

## Aufgabe 4: Raum- und Außenbereichsführung

- [ ] UI-Test für sieben Innenräume und den gruppierten Außenbereich schreiben.
- [ ] Raumwahl semantisch in Innenräume und Außen-Teilflächen gruppieren.
- [ ] Hinweis „Loggia + Balkon, offen verbunden“ und klare Flächenwerte anzeigen.
- [ ] Arbeitsplatztests ausführen.

## Aufgabe 5: Türgriff-Interaktion in 2D und 3D

- [ ] Tests für Zarge, Griff, Trefferfläche, Klick und Tastatur schreiben.
- [ ] 2D-Türen deutlicher zeichnen und den Griff als direkte Aktion anbinden.
- [ ] 3D-Türbaugruppe mit Zarge, Blatt und Griff ergänzen.
- [ ] `onToggleDoor` vom Workspace an beide Renderer führen.
- [ ] Synchronität und Fokuszustände prüfen.

## Aufgabe 6: Feste Elemente und Elektrodetails

- [ ] Modelltests für Badewanne, Waschtisch, Waschmaschine, WC und belegte Elektroelemente schreiben.
- [ ] Fixture-Vokabular typisieren und aus den belegten/alten Daten vollständig übernehmen.
- [ ] Badobjekte planrichtig positionieren; fehlende Standardannahmen kennzeichnen.
- [ ] 2D- und 3D-Renderer aus denselben Fixtures/Built-ins speisen.
- [ ] Kollisionstests für Türen und feste Objekte ausführen.

## Aufgabe 7: Zimmer 1 und Wohnküche

- [ ] Tests für die erwarteten Materialien und Einrichtungsobjekte schreiben.
- [ ] Zimmer 1 mit fotografisch belegtem Parkett, Schrank, Schreibtisch und Elektrodetails ausstatten.
- [ ] Wohnküche mit belegter L-Küche, Materialwechsel und Lamellenwand ausstatten.
- [ ] TV und Hängeschrank an einer sinnvoll kollisionsfreien Wand als dokumentierte Wunschplanung ergänzen.
- [ ] 2D-/3D-Konsistenztests ausführen.

## Aufgabe 8: 3D-Kamera und Materialwirkung

- [ ] Tests für 3D hinein/heraus/zurücksetzen und Rendering-Invalidierung schreiben.
- [ ] Sichtbare Kamerasteuerung ergänzen.
- [ ] Lokale Materialrezepte für Parkett, Fliesen, Holzlamellen und schwarze Oberflächen erweitern.
- [ ] Beleuchtung und Belichtung zurückhaltend verbessern; keine externen Laufzeitressourcen verwenden.
- [ ] 3D-Tests ausführen.

## Aufgabe 9: Vollprüfung und visuelle Abnahme

- [ ] Alle fokussierten Tests, Gesamttests, Typecheck, Lint und Produktions-Build frisch ausführen.
- [ ] Produktionsansicht in Desktop- und kompakter Größe öffnen.
- [ ] Alle Innenräume sowie Loggia/Balkon in 2D und 3D visuell gegen Plan/Fotos prüfen.
- [ ] Zoom, Reset und jede Tür über den Griff praktisch testen.
- [ ] Abweichungen beheben und die Prüfschritte wiederholen.

## Aufgabe 10: Unabhängige Schlussprüfung und Bericht

- [ ] Einen frischen Review-Agenten nur den finalen Diff gegen Spec und Plan prüfen lassen.
- [ ] Kritische oder wichtige Findings beheben und erneut prüfen.
- [ ] Audit/Abschlussbericht mit Maßvergleich, Foto-Wand-Zuordnung, Annahmen, Dateien und exakten Ergebnissen finalisieren.
