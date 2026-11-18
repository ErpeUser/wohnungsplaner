import { RoundedBox } from "@react-three/drei";
import { getPlannerMaterial } from "../materials.ts";
import { DetailStrip, SHARED_BOX, SHARED_CYLINDER, SHARED_SPHERE } from "./primitives.tsx";



export function DetailedFloorLamp() {
  const base = getPlannerMaterial("metal-dark");
  const stem = getPlannerMaterial("metal-satin");
  const shade = getPlannerMaterial("shade-linen");
  return (
    <group>
      <mesh position={[0, 0.035, 0]} scale={[0.42, 0.07, 0.42]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={base} attach="material" />
      </mesh>
      <mesh position={[0, 0.78, 0]} scale={[0.045, 1.45, 0.045]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={stem} attach="material" />
      </mesh>
      <mesh position={[0, 1.52, 0]} scale={[0.38, 0.28, 0.38]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={shade} attach="material" />
      </mesh>
      <mesh position={[0, 1.45, 0]} scale={[0.11, 0.08, 0.11]} geometry={SHARED_SPHERE} castShadow>
        <meshStandardMaterial color="#fff4da" emissive="#ffd27a" emissiveIntensity={0.65} roughness={0.32} />
      </mesh>
      <pointLight position={[0, 1.45, 0]} color="#ffd59a" intensity={0.18} distance={1.5} decay={2} />
    </group>
  );
}



export function StandardPlant() {
  const pot = getPlannerMaterial("terracotta");
  const leaf = getPlannerMaterial("leaf-green");
  const stems = [-0.2, -0.07, 0.08, 0.22];
  return (
    <group>
      <mesh position={[0, 0.16, 0]} scale={[0.62, 0.32, 0.62]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={pot} attach="material" />
      </mesh>
      {stems.map((x, index) => (
        <group key={x} position={[x, 0.38, index % 2 === 0 ? -0.03 : 0.05]} rotation={[0, 0, (index - 1.5) * 0.12]}>
          <mesh position={[0, 0.3, 0]} scale={[0.028, 0.58, 0.028]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={getPlannerMaterial("metal-dark")} attach="material" />
          </mesh>
          <mesh position={[index % 2 === 0 ? -0.12 : 0.12, 0.6, index % 2 === 0 ? 0.04 : -0.04]} scale={[0.2, 0.09, 0.07]} geometry={SHARED_SPHERE} castShadow receiveShadow>
            <primitive object={leaf} attach="material" />
          </mesh>
          <mesh position={[index % 2 === 0 ? 0.12 : -0.12, 0.75, index % 2 === 0 ? -0.03 : 0.03]} scale={[0.18, 0.08, 0.065]} geometry={SHARED_SPHERE} castShadow receiveShadow>
            <primitive object={leaf} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}



export function LedChargingNightstand() {
  const white = getPlannerMaterial("white-lacquer");
  const dark = getPlannerMaterial("metal-dark");
  const black = getPlannerMaterial("screen-black");
  const drawerYs = [0.19, 0.43];

  return (
    <group>
      <RoundedBox args={[0.94, 0.72, 0.88]} radius={0.025} smoothness={5} position={[0, 0.36, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>

      {drawerYs.map((y) => (
        <group key={`drawer-${y}`}>
          <RoundedBox args={[0.82, 0.205, 0.035]} radius={0.012} smoothness={4} position={[0, y, 0.458]} castShadow receiveShadow>
            <primitive object={white} attach="material" />
          </RoundedBox>
          <RoundedBox args={[0.24, 0.025, 0.028]} radius={0.01} smoothness={4} position={[0, y + 0.015, 0.486]} castShadow>
            <primitive object={dark} attach="material" />
          </RoundedBox>
        </group>
      ))}

      <RoundedBox args={[0.82, 0.18, 0.045]} radius={0.012} smoothness={4} position={[0, 0.625, 0.458]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9f1ff" emissive="#2b9fff" emissiveIntensity={1.45} roughness={0.38} />
      </RoundedBox>
      <mesh position={[0, 0.585, 0.432]} scale={[0.74, 0.018, 0.72]} geometry={SHARED_BOX} receiveShadow>
        <meshStandardMaterial color="#b9e4ff" emissive="#168de0" emissiveIntensity={0.72} roughness={0.45} />
      </mesh>
      <pointLight position={[0, 0.65, 0.52]} color="#65bfff" intensity={0.28} distance={0.85} decay={2} />

      <RoundedBox args={[0.98, 0.095, 0.96]} radius={0.035} smoothness={6} position={[0, 0.785, 0]} rotation={[-0.06, 0, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.085, 0.42]} radius={0.025} smoothness={6} position={[0, 0.88, -0.16]} rotation={[-0.18, 0, 0]} castShadow receiveShadow>
        <primitive object={white} attach="material" />
      </RoundedBox>

      {[-0.19, 0.19].map((x) => (
        <group key={`socket-${x}`} position={[x, 0.93, -0.145]} rotation={[-0.18, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.095, 0.018, 0.095]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={black} attach="material" />
          </mesh>
          {[-0.027, 0.027].map((pinX) => (
            <mesh key={pinX} position={[pinX, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.012, 0.024, 0.012]} geometry={SHARED_CYLINDER}>
              <primitive object={white} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.055, 0.055].map((x) => (
        <RoundedBox key={`usb-${x}`} args={[0.07, 0.018, 0.026]} radius={0.005} smoothness={3} position={[x, 0.936, 0.045]} rotation={[-0.18, 0, 0]}>
          <primitive object={black} attach="material" />
        </RoundedBox>
      ))}

      {[-0.4, 0.4].flatMap((x) => [-0.34, 0.34].map((z) => (
        <mesh key={`foot-${x}-${z}`} position={[x, 0.025, z]} scale={[0.065, 0.05, 0.065]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      )))}
    </group>
  );
}



export function TejoHallway() {
  const cashmere = getPlannerMaterial("tejo-cashmere-grain");
  const panel = getPlannerMaterial("tejo-panel-greige");
  const mirror = getPlannerMaterial("mirror-glass");
  const dark = getPlannerMaterial("metal-dark");
  const paddedRows = [0.34, 0.425, 0.51, 0.595, 0.68];
  const hookXs = [0.03, 0.17, 0.31, 0.45];

  return (
    <group>
      <RoundedBox args={[0.98, 0.205, 0.94]} radius={0.012} smoothness={3} position={[0, 0.112, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.208, 0.478]} scale={[0.94, 0.012, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>

      <RoundedBox args={[0.325, 0.61, 0.94]} radius={0.01} smoothness={3} position={[-0.327, 0.515, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.267, 0.53, 0.022]} radius={0.008} smoothness={4} position={[-0.327, 0.53, 0.482]} castShadow receiveShadow>
        <primitive object={mirror} attach="material" />
      </RoundedBox>
      <mesh position={[-0.327, 0.53, 0.496]} scale={[0.235, 0.49, 0.008]} geometry={SHARED_BOX} receiveShadow>
        <primitive object={mirror} attach="material" />
      </mesh>
      <DetailStrip position={[-0.327, 0.53, 0.459]} scale={[0.285, 0.012, 0.012]} materialId="metal-satin" />
      <DetailStrip position={[-0.47, 0.53, 0.482]} scale={[0.012, 0.53, 0.012]} materialId="metal-satin" />
      <DetailStrip position={[-0.184, 0.53, 0.482]} scale={[0.012, 0.53, 0.012]} materialId="metal-satin" />

      <RoundedBox args={[0.61, 0.57, 0.055]} radius={0.01} smoothness={3} position={[0.18, 0.515, -0.445]} castShadow receiveShadow>
        <primitive object={panel} attach="material" />
      </RoundedBox>
      {paddedRows.map((y) => (
        <RoundedBox key={y} args={[0.565, 0.075, 0.035]} radius={0.018} smoothness={5} position={[0.18, y, -0.407]} castShadow receiveShadow>
          <primitive object={panel} attach="material" />
        </RoundedBox>
      ))}

      <RoundedBox args={[0.58, 0.055, 0.73]} radius={0.025} smoothness={5} position={[0.19, 0.244, 0.07]} castShadow receiveShadow>
        <primitive object={panel} attach="material" />
      </RoundedBox>
      <DetailStrip position={[0.19, 0.27, 0.445]} scale={[0.48, 0.012, 0.012]} materialId="tejo-cashmere" />
      <DetailStrip position={[0.19, 0.515, -0.478]} scale={[0.48, 0.012, 0.012]} materialId="metal-satin" />

      <RoundedBox args={[0.98, 0.19, 0.94]} radius={0.012} smoothness={3} position={[0, 0.9, 0]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.807, 0.478]} scale={[0.94, 0.012, 0.012]} geometry={SHARED_BOX} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>

      <mesh position={[0.19, 0.785, 0.425]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.52, 0.025]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={dark} attach="material" />
      </mesh>
      {[-0.08, 0.46].map((x) => (
        <mesh key={x} position={[x, 0.76, 0.425]} scale={[0.025, 0.08, 0.025]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}

      {hookXs.map((x) => (
        <group key={x} position={[x, 0.69, -0.355]}>
          <mesh position={[0, 0, 0]} scale={[0.022, 0.075, 0.025]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
          <mesh position={[0, -0.027, 0.025]} rotation={[0.55, 0, 0]} scale={[0.022, 0.055, 0.022]} geometry={SHARED_BOX} castShadow>
            <primitive object={dark} attach="material" />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[0.565, 0.09, 0.025]} radius={0.005} smoothness={3} position={[0.18, 0.69, -0.38]} castShadow receiveShadow>
        <primitive object={cashmere} attach="material" />
      </RoundedBox>

      {[-0.43, 0.43].map((x) => (
        <mesh key={x} position={[x, 0.012, 0.32]} scale={[0.055, 0.024, 0.055]} geometry={SHARED_BOX} castShadow>
          <primitive object={dark} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function Zimmer1OlivePlant() {
  const leaves = getPlannerMaterial("leaf-olive-soft");
  const trunk = getPlannerMaterial("oak-artisan-edge");
  const pot = getPlannerMaterial("ceramic-pot-glazed");
  const branches = [
    [-0.24, 0.54, -0.12, -0.28], [0.22, 0.58, 0.16, 0.3],
    [-0.18, 0.7, 0.18, -0.24], [0.2, 0.76, -0.14, 0.26],
    [-0.11, 0.88, 0.12, -0.2], [0.12, 0.92, -0.08, 0.18],
  ] as const;
  return (
    <group>
      <RoundedBox args={[0.66, 0.22, 0.66]} radius={0.11} smoothness={5} position={[0, 0.11, 0]} castShadow receiveShadow>
        <primitive object={pot} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0.49, 0]} scale={[0.095, 0.72, 0.095]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={trunk} attach="material" />
      </mesh>
      {branches.map(([x, y, z, tilt], index) => (
        <group key={index} position={[x, y, z]} rotation={[0, tilt, index % 2 === 0 ? -0.42 : 0.42]}>
          <mesh scale={[0.04, 0.36, 0.04]} geometry={SHARED_CYLINDER} castShadow><primitive object={trunk} attach="material" /></mesh>
          {[-0.13, 0, 0.13].flatMap((offset, leafIndex) => [
            <mesh key={`left-${leafIndex}`} position={[-0.11, offset, 0]} rotation={[0, 0, -0.65]} scale={[0.22, 0.1, 0.09]} geometry={SHARED_SPHERE} castShadow><primitive object={leaves} attach="material" /></mesh>,
            <mesh key={`right-${leafIndex}`} position={[0.11, offset + 0.035, 0]} rotation={[0, 0, 0.65]} scale={[0.22, 0.1, 0.09]} geometry={SHARED_SPHERE} castShadow><primitive object={leaves} attach="material" /></mesh>,
          ])}
        </group>
      ))}
    </group>
  );
}



export function getWardrobeFrontLayout() {
  return [
    { center: -0.4, width: 0.2, kind: "door", finish: "white-matte" },
    { center: -0.2, width: 0.2, kind: "drawers", finish: "vinyl-cashmere-cream" },
    { center: 0, width: 0.2, kind: "mirror", finish: "mirror-glass" },
    { center: 0.2, width: 0.2, kind: "drawers", finish: "vinyl-cashmere-cream" },
    { center: 0.4, width: 0.2, kind: "door", finish: "white-matte" },
  ] as const;
}



export function PhotoWardrobe() {
  const white = getPlannerMaterial("white-lacquer");
  const frame = getPlannerMaterial("wardrobe-frame-silver");
  const metal = getPlannerMaterial("metal-satin");
  const modules = getWardrobeFrontLayout();
  const moduleBoundaries = modules.slice(0, -1).map((module) => module.center + module.width / 2);
  const upperHandleXs = [-0.31, -0.29, 0.29, 0.31];
  return (
    <group>
      <mesh position={[0, 0.5, 0]} scale={[0.99, 1, 0.96]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0, 0.025, 0.03]} scale={[1.01, 0.05, 0.99]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[-0.493, 0.5, 0.01]} scale={[0.026, 1, 0.98]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0.493, 0.5, 0.01]} scale={[0.026, 1, 0.98]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
      {modules.map((module, index) => {
        return (
          <group key={index} position={[module.center, 0, 0.493]}>
            {module.kind === "drawers" ? (
              <>
                <RoundedBox args={[module.width - 0.012, 0.665, 0.028]} radius={0.006} smoothness={2} position={[0, 0.6425, 0]} castShadow receiveShadow>
                  <primitive object={white} attach="material" />
                </RoundedBox>
                {[0.095, 0.245].map((y) => (
                  <group key={y}>
                    <RoundedBox args={[module.width - 0.014, 0.14, 0.034]} radius={0.006} smoothness={2} position={[0, y, 0.006]} castShadow receiveShadow>
                      <primitive object={getPlannerMaterial(module.finish)} attach="material" />
                    </RoundedBox>
                    <mesh position={[0, y, 0.037]} scale={[module.width * 0.5, 0.014, 0.014]} geometry={SHARED_CYLINDER} rotation={[0, 0, Math.PI / 2]} castShadow><primitive object={metal} attach="material" /></mesh>
                  </group>
                ))}
              </>
            ) : (
              <RoundedBox args={[module.width - 0.012, 0.955, 0.028]} radius={0.006} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow>
                <primitive object={getPlannerMaterial(module.finish)} attach="material" />
              </RoundedBox>
            )}
          </group>
        );
      })}
      {moduleBoundaries.map((x) => (
        <mesh key={x} position={[x, 0.5, 0.509]} scale={[0.005, 0.955, 0.012]} geometry={SHARED_BOX} castShadow>
          <primitive object={frame} attach="material" />
        </mesh>
      ))}
      {upperHandleXs.map((x) => (
        <mesh key={x} position={[x, 0.58, 0.535]} scale={[0.014, 0.16, 0.014]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={metal} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 1.008, 0]} scale={[1.02, 0.025, 1.01]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
    </group>
  );
}



export function PhotoDesk() {
  const white = getPlannerMaterial("white-matte");
  const metal = getPlannerMaterial("metal-satin");
  return (
    <group>
      <RoundedBox args={[1, 0.09, 1]} radius={0.025} smoothness={3} position={[0, 0.94, 0]} castShadow receiveShadow><primitive object={white} attach="material" /></RoundedBox>
      <group position={[-0.36, 0.42, 0]}>
        <mesh scale={[0.3, 0.82, 0.9]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
        {[0.24, 0, -0.24].map((y) => (
          <group key={y}>
            <mesh position={[0, y, 0.465]} scale={[0.282, 0.225, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={white} attach="material" /></mesh>
            <mesh position={[0, y + 0.065, 0.485]} scale={[0.12, 0.014, 0.014]} geometry={SHARED_CYLINDER} rotation={[0, 0, Math.PI / 2]} castShadow><primitive object={metal} attach="material" /></mesh>
          </group>
        ))}
      </group>
      <mesh position={[0.43, 0.46, 0]} scale={[0.07, 0.88, 0.88]} geometry={SHARED_BOX} castShadow receiveShadow><primitive object={white} attach="material" /></mesh>
      <mesh position={[0.03, 0.78, -0.38]} scale={[0.72, 0.05, 0.05]} geometry={SHARED_BOX} castShadow><primitive object={metal} attach="material" /></mesh>
    </group>
  );
}



export function StandardWardrobe({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const frame = getPlannerMaterial("wardrobe-frame-silver");
  const handle = getPlannerMaterial("metal-satin");
  const doors = [-0.375, -0.125, 0.125, 0.375];

  return (
    <group>
      <RoundedBox args={[0.98, 0.98, 0.92]} radius={0.018} smoothness={3} position={[0, 0.5, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.02, 0.045, 0.96]} radius={0.012} smoothness={3} position={[0, 0.985, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {doors.map((x, index) => (
        <group key={x}>
          <RoundedBox args={[0.238, 0.91, 0.028]} radius={0.008} smoothness={2} position={[x, 0.505, 0.468]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          {index < doors.length - 1 ? (
            <mesh position={[x + 0.125, 0.505, 0.486]} scale={[0.006, 0.91, 0.012]} geometry={SHARED_BOX}>
              <primitive object={frame} attach="material" />
            </mesh>
          ) : null}
          <mesh position={[x + (index % 2 === 0 ? 0.082 : -0.082), 0.505, 0.492]} scale={[0.012, 0.16, 0.012]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={handle} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.03, 0.02]} scale={[1.01, 0.05, 0.94]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </mesh>
    </group>
  );
}



export function DetailedDresser({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const handle = getPlannerMaterial("metal-satin");
  const drawerYs = [0.2, 0.43, 0.66];

  return (
    <group>
      <RoundedBox args={[0.98, 0.82, 0.84]} radius={0.025} smoothness={3} position={[0, 0.43, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.02, 0.07, 0.88]} radius={0.02} smoothness={4} position={[0, 0.87, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {drawerYs.map((y) => (
        <group key={y}>
          <RoundedBox args={[0.88, 0.19, 0.028]} radius={0.01} smoothness={3} position={[0, y, 0.434]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          <mesh position={[0, y + 0.012, 0.454]} rotation={[0, 0, Math.PI / 2]} scale={[0.012, 0.14, 0.012]} geometry={SHARED_CYLINDER} castShadow>
            <primitive object={handle} attach="material" />
          </mesh>
        </group>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.035, 0]} scale={[0.07, 0.06, 0.07]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={handle} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function DetailedShelf({ materialId }: { materialId: string }) {
  const shelf = getPlannerMaterial(materialId);
  const back = getPlannerMaterial("drawer-charcoal");
  const levels = [0.17, 0.39, 0.61, 0.83];

  return (
    <group>
      <mesh position={[0, 0.5, -0.42]} scale={[0.98, 0.96, 0.035]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={back} attach="material" />
      </mesh>
      {[-0.47, 0.47].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} scale={[0.055, 0.98, 0.78]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={shelf} attach="material" />
        </mesh>
      ))}
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} scale={[0.94, 0.055, 0.78]} geometry={SHARED_BOX} castShadow receiveShadow>
          <primitive object={shelf} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 0]} scale={[1.02, 0.07, 0.84]} geometry={SHARED_BOX} castShadow receiveShadow>
        <primitive object={shelf} attach="material" />
      </mesh>
    </group>
  );
}



export function DetailedLowboard({ materialId }: { materialId: string }) {
  const shell = getPlannerMaterial(materialId);
  const handle = getPlannerMaterial("metal-satin");

  return (
    <group>
      <RoundedBox args={[1, 0.42, 0.86]} radius={0.025} smoothness={3} position={[0, 0.25, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[1.03, 0.06, 0.9]} radius={0.02} smoothness={4} position={[0, 0.48, 0]} castShadow receiveShadow>
        <primitive object={shell} attach="material" />
      </RoundedBox>
      {[-0.33, 0, 0.33].map((x, index) => (
        <group key={x}>
          <RoundedBox args={[0.29, 0.32, 0.028]} radius={0.008} smoothness={2} position={[x, 0.25, 0.444]} castShadow receiveShadow>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          {index < 2 ? (
            <mesh position={[x, 0.25, 0.466]} scale={[0.1, 0.018, 0.012]} geometry={SHARED_BOX} castShadow>
              <primitive object={handle} attach="material" />
            </mesh>
          ) : null}
        </group>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.055, 0]} scale={[0.06, 0.1, 0.06]} geometry={SHARED_CYLINDER} castShadow>
          <primitive object={handle} attach="material" />
        </mesh>
      ))}
    </group>
  );
}



export function DetailedCabinet({ materialId }: { materialId: string }) {
  return (
    <group>
      <RoundedBox args={[0.98, 0.98, 0.96]} radius={0.025} smoothness={2} position={[0, 0.5, 0]} castShadow receiveShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></RoundedBox>
      {[-0.245, 0.245].map((x) => (
        <group key={x} position={[x, 0.5, 0.49]}>
          <mesh scale={[0.475, 0.9, 0.025]} geometry={SHARED_BOX} castShadow><primitive object={getPlannerMaterial(materialId)} attach="material" /></mesh>
          <mesh position={[x < 0 ? 0.17 : -0.17, 0, 0.026]} scale={[0.018, 0.26, 0.018]} geometry={SHARED_CYLINDER} castShadow><primitive object={getPlannerMaterial("metal-satin")} attach="material" /></mesh>
        </group>
      ))}
    </group>
  );
}
