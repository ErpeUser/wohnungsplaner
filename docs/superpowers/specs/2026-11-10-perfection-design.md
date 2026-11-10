# Wohnungsplaner – Perfektionslauf 2026-11-10

## Ziel

Die vorhandene Wohnungserfassung bleibt die maßgebende Quelle für Raumgeometrie, Öffnungen, Einbauten, Produktmaße und Bildbelege. Der Perfektionslauf verbessert die Zuverlässigkeit und Bedienbarkeit des bestehenden Systems in kleinen, rückwärtskompatiblen Schritten:

- Geometrie und Importdaten müssen validiert werden, bevor sie in den Plan gelangen.
- Maße und Raumzuordnung müssen auch nach Migration, Undo/Redo und Reload erhalten bleiben.
- 2D- und 3D-Ansicht müssen dieselben Objekte, Grenzen und Produktidentitäten verwenden.
- Produktmodelle müssen ihre Originalmaterialien behalten; parametriche Modelle dienen nur als expliziter Fallback.
- Der KI-/Asset-Import erhält eine prüfbare Metadaten- und Hash-Pipeline.
- Walkthrough, Kollisionsprüfung und Zugänglichkeit sollen realistische, nachvollziehbare Regeln verwenden.

## Bewerte Ansätze

| Ansatz | Ergebnis | Begründung |
| --- | --- | --- |
| Kompletter Rewrite in einer neuen 3D-Engine | Verworfen | Würde die bestätigten Raum- und Produktdaten unnötig gefährden und die vorhandene 2D/3D-Domäne duplizieren. |
| Nur visuelle Oberfläche über der bestehenden Logik | Verworfen | Würde Import-, Schema-, Kollisions- und Persistenzfehler unverändert lassen. |
| Inkrementelle Domänenhärtung auf `main` | Gewählt | Jede Änderung bleibt testbar, die vorhandenen Bilder und Möbel bleiben erhalten und die Veröffentlichung kann atomar erfolgen. |

## Implementierungsreihenfolge

1. Schema und Migration härten: einfache Raumgrenzen, WNF-Flächen, Öffnungshöhen/-überlappungen, bekannte Räume/Wände und fehlertolerante Legacy-Platzierungen.
2. Befehle und Persistenz absichern: reservierte IDs, Raum-/Wand-Referenzen sowie aktive Ansicht und Overlays speichern.
3. 2D/3D-Konsistenz verbessern: vollständige Bounds, keine NaN-Dimensionen, zugängliche Objektliste, auswählbare Einbauten und fixture-basierte Beleuchtung.
4. Produktdarstellung verbessern: originale GLB-Materialien bewahren, parametrische Darstellung über explizites `renderMode` wählen und Rundungen im lokalen Generator korrekt erzeugen.
5. Walkthrough und Kollisionsregeln realistisch machen: Teppiche und dekorative Wandobjekte sind keine Blocker; Türöffnungen werden um den Avatar-Radius erweitert.
6. Asset-Pipeline und lokale Bereitstellung härten: Sidecar-Metadaten, SHA-256-Prüfung, Dateityp-/Größenlimit, sichere lokale HTTP-Responses und optionale Worker-Bindings.
7. Validierung und Dokumentation: TypeScript, ESLint, Planner-Tests, UI-Tests, Cutover-Checks, Asset-Manifest und Build ausführen.

## Nicht automatisierte Annahmen

Die Bildbelege bleiben Referenzmaterial. Wo ein Anbieter nur ein bearbeitetes oder KI-generiertes Produktbild liefert, wird dies in `metadata.notes` als Quelle bzw. Annahme geführt. Ein 77-Byte-HDR-Platzhalter im vorhandenen Bestand wird nicht als fotorealistisches HDR ausgegeben; die Beleuchtung fällt sauber auf dokumentbasierte Leuchten und eine neutrale Grundbeleuchtung zurück.
