# Begehbare Gesamtwohnung mit Küche – Design

## Ziel

Der bestehende lokale Raumplaner erhält eine einzige, zusammenhängende Wohnungsansicht. Der vorhandene Gesamtgrundriss bleibt die maßstäbliche 2D-Grundlage; zusätzlich entsteht eine begehbare 3D-Gesamtwohnung, in der die Nutzerin oder der Nutzer durch die Innentüren zwischen allen Innenräumen wechseln kann. Die Wohnküche erhält die in den lokalen Originalquellen dargestellte L-Küche. Zimmer 1 und Vorraum werden nicht neu interpretiert, sondern aus ihrem bestehenden gespeicherten Zustand in die Gesamtansicht übernommen.

Die Umsetzung bleibt ausschließlich lokal. Die neue Küchen-PDF und andere private Originalquellen werden weder in die Anwendung eingebettet noch veröffentlicht oder in der Druckausgabe gezeigt.

## Quellen und Belegstatus

### Bestehendes gemeinsames Wohnungsmodell

`app/apartment-model.ts` bleibt die kanonische Quelle für Raumkonturen, Flächen, Öffnungen, Bodenarten und planbasierte Installationen. Seine globalen Meterkoordinaten werden für den Gesamtgrundriss, die begehbare 3D-Ansicht und die Druckausgabe verwendet.

### Küchenquellen

Die Küche wird aus zwei lokalen Quellen zusammengesetzt:

- Der Vermietungs-/Wohnungsplan belegt die L-förmige Stellfläche an der Nord- und Westseite der Wohnküche, die Lage von Spüle und Elektroherd sowie die Beziehung zu Türen und Laufwegen.
- `BD19929-1.PDF` belegt die sichtbare Ausführung: weiße Fronten, schwarze Arbeitsplatte, helle Holzrückwand, Backofen und Kochfeld am langen Lauf, Spüle am querlaufenden Schenkel, weiße Hängeschränke und eine integrierte Mikrowelle.

Die PDF enthält vier Perspektiven, aber keine verlässlich auslesbaren Einzelmaße oder Stückliste. Deshalb gelten:

- Küchenlage, L-Form und Gesamttiefe: **planmaßstäblich abgeleitet**.
- Farben, Materialwirkung und Geräteanordnung: **visuell belegt**.
- Einzelbreiten der Schrankkorpusse und exakte Montagehöhen: **geschätzt/offen** und sichtbar so gekennzeichnet.

Es werden keine konkreten Produktnamen, Kaufpreise oder Bestellnummern behauptet.

## Funktionsumfang

### Gemeinsame 2D-Wohnung

Der Reiter **Gesamtwohnung** behält den vollständigen Grundriss und zeigt zusätzlich den festen Küchen-Fußabdruck mit Arbeitsplatte, Spüle, Kochfeld und Gerätesymbolen. Zimmer-1- und Vorraum-Möbel bleiben in ihren Einzelraumplänen bearbeitbar; der Küchenblock ist als quellenbasierter Grundbestand fixiert.

### Begehbare 3D-Wohnung

Der Gesamtwohnungsreiter erhält den Umschalter **2D Gesamtplan / 3D Rundgang**. Die 3D-Szene enthält:

- alle Raum-Fußböden und planrichtigen Konturen;
- Außen- und Innenwände mit Öffnungen für Türen und Fenster;
- vorhandene feste Installationen;
- die aktuellen Möbelzustände aus Zimmer 1 und Vorraum;
- die feste Küche in der Wohnküche;
- zurückhaltende Raumlabels bzw. eine aktuelle Raumstatusanzeige, ohne private Quellenbilder.

Die separate Vorraumansicht behält alle Türblätter geschlossen. Nur im 3D-Gesamtrundgang werden Innentüren als geöffnete/passierbare Durchgänge dargestellt; die Wohnungseingangstür bleibt geschlossen. So bleibt der fotoabgeglichene Einzelraumstand erhalten, ohne den Rundgang zu blockieren.

### Steuerung

Die Rundgangkamera befindet sich auf etwa 162 cm Augenhöhe. Unterstützt werden:

- `W`, `A`, `S`, `D` und Pfeiltasten zum Gehen;
- Ziehen mit Maus oder Touch zum Umschauen;
- sichtbare Bildschirmtasten für Vorwärts, Rückwärts, Links und Rechts;
- Zurücksetzen zur Startposition;
- Vollbild wie in den vorhandenen 3D-Räumen.

Die Anwendung verwendet keinen erzwungenen Pointer-Lock. Fokus, Hilfetext und Steuerelemente bleiben per Tastatur erreichbar.

### Bewegung und Kollision

Die Kamera darf sich nur in den begehbaren Innenflächen und den Türportalen bewegen. Eine kleine Kollisionshülle verhindert das Durchlaufen von Wänden, festen Küchenblöcken und festem Mobiliar. Balkon und Loggia bleiben von den vorgesehenen Öffnungen aus erreichbar. Bei ungültiger Bewegung bleibt die letzte gültige Position bestehen.

## Architektur

### Reines Geometriemodul

Ein neues Modul `app/apartment-3d-model.ts` enthält testbare, rendererunabhängige Funktionen:

- globale Wohnungsgrenzen und Normalisierung der Koordinaten;
- Umrechnung lokaler Raum-Möbelpositionen in globale Wohnungskoordinaten;
- Küchenlayout mit Belegstatus;
- Wandsegmente und Öffnungsintervalle;
- Punkt-in-Polygon-, Portal- und Kollisionsprüfung;
- Bestimmung des aktuell betretenen Raums.

### 3D-Komponente

`app/apartment-3d.tsx` rendert die gemeinsame Szene mit Three.js. Die vorhandene `ThreeRoom`-Komponente bleibt für Zimmer 1 und Vorraum unverändert nutzbar. Gemeinsame visuelle Primitive werden nur dann ausgelagert, wenn dies ohne Risiko für den bestehenden Raumstand möglich ist.

### Zustandsfluss

`app/page.tsx` übergibt den aktuellen `itemsByRoom`-Zustand an die Gesamtwohnung. Änderungen in Zimmer 1 oder Vorraum erscheinen dadurch beim nächsten Wechsel in den Rundgang, ohne eine zweite Möbelkopie zu speichern. Die Küche wird als versionierter, fixer Grundbestand aus dem Modell geladen und nicht in den editierbaren Nutzerzustand dupliziert.

Die bestehende Speicherstruktur bleibt rückwärtskompatibel. Alte lokale Pläne mit Zimmer 1 und Vorraum werden weiterhin normalisiert; neue feste Küchenobjekte benötigen keine Migration persönlicher Daten.

## Darstellung

Die neue Gesamt-3D-Ansicht folgt `DESIGN.md`: warmer, matter Planungscharakter, Fertigparkett und Feinsteinzeug nach Raummodell, präzise technische Linien und keine unbelegte Fotorealistik. Die Küche setzt einen klaren Kontrast aus weißen Fronten, schwarzer Arbeitsplatte und heller Holzrückwand. Die einzige neue charakteristische Interaktion ist der ruhige Rundgang durch die zusammenhängende Wohnung; zusätzliche dekorative Effekte oder automatische Kamerafahrten werden nicht ergänzt.

Auf kleinen Bildschirmen liegen die Bewegungstasten über dem unteren Rand der Szene, ohne den Raumstatus zu verdecken. `prefers-reduced-motion` reduziert rein dekorative Übergänge; direkte Kameraeingaben bleiben unverzögert.

## Druck und Dokumentation

Die Gesamtwohnungs-Druckansicht zeigt weiterhin den vollständigen 2D-Plan und ergänzt:

- Küchen-Fußabdruck und Gerätepositionen;
- eine kompakte Legende zum Küchen-Belegstatus;
- eine gerenderte 3D-Gesamtübersicht, sofern die Aufnahme vor dem Druck erfolgreich erzeugt wurde.

Falls die 3D-Aufnahme nicht rechtzeitig bereitsteht, zeigt die Anwendung eine lokale, nicht-destruktive Fehlermeldung und druckt nicht unbemerkt einen unvollständigen Bericht.

## Fehler- und Sicherheitsverhalten

- WebGL-Fehler werden in der Arbeitsfläche verständlich angezeigt; der 2D-Plan bleibt verfügbar.
- Verliert das Browserfenster den Fokus, werden alle Bewegungstasten zurückgesetzt, damit die Kamera nicht weiterläuft.
- Importierte Pläne können keine festen Küchenobjekte überschreiben.
- Private Dateinamen, Kundendaten und PDF-Seiten erscheinen weder im DOM noch in Exporten oder Druckansichten.
- Es werden keine Bestellungen oder externen Uploads ausgelöst.

## Tests und Abnahme

### Automatisierte Tests

- Küchenlayout liegt vollständig innerhalb der Wohnküche und blockiert keine Türportale.
- Lokale Möbelpositionen werden korrekt in globale Wohnungskoordinaten überführt.
- Kollisionsprüfung erlaubt Raumwechsel durch Innentüren und verhindert Wand- bzw. Küchen-Durchdringung.
- Der Gesamtwohnungsreiter enthält 2D-/3D-Umschalter, Rundgangsteuerung und Küchenlegende.
- Alte gespeicherte Zustände bleiben kompatibel.
- Server-Rendering enthält keine privaten PDF- oder Bilddateinamen.

Alle neuen Modellfunktionen werden testgetrieben entwickelt: Test zuerst, erwartetes Fehlschlagen prüfen, minimale Implementierung, anschließend vollständige Testsuite.

### Visuelle und interaktive Prüfung

- Gesamtgrundriss auf Desktop und schmalem Viewport;
- 3D-Startansicht und Durchgang Wohnküche → Zimmer 1, Vorraum und Zimmer 2;
- Tastatur-, Maus-/Touch- und Bildschirmsteuerung;
- Kollision mit Außenwand, Küche und festem Mobiliar;
- Erhalt der bestehenden Zimmer-1- und Vorraumansichten;
- Druckvorschau mit Küche und 3D-Gesamtübersicht;
- Build, Lint, Projekt-Tests und strenge UI-Prüfung.

## Bewusst offene Punkte

Die Einzelbreiten der Küchenmodule und exakten Montagehöhen bleiben mangels bemaßter Küchenzeichnung offen. Die Umsetzung stellt sie proportional zur belegten Gesamtstellfläche dar und kennzeichnet sie als abgeleitet. Eine spätere bemaßte Küchenzeichnung kann diese Werte ersetzen, ohne Grundriss oder Rundgangarchitektur umzubauen.
