import type { Metadata } from "next";

import { PlannerWorkspace } from "./workspace/planner-workspace.tsx";

export const metadata: Metadata = {
  title: "Raumplaner — Wohnung",
  description: "Die Wohnung maßhaltig in 2D und 3D planen.",
};

export default function PlannerPage() {
  return <PlannerWorkspace />;
}
