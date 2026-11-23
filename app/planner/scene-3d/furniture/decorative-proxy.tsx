import { DetailStrip, SHARED_BOX, SHARED_CYLINDER } from "./primitives.tsx";
import { getPlannerMaterial } from "../materials.ts";

type ProxyProps = {
  catalogId: string;
  fallback: string;
  materialId: string;
};

const MIRROR_IDS = new Set(["deko-aliexpress-06", "deko-temu-03"]);
const FRAMED_ART_IDS = new Set([
  "deko-aliexpress-09",
  "deko-aliexpress-14",
  "deko-aliexpress-19",
  "deko-temu-01",
]);
const PANEL_IDS = new Set([
  "deko-aliexpress-03",
  "deko-aliexpress-04",
  "deko-aliexpress-08",
  "deko-aliexpress-10",
  "deko-aliexpress-16",
  "deko-aliexpress-17",
  "deko-aliexpress-20",
  "deko-temu-02",
  "deko-temu-06",
  "deko-temu-09",
  "deko-temu-11",
  "deko-temu-16",
  "deko-temu-17",
  "deko-temu-18",
]);

function ProxyMesh({
  position,
  scale,
  materialId,
  rotation,
  round = false,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  materialId: string;
  rotation?: [number, number, number];
  round?: boolean;
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      geometry={round ? SHARED_CYLINDER : SHARED_BOX}
      castShadow
      receiveShadow
    >
      <primitive object={getPlannerMaterial(materialId)} attach="material" />
    </mesh>
  );
}

function WallFrame({ materialId, mirror = false, square = false }: { materialId: string; mirror?: boolean; square?: boolean }) {
  const frame = materialId === "metal-satin" ? "metal-satin" : "walnut";
  return (
    <group position={[0, 0.5, 0]}>
      <ProxyMesh position={[0, 0, -0.01]} scale={[0.9, square ? 0.78 : 0.88, 0.035]} materialId={mirror ? "mirror-glass" : "wallpaper-vintage-beige-fabric"} />
      <DetailStrip position={[0, square ? 0.39 : 0.44, 0.025]} scale={[0.94, 0.035, 0.045]} materialId={frame} />
      <DetailStrip position={[0, square ? -0.39 : -0.44, 0.025]} scale={[0.94, 0.035, 0.045]} materialId={frame} />
      <DetailStrip position={[-0.45, 0, 0.025]} scale={[0.035, square ? 0.78 : 0.88, 0.045]} materialId={frame} />
      <DetailStrip position={[0.45, 0, 0.025]} scale={[0.035, square ? 0.78 : 0.88, 0.045]} materialId={frame} />
      {mirror ? <ProxyMesh position={[0, 0, 0.045]} scale={[0.76, square ? 0.61 : 0.72, 0.018]} materialId="mirror-glass" /> : null}
    </group>
  );
}

function ShelfProxy({ materialId, dark = false }: { materialId: string; dark?: boolean }) {
  const wood = dark ? "metal-dark" : materialId === "metal-satin" ? "metal-satin" : "oak-natural";
  return (
    <group>
      <ProxyMesh position={[-0.43, 0.5, 0]} scale={[0.06, 0.94, 0.84]} materialId={wood} />
      <ProxyMesh position={[0.43, 0.5, 0]} scale={[0.06, 0.94, 0.84]} materialId={wood} />
      {[0.08, 0.5, 0.92].map((y) => <ProxyMesh key={y} position={[0, y, 0]} scale={[0.88, 0.06, 0.82]} materialId={wood} />)}
    </group>
  );
}

function WallLightProxy({ catalogId, materialId }: { catalogId: string; materialId: string }) {
  const warm = catalogId.includes("neon") || catalogId.includes("led") || catalogId.includes("nachtlicht");
  const glow = warm ? "white-matte" : materialId;
  return (
    <group position={[0, 0.5, 0]}>
      <ProxyMesh position={[0, 0, -0.02]} scale={[0.86, 0.1, 0.04]} materialId="metal-dark" />
      {catalogId.includes("spiral") ? (
        <ProxyMesh position={[0, 0, 0.04]} scale={[0.16, 0.78, 0.06]} materialId={glow} round />
      ) : (
        <ProxyMesh position={[0, 0, 0.04]} scale={[0.78, 0.14, 0.06]} materialId={glow} />
      )}
      <ProxyMesh position={[0, -0.2, 0.04]} scale={[0.06, 0.34, 0.06]} materialId="metal-satin" />
    </group>
  );
}

function PlantProxy({ catalogId, materialId }: { catalogId: string; materialId: string }) {
  const leaf = materialId === "oak-natural" ? "leaf-green" : materialId;
  const hanging = catalogId.includes("lichterkette") || catalogId.includes("ranke") || catalogId.includes("blätter");
  return (
    <group>
      <ProxyMesh position={[0, 0.14, 0]} scale={[0.3, 0.22, 0.3]} materialId="terracotta" round />
      {[[-0.22, 0.52, 0], [0.22, 0.58, 0.04], [0, 0.72, -0.04], [-0.3, 0.77, 0.03], [0.28, 0.86, -0.02]].map(([x, y, z], index) => (
        <ProxyMesh key={index} position={[x, y, z]} scale={[0.28, hanging ? 0.14 : 0.34, 0.16]} materialId={leaf} round />
      ))}
      {hanging ? <ProxyMesh position={[0, 0.48, 0.08]} scale={[0.05, 0.62, 0.04]} materialId="oak-natural" /> : null}
    </group>
  );
}

function SmallSculptureProxy({ catalogId, materialId }: { catalogId: string; materialId: string }) {
  const metal = materialId === "oak-natural" ? "metal-satin" : materialId;
  const tall = catalogId.includes("eiffelturm") || catalogId.includes("schild");
  return (
    <group>
      <ProxyMesh position={[0, 0.06, 0]} scale={[0.46, 0.1, 0.38]} materialId={metal} round />
      <ProxyMesh position={[0, tall ? 0.52 : 0.42, 0]} scale={[tall ? 0.16 : 0.46, tall ? 0.82 : 0.58, 0.08]} materialId={metal} />
      {tall ? <ProxyMesh position={[0, 0.9, 0]} scale={[0.28, 0.04, 0.12]} materialId={metal} /> : <ProxyMesh position={[0, 0.73, 0]} scale={[0.28, 0.08, 0.12]} materialId={metal} />}
    </group>
  );
}

/** Lightweight, honest visual proxies for catalogue items without local GLB/GLTF assets. */
export function DecorativeProxy({ catalogId, fallback, materialId }: ProxyProps) {
  if (fallback === "shelf") return <ShelfProxy materialId={materialId} dark={catalogId.includes("schwarz")} />;
  if (fallback === "lamp") return <WallLightProxy catalogId={catalogId} materialId={materialId} />;
  if (fallback === "plant") return <PlantProxy catalogId={catalogId} materialId={materialId} />;

  if (MIRROR_IDS.has(catalogId)) return <WallFrame materialId={materialId} mirror />;
  if (FRAMED_ART_IDS.has(catalogId)) {
    return <WallFrame materialId={materialId} square={catalogId === "deko-temu-01"} />;
  }
  if (PANEL_IDS.has(catalogId)) {
    return <ProxyMesh position={[0, 0.5, 0]} scale={[0.92, 0.84, 0.035]} materialId={materialId} />;
  }
  return <SmallSculptureProxy catalogId={catalogId} materialId={materialId} />;
}
