# Raumplaner-Neuaufbau – Design

**Status:** Entwurf zur Freigabe  
**Datum:** 24.10.2026  
**Gewählte Richtung:** Moderner Neuaufbau im bestehenden Projekt

## 1. Absicht und Ausgangslage

Der Raumplaner soll wieder ein Planungswerkzeug sein: Raum wählen, Möbel finden, maßhaltig platzieren und das Ergebnis unmittelbar in einer glaubwürdigen 3D-Ansicht beurteilen. Der derzeitige Stand funktioniert technisch, ist aber durch eine 2.900-Zeilen-Hauptseite, zwei getrennte 3D-Wege, handgeschriebene Three.js-Szenen, doppelte Darstellungslogik und sehr viel Nachweistext schwer änderbar und visuell überladen.

Der Neuaufbau behält ausschließlich belastbare Domänendaten und ersetzt die Produktoberfläche sowie die Rendering-Schicht schrittweise. Die bestehende Anwendung bleibt während der Migration ausführbar. Alte Implementierung wird entfernt, sobald der jeweilige neue vertikale Funktionsschnitt getestet ist.

## 2. Produktziel

Eine lokal arbeitende, deutschsprachige Wohnungsplanung für eine einzelne Wohnung, optimiert für Desktop und kleine Laptops. Die zentrale Aufgabe lautet:

> Einen Raum oder die Gesamtwohnung öffnen, reale Möbel maßhaltig anordnen und dieselbe Planung sofort in 2D und 3D sehen.

Messquellen und Unsicherheiten bleiben verfügbar, treten aber hinter die eigentliche Planung zurück.

## 3. Ziele

- Eine gemeinsame, typisierte Szenenbeschreibung speist 2D, 3D, Speicherung und Export.
- Die gesamte Wohnung und jeder einzelne Raum sind aus demselben Modell erreichbar.
- 2D unterstützt Auswahl, Ziehen, Drehen, Größenänderung, Raster, magnetische Kanten, Kollisionshinweise sowie Undo/Redo.
- 3D nutzt realistischere Materialien, Licht, Schatten und lokale GLTF-Möbelmodelle.
- Änderungen in 2D erscheinen ohne Datenkonvertierung in 3D; Auswahl und Sichtbarkeit bleiben synchron.
- Die Oberfläche priorisiert die Arbeitsfläche und zeigt Details nur bei Bedarf.
- Die 3D-Schicht wird erst geladen, wenn sie benötigt wird.
- Gespeicherte Planungen werden versioniert, validiert und ohne stillen Datenverlust migriert.
- Verifizierte Wohnungsmaße, Raumkonturen, Öffnungen, feste Küche und Sanitärbestand bleiben erhalten.
- Die neue Architektur ist in kleine, testbare Module zerlegt und lässt alte Renderpfade vollständig entfallen.

## 4. Nicht-Ziele

- Kein vollständiges CAD-, BIM- oder Bauantragsprogramm.
- Keine statische oder bautechnische Bewertung von Wänden.
- Keine automatische Rekonstruktion privater Fotos durch Cloud-Dienste.
- Kein Händlerkatalog, Bestellsystem oder Preisvergleich im ersten Neuaufbau.
- Kein Mehrbenutzerbetrieb und keine Cloud-Synchronisation.
- Keine freie Veränderung tragender Raumkonturen in der ersten Version; Räume und Öffnungen werden aus dem bestätigten Bestandsmodell übernommen.
- Keine behauptete Fotorealistik bei nur angenäherten Ausgangsdaten.

## 5. Anti-Ziele

Der neue Planer darf nicht wieder zu einem Dokumentationsbericht mit eingebettetem Plan werden. Er darf keine zweite Geometriewahrheit für 2D und 3D, keine tausenden Zeilen lange Seitenkomponente, keine ungetestete Storage-Struktur und keine Sammlung von manuell zusammengesetzten Three.js-Boxen als dauerhaftes Möbelsystem enthalten.

## 6. Rahmenbedingungen

- React 19, TypeScript und der bestehende vinext/Vite-Build bleiben zunächst erhalten, da Build und Tests funktionieren.
- Die Anwendung bleibt lokal und veröffentlicht keine privaten Quellenmedien.
- Kanonische Maße werden in Metern gespeichert; die Oberfläche zeigt Zentimeter.
- Apartmentkoordinaten verwenden `x` für Ost–West und `z` für Nord–Süd; Höhe ist `y`. Die 2D-Schicht projiziert `x/z` ohne eigene Raumkoordinaten-Kopie.
- Planungsdaten dürfen nur über validierte Commands geändert werden.
- Der bisherige, nicht saubere Git-Arbeitsstand wird nicht zurückgesetzt. Migrationen müssen mit den vorhandenen Änderungen koexistieren.
- Ziel ist WCAG 2.2 AA. Jede Drag-Funktion erhält numerische und tastaturbedienbare Alternativen.
- Der vollständige Editor unterstützt die jeweils zwei neuesten stabilen Versionen von Chromium/Edge und Firefox ab 1024 × 700 px. Tablet-Landscape ab 1024 px erhält Touch-/Stiftbedienung. Kleinere Ansichten bleiben lesend und numerisch bearbeitbar, versprechen aber keine vollständige Drag-Arbeitsfläche.
- WebGL2 ist die Zielbasis für 3D. Fehlt es oder geht der Kontext verloren, bleibt 2D ohne Funktionsverlust nutzbar.

## 7. Erwogene Ansätze

### A. Neuaufbau im bestehenden React-Projekt – gewählt

React Three Fiber und Drei kapseln Three.js deklarativ; React Konva übernimmt die interaktive 2D-Arbeitsfläche. Ein neues Domänenmodell ist die einzige Datenquelle. Diese Lösung passt zu React 19, kann schrittweise eingeführt werden und besitzt gute Erweiterungspunkte für GLTF, PBR, Postprocessing und direkte Manipulation.

### B. Vollständiger Wechsel zu Babylon.js

Babylon.js bietet viele Rendering- und Editorfunktionen aus einer Hand. Die Lösung würde jedoch einen zusätzlichen Paradigmenwechsel, eine größere Migration und schlechtere Wiederverwendung der bestehenden React-Struktur verursachen. Für eine einzelne Wohnung wäre das mehr Engine als Produktnutzen.

### C. Pure Three.js- und SVG-Eigenentwicklung

Dieser Ansatz hätte wenige Abhängigkeiten, würde aber Auswahl, Transformationswerkzeuge, Asset-Lebenszyklus, Szene-Reaktivität und Export erneut als projektspezifische Eigenlogik aufbauen. Das widerspricht dem Ziel, Komplexität zu entfernen.

## 8. Zielarchitektur

### 8.1 Technologiestapel

- **3D:** `three`, `@react-three/fiber`, `@react-three/drei`, gezielt `@react-three/postprocessing`
- **2D:** `konva` und `react-konva`
- **Planungszustand:** `zustand` mit kleinen, selektierten Stores statt eines monolithischen Seitenzustands
- **Schema und Migration:** `zod`
- **Tests:** Node-Testbestand für Geometrie/Domain beibehalten; React-Komponenten- und Interaktionstests ergänzen; Browserprüfung für Hauptabläufe
- **Assets:** lokale GLTF/GLB-Modelle und lokale PBR-Texturen; keine Laufzeitabhängigkeit von fremden URLs

Neue Pakete werden nur aufgenommen, wenn sie eine vorhandene Eigenimplementierung tatsächlich ersetzen. Zusätzliche State-, Form-, Icon- oder UI-Frameworks werden nicht parallel eingeführt.

### 8.2 Schichten

```text
app shell / routes
        │
planner workspace ── panels / commands / shortcuts
        │
planner store ────── history / selection / persistence
        │
scene domain ─────── rooms / openings / surfaces / assets / placements
      ┌─┴───────────────┐
2D Konva renderer   3D R3F renderer
      └─┬───────────────┘
 export / print / validation
```

Die Renderer lesen ausschließlich aus dem Domain-Modell und senden semantische Commands zurück, etwa `movePlacement`, `resizePlacement`, `rotatePlacement`, `toggleDoor` oder `setSurfaceMaterial`. Renderer schreiben niemals direkt in Storage.

### 8.3 Vorgesehene Modulgrenzen

```text
app/
  page.tsx                         schlanker Einstieg und lazy geladener Workspace
  planner/
    domain/                        Typen, Schemata, Geometrie, Migrationen
    store/                         Zustand, Commands, Undo/Redo, Autosave
    workspace/                     Shell, Toolbar, Room-Navigation, Panels
    plan-2d/                       Konva-Stage, Layer, Auswahl, Transform
    scene-3d/                      Canvas, Architektur, Möbel, Licht, Kamera
    catalog/                       Möbeldefinitionen und Asset-Metadaten
    inspector/                     Maße, Material, Position, Nachweisdetails
    export/                        PNG/PDF/JSON aus dem kanonischen Modell
```

Kein Modul darf erneut sämtliche Architektur-, Möbel- und UI-Verantwortung bündeln. Richtwert: fachliche Komponenten bleiben überwiegend unter 250 Zeilen; größere Dateien brauchen eine nachvollziehbare, zusammenhängende Verantwortung.

## 9. Kanonisches Datenmodell

Die neue gespeicherte Form heißt `PlannerDocumentV3`. Ihre kanonische Architektur ist ein persistierter, globaler Wandgraph mit stabilen Wand-IDs, Endpunkten, Stärke, Höhe und Raum-Nachbarschaften. Öffnungen referenzieren genau eine Wand und eine Position entlang dieser Wand. Geschlossene Raumkonturen, Wandflächen, Raumflächen und Rendergeometrien werden daraus abgeleitet und nicht parallel als zweite Wahrheit gepflegt.

`PlannerDocumentV3` enthält:

- Dokument-ID, Schema-Version und Änderungszeitpunkt
- Apartment mit Räumen und Referenzen auf geschlossene Schleifen des Wandgraphen
- Wände/Öffnungen einschließlich Türen und Fenstern
- Oberflächenzuweisungen für Boden, Wand und Decke
- feste Einbauten als eigene typisierte `builtIns` wie Küche und Sanitär; sie sind gesperrt und nur über ausdrücklich freigegebene Material-/Variantenfelder konfigurierbar
- bestätigte Elektroelemente als nicht kollidierende technische `fixtures`, die als Overlay ein-/ausblendbar sind
- frei platzierbare `placements` mit stabiler ID, expliziter `roomId`, Katalogreferenz, Position, Drehung, Abmessungen und optionalen Materialvarianten
- Türzustände und Ansichtspräferenzen
- Herkunft/Verlässlichkeit nur als optionale Metadaten an den betroffenen Objekten

`PlannerDocumentV3` ist die einzige persistierte Wahrheit. Abgeleitete Werte wie Bounding Boxes, Raumfläche, Kollisionen, Wandsegmente und Renderobjekte werden berechnet und nicht dupliziert gespeichert.

Ein Placement gehört genau einem Raum. Während des Ziehens bleibt diese Zugehörigkeit bestehen. Liegt das Objekt nach Abschluss vollständig in einem anderen planbaren Innenraum, führt ein eigener, undo-fähiger Transfer-Command den Raumwechsel aus. Über mehrere Räume oder durch Wände reichende Placements sind in V3 ungültig; wandmontierte Objekte referenzieren zusätzlich eine Wand-ID.

Persistenz bleibt bewusst einfach: Das validierte Dokument liegt als atomar geschriebener JSON-String in `localStorage`. Vor dem Ersetzen wird die letzte gültige Fassung unter einem separaten Backup-Schlüssel gesichert. Undo/Redo ist sitzungsbezogen und wird nicht über einen Neustart persistiert. JSON-Export ist die dauerhafte, vom Nutzer kontrollierte Sicherung.

Beim ersten Start migriert ein validierter Adapter vorhandene v2-Daten. Nicht zuordenbare Objekte werden nicht gelöscht, sondern in einem Migrationsbericht aufgeführt und als exportierbare Sicherung erhalten. Vor jeder automatischen Migration wird die bisherige JSON-Fassung lokal als Rollback-Kopie behalten.

## 10. 2D-Planer

React Konva ersetzt beide bisherigen SVG-Pfade durch eine gemeinsame Stage mit klar getrennten Layern:

1. Boden und Raumhüllen
2. Wände, Fenster und Türen
3. feste Einbauten
4. frei platzierbare Möbel
5. Auswahl, Snapping und Kollisionshinweise
6. optional eingeblendete Maße und Elektrozeichen

Der Standardzustand zeigt keine vollständige technische Bemaßung. Maße, Elektroelemente und Nachweisstatus werden als einzeln schaltbare Overlays angeboten.

Interaktion:

- Einfachklick wählt ein Objekt.
- Ziehen verschiebt es mit 5-cm-Raster; Alt/Option deaktiviert temporär das Raster.
- Konva Transformer bietet Drehung und Größenänderung nur für dafür geeignete Objekte.
- Magnetische Hilfslinien erscheinen an Wänden, Möbelkanten und Mittellinien.
- Kollisionen werden während der Bewegung angezeigt. Raumgrenzen, Wände und feste Einbauten sind harte Grenzen. Der Türfreiraum ist die vollständige 90°-Schwenkfläche des Türblatts mit 5 cm Sicherheitszugabe; eine Überschneidung ist ungültig. Der lichte Durchgang in Öffnungsbreite und 60 cm Tiefe auf jeder zugänglichen Seite erzeugt zusätzlich eine deutliche Warnung, blockiert aber nicht.
- Pfeiltasten verschieben um 1 cm, mit Umschalt um 10 cm.
- Escape bricht die laufende Transformation ab.
- Undo/Redo ist über Toolbar und übliche Tastenkürzel erreichbar.
- Zoom erfolgt zum Mauszeiger; „Alles anzeigen“ stellt eine sichere Gesamtansicht her.

## 11. 3D-Ansicht

React Three Fiber ersetzt `ThreeRoom` und `ApartmentThreeView` durch einen einzigen deklarativen Szenengraphen.

### Darstellung

- physikalisch plausible Standard-/Physical-Materialien
- ACES-/AgX-artiges Tone Mapping nach aktuellem Three.js-Support
- lokale HDR-/Environment-Beleuchtung mit PMREM
- weiche, begrenzte Schatten und Ambient Occlusion nur soweit performant
- korrekte sRGB-Farbräume
- Texturen für Parkett, Fliesen, Wände, Holz, Metall, Stoff und Glas
- GLTF/GLB-Möbel mit Draco/KTX2, wo sich die Kompression messbar lohnt
- einfache prozedurale Ersatzgeometrie, falls ein Asset fehlt oder ein Gerät schwach ist

### Interaktion und Leistung

- zwei Kameramodi: ruhige Orbit-Übersicht und begehbarer Rundgang
- Auswahl eines Möbels synchronisiert den Inspector und hebt das Objekt dezent hervor
- Türen reagieren auf denselben Command wie in 2D
- `frameloop="demand"` für ruhende Szenen; Animation nur während Interaktion
- adaptive Pixeldichte und Qualitätsstufen
- Instancing für häufig wiederholte Details
- Wiederverwendung von Geometrien, Materialien und geladenen Assets
- 3D wird per dynamischem Import erst beim Umschalten geladen
- ein sichtbarer Fallback führt immer zurück zum vollständig nutzbaren 2D-Plan

Die Zielwerte sind flüssige 2D-Manipulation mit 60 fps und mindestens 30 fps im adaptiven 3D-Modus auf einer üblichen integrierten GPU der letzten fünf Jahre bei 1440 × 900 px. Die hohe Qualitätsstufe strebt 60 fps an, darf aber automatisch Pixeldichte, Schattenauflösung und Postprocessing reduzieren. Diese Anpassung ändert niemals Geometrie oder gespeicherte Planung.

## 12. Möbel- und Materialkatalog

Der erste Katalog ist klein, aber hochwertig. Er deckt die vorhandenen Möbel sowie typische Planungselemente ab: Bett, Schrank, Schreibtisch, Stuhl, Sofa, Esstisch, Kommode, Regal, Lowboard, Nachttisch, Teppich, Leuchte und Pflanze.

Jeder Eintrag enthält 2D-Symbol, reale Außenmaße, 3D-Asset oder Ersatzgeometrie, erlaubte Skalierung, Materialslots und Lizenz-/Quellmetadaten. Produktnamen werden nur verwendet, wenn sie nachweislich zum Bestand gehören. Fremde Assets müssen lokal gespeichert, für die Nutzung lizenziert und in einem Asset-Manifest dokumentiert sein.

## 13. Arbeitsoberfläche

Die Gestaltung bleibt ein ruhiger „Architekten-Arbeitstisch“, wird jedoch deutlich funktionaler und weniger textlastig. Signatur ist die nahtlose Gleichheit von 2D-Plan, 3D-Raum und numerischem Inspector: dasselbe ausgewählte Möbel bleibt in allen drei Darstellungen eindeutig erkennbar.

```text
┌ Wohnung / Raum ─────────────── 2D | 3D ─ Undo Redo ─ Export ┐
├ Möbelkatalog ┬──────────────── Arbeitsfläche ─────────┬─────┤
│ Suche        │                                        │ Aus-│
│ Kategorien   │            Plan oder Szene             │ wahl│
│ Objektkarten │                                        │ Maße│
│              │                                        │ Mat.│
├──────────────┴────────────────────────────────────────┴─────┤
│ Status: Maßstab · Raster · Kollision · Autosave              │
└──────────────────────────────────────────────────────────────┘
```

- Der Plan belegt den größten Teil des sichtbaren Fensters.
- Räume werden über einen kompakten Selektor mit Gesamtwohnung als eigener Ansicht gewählt; keine abgeschnittene horizontale Kartenleiste.
- Linkes Katalogpanel und rechter Inspector sind einklappbar.
- Nachweise, Messquellen und Unsicherheiten erscheinen in einem Details-Drawer, nicht als permanente Kartenwand.
- Speichern ist automatisch. „Sicherung exportieren“ und „Sicherung importieren“ ersetzen missverständliche doppelte Speicheraktionen.
- Export bietet getrennt JSON-Sicherung, PNG-Ansicht und einen kompakten PDF-Plan.
- Mobile Ansichten dürfen prüfen und numerisch bearbeiten; die volle Drag-Arbeitsfläche ist für Desktop/Tablet-Landscape optimiert.

## 14. Visuelle Richtung

- Produktregister, nicht Immobilienbroschüre.
- Heller neutraler Arbeitsgrund mit dunkler Architekturzeichnung und einem gedeckten Blaugrün für Auswahl/Aktionen.
- Holz- und Materialfarben erscheinen in Plan und Szene, aber nicht als dekorative UI-Farben.
- Typografie trennt Navigation/Fließtext von technischen Maßzahlen; Maße verwenden eine tabellarische Utility-Schrift.
- Flächen bleiben überwiegend flach. Tiefe gehört vor allem in die 3D-Szene sowie in temporäre Layer.
- Bewegung ist kurz und funktional; reduzierte Bewegung wird respektiert.
- Keine Dashboard-Kartenwand, keine Glasoptik, keine übergroßen Marketingüberschriften und keine Pillen-Navigation für jede Funktion.

Nach Freigabe wird das bestehende `DESIGN.md` als bewusste Systemänderung aktualisiert und ein schlanker `UX-CONTRACT.md` für Commands, Autosave, Undo/Redo, Import, Export, Fehlerzustände und Tastaturverhalten angelegt.

## 15. Entfernen und Ersetzen

Nach erfolgreicher Migration entfallen:

- die monolithische `app/page.tsx`-Implementierung
- der alte `ThreeRoom`-Renderer
- der imperative `ApartmentThreeView`-Szenenaufbau
- doppelte SVG-Grundrisse für Einzelraum und Wohnung
- automatische vier Wand-Snapshots und Bildstudien als Hauptworkflow
- permanente Quellenstatus-Karten oberhalb des Plans
- redundante Druckbuttons und lange erklärende Textblöcke im Arbeitsbereich
- komponentenlokale Geometrie-, Kollisions- und Storage-Logik
- hart codierte Möbelgeometrien, sobald ein Katalogasset oder ein gemeinsamer parametrischer Renderer existiert
- unversionierte oder nur per Type-Cast akzeptierte Importdaten

Entfernung erfolgt erst, wenn der entsprechende neue Pfad getestet ist. Bestätigte Inhalte werden in das neue Modell migriert, nicht durch pauschales Löschen verloren.

## 16. Zustände und Fehlerbehandlung

- Der 2D-Plan ist der robuste Basismodus und funktioniert ohne WebGL.
- 3D besitzt Lade-, reduziert-, Kontext-verloren- und Asset-fehlt-Zustände.
- Autosave zeigt ruhig „Gespeichert“, „Speichert“ oder einen reparierbaren Fehler; kein Browserdialog.
- Import validiert zuerst, zeigt eine verständliche Zusammenfassung und ersetzt den aktuellen Plan erst nach Bestätigung.
- Undo/Redo umfasst planungsverändernde Commands, nicht reine Kamera- oder Panelzustände.
- Asset-Fehler betreffen nur das jeweilige Möbel und zerstören nicht die Szene.
- Leere Räume zeigen eine klare Einladung, ein Möbel aus dem Katalog einzufügen.

## 17. Migration und Lieferreihenfolge

1. Charakterisierungstests sichern bestätigte Geometrie, Flächen, Öffnungen und v2-Speicherdaten.
2. `PlannerDocumentV3`, Schemavalidierung, Commands, Selektoren und v2→v3-Migration entstehen unabhängig von Renderern.
3. Der neue Workspace und der Konva-Gesamtplan werden als erster vollständiger vertikaler Schnitt eingeführt.
4. Möbelauswahl, Transform, Snapping, Kollision sowie Undo/Redo vervollständigen den 2D-Planer.
5. Der lazy geladene R3F-Renderer übernimmt dasselbe Dokument und ersetzt beide alten 3D-Wege.
6. Lokaler Möbel-/Materialkatalog und adaptive Qualitätsstufen erhöhen den Realismus.
7. Import, Export, Autosave und kompakter Druck werden auf V3 umgestellt.
8. Alte Komponenten, Styles, Tests und Abhängigkeiten werden nach Referenzsuche entfernt.
9. Bundle, Rendering, Barrierefreiheit und Hauptabläufe werden im Browser verifiziert.

## 18. Test- und Qualitätsstrategie

- TDD für jedes neue Domain-Verhalten und jede behobene Regression.
- Unit-Tests für Schemata, Migration, Geometrie, Snapping, Kollisionen, Commands und History.
- Komponenten-/Interaktionstests für Auswahl, Transform, numerische Eingabe, Undo/Redo, Import und Fehlerzustände.
- Browserprüfungen für Gesamtwohnung, Zimmerwechsel, 2D→3D-Synchronität, WebGL-Fallback, schmale Ansicht und Tastaturbedienung.
- Visuelle Referenzbilder für einen Gesamtplan, einen möblierten Raum und eine 3D-Referenzperspektive.
- Frische vollständige Läufe von Lint, Typprüfung, Tests und Produktion-Build vor Abschluss.
- Bundle-Budget: die Startansicht enthält keinen Three.js-/R3F-Chunk; 3D liegt in einem separat geladenen Chunk. Größenwarnungen werden nicht pauschal hochgesetzt.

## 19. Erfolgskriterien

- Der Start zeigt ohne Scrollen Raumwahl, Hauptwerkzeuge und einen sinnvoll großen 2D-Plan.
- Ein Möbel kann in höchstens drei Aktionen eingefügt und anschließend per Drag oder Zahlenfeld angepasst werden.
- Dieselbe Änderung ist nach dem Umschalten in 3D korrekt sichtbar.
- Ein defektes 3D-Asset oder fehlendes WebGL beeinträchtigt 2D nicht.
- Import älterer Daten verliert nichts still; nicht migrierbare Einträge werden gemeldet und gesichert.
- `page.tsx` enthält nur noch Einstieg/Lazy Loading; UI, Domain und Renderer haben getrennte Verantwortungen.
- Nur ein Raum-/Möbel-/Öffnungsmodell existiert.
- Der Initial-Build enthält kein unnötig eingebundenes Three.js.
- Alle übernommenen bestätigten Maße und Flächen bestehen die vorhandenen Charakterisierungstests.

## 20. Entscheidungen des Builders innerhalb dieses Designs

Der Builder darf konkrete Dateinamen innerhalb der vorgesehenen Modulgrenzen, kleine Komponentenaufteilungen, die genaue freie/CC0-Assetauswahl, Testwerkzeuge mit guter React-19-Kompatibilität und die konkrete neutrale HDR-Umgebung bestimmen. Diese Entscheidungen dürfen die gemeinsame Datenquelle, lokale Asset-Haltung, Datenschutzgrenzen, Barrierefreiheit oder festgelegten Kerninteraktionen nicht verändern.
