# Veröffentlichungswege

- `main` → `wohnungsplaner-main` → schneller privater Preview-Dienst `wohnungsplaner-preview`.
- Tag `production-*` → `wohnungsplaner-production` → vollständige Tests, Browserbericht und manueller Produktions-Deploy `wohnungsplaner`.

Jede Modelländerung braucht für Cloud Run einen neuen Container-Build. Lokal zeigt
`npm run dev:review` die Änderung sofort über HMR. Die Preview baut danach nur
Build und Container; die ausführliche GUI-/3D-Prüfung bleibt der Production-Pipeline
vorbehalten.
