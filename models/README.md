# Möbelmodell-Ablage

Jedes Modell lebt in einem eigenen Ordner. Rohmaterial bleibt unter `source/`, ausgewählte Referenzen unter `references/`, PBR-Texturen unter `textures/`, exportierte 3D-Dateien unter `mesh/` und modellbezogene Laufzeitnotizen unter `runtime/`.

```text
models/<model-id>/
  manifest.json
  README.md
  source/       # Crawled URLs, HTML, Videos, Rohbilder
  references/   # normale Ansicht, Maßgrafik, Detailbilder
  textures/     # basecolor, roughness, normal, metallic, alpha
  mesh/         # .glb/.gltf/.obj/.fbx und Blend-Exportnotizen
  runtime/      # Profil, Materialzuordnung, Variantenhinweise
```

Der Viewer bleibt zentral unter `app/planner/scene-3d/`. Ein Modellordner beschreibt die Quelle und die Runtime-Zuordnung; der eigentliche Renderer kann schrittweise von parametrischer Geometrie auf GLB wechseln.
