# Wohnungsplaner Modernisierung – Design

**Datum:** 2026-11-13

## Ziel

Der aktuelle Planner soll nach dem letzten Quellen-/Asset-Commit belastbar bleiben: Möbelquellen werden ehrlich als verifiziert, gespiegelt oder geschätzt gekennzeichnet, realistische parametrisierte Modelle bleiben konsistent mit den gemessenen Maßen, und lokale Browser-Artefakte dürfen nicht in Runtime oder Produktmetadaten durchschlagen.

## Anforderungen

- Sofa-, Teppich-, Stuhl- und Tischplatzierungen behalten Nutzerpositionen und stabile IDs bei Migrationen.
- Stuhl- und Tischvergleich müssen alle im Katalog belegten Varianten verwenden können, einschließlich Kaleo und der neuen Tischprofile.
- Produktordner unter `models/**/Auszug` bleiben Referenzmaterial; temporäre Pfade, Browser-Bundles und 403-Quellen dürfen nicht als geprüfte Runtime-Assets erscheinen.
- Die bestehende Next/Vinext-, Zustand-, Zod- und React-Three-Fiber-Architektur bleibt erhalten; neue Abhängigkeiten sind nicht erforderlich.
- Jeder Fix erhält eine Regression oder eine deterministische Validierung und wird über GitHub Actions geprüft.

## Ansätze

1. **Großer Asset-/Renderer-Rewrite:** würde die bestehende parametrisierte Geometrie und gespeicherte Platzierungen unnötig gefährden.
2. **Nur Dokumentation:** würde die belegten Migrations- und Registry-Bugs nicht beheben.
3. **Gezielte Härtung (gewählt):** kleine TDD-Fixes für Migration und Kollisionen, vollständige Registry-Abdeckung, runtime-validierte Manifest-/Quellprüfungen und Entfernung portabler Fremdartefakte. Das minimiert Risiko und nutzt die vorhandenen Fallbacks weiter.

## Entscheidungen

- Produktmodelle bleiben `parametric`, solange kein lizenziertes, maßhaltiges GLB samt PBR-Set vorliegt.
- Quellen mit 403/CAPTCHA oder Mirror-Beleg werden als `estimated`, `mirror` oder `blocked` geführt; Geometrie darf nur aus sichtbaren Maßangaben stammen.
- Wiederholte Asset-Imports derselben Quelle erzeugen keine kollidierende Placement-ID.
- Hardcodierte Windows-Launcher aus `.codex-temp` gehören nicht in den Produktstand und werden entfernt.

## Nicht-Ziele

Keine neue UI-Plattform, keine Datenbank, kein Force-Push, keine erfundenen Produktbilder oder Quellen und keine Übernahme privater Browser-Referenzpfade in `public/`.
