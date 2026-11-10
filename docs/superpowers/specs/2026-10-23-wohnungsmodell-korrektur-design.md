# Korrekturdesign: Wohnung, Öffnungen und Zimmer 1

## Ziel

Der lokale Planer soll wieder ein einziges, nachvollziehbares Wohnungsmodell verwenden. Grundriss, begehbare 3D-Ansicht und Raumansichten müssen dieselben Wände, Türen, Fenster und Außenflächen zeigen. Die Korrektur folgt dem Wohnungsplan sowie den lokalen Fotos und Videos; private Quellen bleiben ausschließlich lokal.

## Verbindliche Entscheidungen

- Der jetzige Quellstand wird vor Änderungen als lokale ZIP-Sicherung abgelegt.
- Rechtsziehen mit der Maus dreht den Blick nach rechts; Linkziehen nach links.
- Türen sind eigenständige, sichtbare Bauteile mit Zustand `offen` oder `geschlossen`. Der Zustand gilt zugleich für Darstellung und Begehbarkeit.
- Türarten werden unterschieden: Wohnungseingang massiv, Innentüren massiv, Wohnküchentür mit Glasfüllung, Balkon-/Loggiatüren verglast.
- Die Wohnküchenfassade erhält die aus Plan und Fotos belegte Reihenfolge: Fenster – Holzpaneelwand – Fenster – verglaste Loggiatür. Die irrtümliche massive Tür direkt neben der Paneelwand entfällt.
- Loggia und Balkon bleiben Teil des Gesamtmodells und werden in der Wohnküchenansicht sichtbar einbezogen.
- Fenster erhalten Rahmen, Brüstung, Flügelteilung und Glas statt einer einfachen blauen Fläche.
- Der Vorraum nutzt dieselbe 3D-Geometrie wie die Gesamtwohnung. Boden, Türen und feste Installationen werden anhand der lokalen Bilder angeglichen; Umzugskartons werden nicht als Bestand modelliert.
- Zimmer 1 wird aus dem gesicherten, zuvor bestätigten Stand wiederhergestellt: richtige Tischausrichtung, Vorhang, Wandplatte beim Tisch, Bett, Spiegel und geschlossener Schrank. Neue Experimente werden dort nicht übernommen.
- Änderungen bleiben gezielt. Es gibt keinen großflächigen technischen Umbau und keine Online-Produktrecherche.

## Bedienung

In der 3D-Ansicht erscheinen einfache Türschalter für die Türen des gerade gewählten Bereichs. Ein Klick öffnet oder schließt die jeweilige Tür. Geschlossene Türen blockieren den Durchgang; geöffnete Türen geben ihn frei.

## Visuelle Leitlinie

Materialien und Farben orientieren sich an den Fotos: warmer Holz-/Parkettboden in den Wohnräumen, kleine graubeige Fliesen im Vorraum, matte warme Wände, weiße Rahmen und Türen sowie die belegte Holzpaneel-/Mooswand in der Wohnküche. Dekoration wird nur dort übernommen, wo sie aus dem bisherigen Plan oder den Quellen belegt ist.

## Prüfung

Nach der Umsetzung werden ausschließlich praktische Prüfungen ausgeführt: lokaler Build, gezielte Modelltests und visuelle Kontrolle der Gesamtwohnung, Wohnküche, Vorraum und Zimmer 1. Dabei werden Mausdrehrichtung, Türzustände, Fensterfolge, Außenflächen und die wichtigsten Zimmer-1-Bestandsmerkmale kontrolliert.
