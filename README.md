# Raumplaner Wohnung

Ein lokaler, maßhaltiger Wohnungsplaner mit einer gemeinsamen Datenquelle für 2D, 3D, Kollisionen und Export. Der 2D-Plan startet sofort; die realistischere 3D-Ansicht wird erst bei Bedarf geladen.

## Start

Voraussetzung ist Node.js ab Version 22.13.

```bash
npm install
npm run dev
```

Der Produktionsstand wird mit `npm run build` erstellt. `npm test` prüft Datenmodell, Geometrie, Bearbeitung, Speicherung, Oberfläche, Export, Serverausgabe und Bundle-Aufteilung.

## Bedienung

- Raum über die Kopfleiste wählen und Möbel aus dem Katalog einfügen.
- In 2D ziehen, mit Pfeiltasten fein verschieben und Werte im Eigenschaftenbereich exakt eingeben.
- Rückgängig/Wiederholen arbeitet auf denselben semantischen Befehlen wie Maus und Tastatur.
- Die 3D-Ansicht bietet Orbit- und Gehmodus; wenn WebGL oder ein Modell ausfällt, bleibt der vollständige 2D-Plan nutzbar.

## Lokale Daten und Sicherungen

Planänderungen werden ausschließlich im lokalen Browser gespeichert. Über **Export & Import** stehen eine wieder einlesbare JSON-Sicherung, ein hochauflösendes PNG der aktuellen 2D-Ansicht und ein kompakter PDF-Druckplan bereit. Ein Import zeigt vor dem Ersetzen eine Vorschau mit Warnungen.

Private Quellpfade, Fotos oder externe Laufzeit-URLs werden weder in Sicherungen noch in Exporten eingebettet.

## 3D-Assets

Alle zur Laufzeit verwendeten Modelle, Materialien und die Umgebung liegen unter `public/planner-assets/`. Herkunft, Lizenz, Maßstab und Prüfsummen sind in `public/planner-assets/manifest.json` dokumentiert. Fehlende oder beschädigte Modelle werden durch lokale parametrische Ersatzobjekte dargestellt.

## Technische Struktur

- `app/planner/domain`: kanonisches V3-Dokument und Schema
- `app/planner/geometry`: Raum-, Wand-, Öffnungs- und Kollisionsgeometrie
- `app/planner/plan-2d`: Konva-Szene und direkte Bearbeitung
- `app/planner/scene-3d`: verzögert geladene React-Three-Fiber-Szene
- `app/planner/store`: Befehle, Verlauf und lokale Persistenz
- `app/planner/export`: Sicherung, PNG, Druckmodell und Importvorschau

Die Anwendung benötigt keine Datenbank und keine Anmeldung. Hosting-Konfigurationen unter `.openai/` und `worker/` bleiben unabhängig davon bestehen.
