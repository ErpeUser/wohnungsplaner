import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { ExtrudeGeometry, Shape, TubeGeometry, CatmullRomCurve3, Vector3 } from "three";
import { getPlannerMaterial } from "../materials.ts";
import { FurnitureBeam, SHARED_BOX, SHARED_CYLINDER } from "./primitives.tsx";

/**
 * XUEGW chair photographed on AliExpress (product 1005012445521181).
 * The gallery shows an ivory three-petal upholstered back, integrated
 * wraparound armrests, a butterfly lumbar pillow, a white five-spoke rolling
 * base and a gas lift with a black lever. It advertises 360-degree rotation
 * and 10 cm of height travel. Exact outside dimensions are not supplied:
 * the 62 × 53 × 92 cm planning envelope is still an estimate.
 *
 * Coordinates: normalized width/depth/height, floor y=0, front +Z.
 */
export function XuegwAdjustableDeskChair({ materialId }: { materialId: string }) {
  const fabric = getPlannerMaterial(materialId);
  const seam = getPlannerMaterial("fabric-sand");
  const ivory = getPlannerMaterial("white-matte");
  const chrome = getPlannerMaterial("chrome-polished");
  const black = getPlannerMaterial("metal-dark");
  const spokes = Array.from({ length: 5 }, (_, i) => i * Math.PI * 2 / 5);
  const back = useMemo(() => {
    // A continuous curved, scalloped outline instead of a generic office back.
    const shape = new Shape();
    shape.moveTo(-0.365, 0.602);
    shape.bezierCurveTo(-0.435, 0.675, -0.421, 0.862, -0.325, 0.925);
    shape.bezierCurveTo(-0.266, 0.969, -0.193, 0.968, -0.136, 0.942);
    shape.bezierCurveTo(-0.070, 0.991, 0.070, 0.991, 0.136, 0.942);
    shape.bezierCurveTo(0.193, 0.968, 0.266, 0.969, 0.325, 0.925);
    shape.bezierCurveTo(0.421, 0.862, 0.435, 0.675, 0.365, 0.602);
    shape.quadraticCurveTo(0, 0.545, -0.365, 0.602);
    return new ExtrudeGeometry(shape, {
      depth: 0.058, steps: 1, curveSegments: 22,
      bevelEnabled: true, bevelThickness: 0.013, bevelSize: 0.013, bevelSegments: 4,
    });
  }, []);
  const armCurves = useMemo(() => [-1, 1].map((side) => {
    const curve = new CatmullRomCurve3([
      new Vector3(side * 0.302, 0.863, -0.270),
      new Vector3(side * 0.383, 0.790, -0.193),
      new Vector3(side * 0.403, 0.723, -0.048),
      new Vector3(side * 0.408, 0.681, 0.122),
      new Vector3(side * 0.382, 0.619, 0.242),
    ]);
    return new TubeGeometry(curve, 48, 0.073, 12, false);
  }), []);
  const piping = useMemo(() => new TubeGeometry(
    new CatmullRomCurve3([
      new Vector3(-0.346, 0.565, 0.367),
      new Vector3(-0.21, 0.561, 0.408),
      new Vector3(0, 0.559, 0.417),
      new Vector3(0.21, 0.561, 0.408),
      new Vector3(0.346, 0.565, 0.367),
    ]), 44, 0.0033, 6, false,
  ), []);
  useEffect(() => () => {
    back.dispose(); piping.dispose();
    armCurves.forEach((geometry) => geometry.dispose());
  }, [back, piping, armCurves]);

  return (
    <group name="xuegw-adjustable-desk-chair">
      <mesh name="xuegw-base-hub" position={[0, 0.139, 0]} scale={[0.16, 0.103, 0.16]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
        <primitive object={ivory} attach="material" />
      </mesh>
      {spokes.map((angle, index) => (
        <group key={index} rotation={[0, angle, 0]}>
          {/* Five smooth white tapered rolling feet, as pictured. */}
          <FurnitureBeam start={[0, 0.150, 0]} end={[0.397, 0.084, 0]}
            width={0.077} depth={0.083} round materialId="white-matte" />
          <group name={`xuegw-caster-${index}`} position={[0.404, 0.050, 0]}>
            <mesh position={[0, 0.006, 0]} scale={[0.072, 0.074, 0.066]} geometry={SHARED_BOX} castShadow>
              <primitive object={black} attach="material" />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={side} position={[0, 0.002, side * 0.029]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.078, 0.028, 0.078]} geometry={SHARED_CYLINDER} castShadow receiveShadow>
                  <primitive object={black} attach="material" />
                </mesh>
                {/* Bright white circular cap is conspicuous in the product gallery. */}
                <mesh position={[0, 0, side * 0.019]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.034, 0.009, 8, 22]} />
                  <primitive object={ivory} attach="material" />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      ))}

      <mesh name="xuegw-gas-lift-sleeve" position={[0, 0.264, 0]} scale={[0.102, 0.231, 0.102]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={ivory} attach="material" />
      </mesh>
      <mesh name="xuegw-gas-lift" position={[0, 0.364, 0]} scale={[0.064, 0.245, 0.064]} geometry={SHARED_CYLINDER} castShadow>
        <primitive object={chrome} attach="material" />
      </mesh>
      <mesh name="xuegw-swivel-mount" position={[0, 0.468, -0.005]} scale={[0.297, 0.044, 0.271]} geometry={SHARED_BOX} castShadow>
        <primitive object={black} attach="material" />
      </mesh>
      <FurnitureBeam start={[0.10, 0.452, 0.055]} end={[0.283, 0.429, 0.092]} width={0.019} depth={0.019} materialId="metal-dark" round />
      <RoundedBox name="xuegw-height-lever" args={[0.07, 0.029, 0.045]} radius={0.012} smoothness={5} position={[0.283, 0.429, 0.092]} castShadow>
        <primitive object={black} attach="material" />
      </RoundedBox>

      {/* Curved padded seat: a raised cushion over a thicker, rounded shell. */}
      <RoundedBox name="xuegw-seat-shell" args={[0.834, 0.146, 0.774]} radius={0.065} smoothness={8} position={[0, 0.517, 0.039]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <RoundedBox name="xuegw-seat-cushion" args={[0.777, 0.055, 0.698]} radius={0.026} smoothness={8} position={[0, 0.591, 0.061]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      <mesh name="xuegw-seat-piping" geometry={piping} castShadow>
        <primitive object={seam} attach="material" />
      </mesh>

      {/* Sculpted three-lobed back and softly raised front petal pads. */}
      <mesh name="xuegw-petal-back" geometry={back} position={[0, 0, -0.377]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </mesh>
      <RoundedBox name="xuegw-back-center-petal" args={[0.282, 0.351, 0.068]} radius={0.052} smoothness={7} position={[0, 0.784, -0.278]} castShadow receiveShadow>
        <primitive object={fabric} attach="material" />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <RoundedBox key={side} name={`xuegw-back-side-petal-${side}`} args={[0.253, 0.339, 0.072]} radius={0.059} smoothness={7}
          position={[side * 0.261, 0.782, -0.268]} rotation={[-0.025, 0, side * -0.10]} castShadow receiveShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
      ))}
      {[-1, 1].map((side, index) => (
        <group key={side} name={side < 0 ? "xuegw-wraparound-arm-left" : "xuegw-wraparound-arm-right"}>
          <RoundedBox args={[0.135, 0.24, 0.37]} radius={0.06} smoothness={7}
            position={[side * 0.388, 0.688, -0.010]} rotation={[-0.07, 0, side * 0.04]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </RoundedBox>
          <mesh geometry={armCurves[index]} castShadow receiveShadow>
            <primitive object={fabric} attach="material" />
          </mesh>
        </group>
      ))}

      {/* The unmistakable loose, cinched butterfly / bow-tie lumbar pillow. */}
      <group name="xuegw-butterfly-lumbar" position={[0, 0.703, -0.148]}>
        {[-1, 1].map((side) => (
          <group key={side} rotation={[0, side * -0.08, side * -0.11]}>
            <RoundedBox args={[0.292, 0.214, 0.099]} radius={0.069} smoothness={8}
              position={[side * 0.145, 0.015, 0.005]} castShadow receiveShadow>
              <primitive object={fabric} attach="material" />
            </RoundedBox>
          </group>
        ))}
        <RoundedBox name="xuegw-pillow-cinch" args={[0.064, 0.209, 0.113]} radius={0.021} smoothness={7} position={[0, 0.007, 0.024]} castShadow>
          <primitive object={fabric} attach="material" />
        </RoundedBox>
        {[-0.034, 0.034].map((x) => (
          <mesh key={x} position={[x, 0.007, 0.084]} scale={[0.0024, 0.18, 0.0024]} geometry={SHARED_BOX}>
            <primitive object={seam} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
