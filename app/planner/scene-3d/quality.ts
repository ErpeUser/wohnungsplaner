export type QualityTier = "low" | "balanced" | "high";

export type QualitySettings = {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  effects: boolean;
};

export type ThreeSupport = {
  supported: boolean;
  webgl2: boolean;
  reason?: string;
};

const QUALITY: Record<QualityTier, QualitySettings> = {
  low: { dpr: [1, 1.25], shadows: false, shadowMapSize: 512, effects: false },
  balanced: { dpr: [1, 1.75], shadows: true, shadowMapSize: 1024, effects: false },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, effects: true },
};

export function qualitySettings(tier: QualityTier): QualitySettings {
  return { ...QUALITY[tier], dpr: [...QUALITY[tier].dpr] as [number, number] };
}

export function detectThreeSupport(): ThreeSupport {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { supported: false, webgl2: false, reason: "3D wird erst im Browser gestartet." };
  }
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      failIfMajorPerformanceCaveat: true,
    });
    if (!context) {
      return { supported: false, webgl2: false, reason: "WebGL 2 ist auf diesem Gerät nicht verfügbar." };
    }
    return { supported: true, webgl2: true };
  } catch {
    return { supported: false, webgl2: false, reason: "Die 3D-Grafik konnte nicht initialisiert werden." };
  }
}

export function chooseQualityTier(): QualityTier {
  if (typeof window === "undefined") return "balanced";
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const cores = navigator.hardwareConcurrency || 4;
  // A desktop with four cores can still render the planner comfortably. The
  // old CPU cut-off disabled every shadow on common office hardware, making
  // cabinets, tiles and rugs read as flat colour blocks. Keep the lightweight
  // tier for explicit reduced-motion preferences or very high pixel densities.
  if (reducedMotion || window.devicePixelRatio > 2.5) return "low";
  if (cores >= 10 && window.devicePixelRatio <= 2) return "high";
  return "balanced";
}

