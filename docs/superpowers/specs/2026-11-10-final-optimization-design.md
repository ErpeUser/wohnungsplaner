# Design: Finaloptimierung Wohnungsplaner

## Ziel

Ein robuster, persistierbarer Asset-/KI-Pipeline-Kern mit strikter Dateivalidierung, validierten Maßdaten und derselben Command-/Schema-Schicht wie bestehende Platzierungen. Bestehende Funktionen und lokale Migrationen bleiben kompatibel.

## Nichtziele

Keine erfundenen externen Storage-, Vision- oder Produktverträge; keine neuen Bibliotheken ohne nachgewiesenen Vorteil; keine binären Modell-/HDR-Änderungen ohne Quelle und Lizenz.

## Architekturentscheidung

Das Register liegt als `assets` in `PlannerDocumentV3`. Ein Asset speichert Hash, Dateigröße, Medientyp, normalisierte Metermaße, Floor-Offset, Pivot, Material, Quelle/Lizenz sowie korrigierbare Herkunft und Confidence. Eine URL bleibt optional, weil der lokale Import keinen Storage-Vertrag besitzt. Commands registrieren und entfernen Assets; Placement-Kommandos können weiterhin nur über `catalogId` arbeiten und verlieren keine Alt-Daten.

## Validierung

Imports sind auf GLB, PNG, JPEG, SVG und WEBP bis einschließlich 5 MiB begrenzt. Erweiterung, MIME und Magic Bytes müssen zusammenpassen. SVG wird als XML-Starttag geprüft und enthält keine Skript-/Event-Attribute. Maße und Material-ID bleiben Pflichtfelder; Vision-/KI-Ergebnisse sind Vorschläge mit `confidence` und `source`.

## Verifikation

Typecheck, Lint, Asset-Unit-Tests, Schema-/Command-/Persistence-Tests sowie vorhandene UI-Suites werden ausgeführt. Nicht ausführbare Build-Schritte werden mit dem konkreten Grund protokolliert.
