# Innenausstattungsmodelle

Die Ablage ist nach Herkunft getrennt:

```text
models/
  products/<model-id>/ # kaufbare/recherchierte Möbel und Deko
      manifest.json
      link.txt       # Produktquelle(n) oder Quellenstatus
      README.md
      source/        # Crawled HTML, URLs, Videos, Rohbilder
      references/    # normale Ansicht, Maßgrafik, Detailfotos
      textures/      # basecolor, roughness, normal, metallic, alpha
      mesh/          # GLB/GLTF/OBJ/FBX und Exportnotizen
      runtime/       # Renderer, Materialprofil, Varianten
  fixed/        # Wohnung selbst: Türen, Badewanne, WC, Küche, Spiegel, Steckdosen, Fixtures
  _template/    # Vorlage für neue Modelle
```

Produktordner bekommen immer eine `link.txt`: mit einer oder mehreren URLs, wenn Quellen bekannt sind, oder mit einem klaren Quellenstatus. Bei wohnungsgebundenen Elementen beschreibt `fixed/<id>/link.txt`, dass das Objekt zur Wohnung/Architektur gehört und keine externe Produktquelle benötigt. Der Viewer bleibt zentral unter `app/planner/scene-3d/`; die Ordner bilden die Asset- und Quellenverwaltung.
