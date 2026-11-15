import { SphereGeometry, Vector3 } from "three";

// The retailer views support a softer pad, but do not specify its curvature.
// These dimensionless form parameters are estimates, not measured dimensions.
const ESTIMATED_OUTLINE_EXPONENT = 0.55;
const ESTIMATED_CROWN_EXPONENT = 0.50;

function signedPower(value: number, exponent: number) {
  return Math.abs(value) < 1e-10 ? 0 : Math.sign(value) * Math.abs(value) ** exponent;
}

export function createChairCushionGeometry(width: number, depth: number) {
  // Keep the existing 55 mm internal envelope. Its thickness is not a newly
  // verified product measurement; callers retain the documented seat-top height.
  const halfWidth = width / 2;
  const halfHeight = 0.055 / 2;
  const halfDepth = depth / 2;
  const template = new SphereGeometry(1, 48, 24);
  const position = template.getAttribute("position");
  const normal = template.getAttribute("normal");
  const uv = template.getAttribute("uv");
  const outlinePower = 2 / ESTIMATED_OUTLINE_EXPONENT;
  const crownPower = 2 / ESTIMATED_CROWN_EXPONENT;
  const gradient = new Vector3();

  for (let index = 0; index < position.count; index += 1) {
    const longitude = uv.getX(index) * Math.PI * 2;
    const latitude = (1 - uv.getY(index)) * Math.PI;
    const horizontal = signedPower(Math.sin(latitude), ESTIMATED_CROWN_EXPONENT);
    const x = -horizontal * signedPower(Math.cos(longitude), ESTIMATED_OUTLINE_EXPONENT);
    const y = signedPower(Math.cos(latitude), ESTIMATED_CROWN_EXPONENT);
    const z = horizontal * signedPower(Math.sin(longitude), ESTIMATED_OUTLINE_EXPONENT);
    position.setXYZ(index, halfWidth * x, halfHeight * y, halfDepth * z);

    // Analytic normals remain continuous at the duplicated sphere seam/poles
    // and after splitting vertices for the metric texture projection below.
    const outline = Math.abs(x) ** outlinePower + Math.abs(z) ** outlinePower;
    const horizontalGradient = outline ** (crownPower / outlinePower - 1);
    gradient.set(
      signedPower(x, outlinePower - 1) * horizontalGradient / halfWidth,
      signedPower(y, crownPower - 1) / halfHeight,
      signedPower(z, outlinePower - 1) * horizontalGradient / halfDepth,
    ).normalize();
    normal.setXYZ(index, gradient.x, gradient.y, gradient.z);
  }

  const geometry = template.toNonIndexed();
  template.dispose();
  const points = geometry.getAttribute("position");
  const textureCoordinates = geometry.getAttribute("uv");
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const faceNormal = new Vector3();
  for (let index = 0; index < points.count; index += 3) {
    a.fromBufferAttribute(points, index);
    b.fromBufferAttribute(points, index + 1).sub(a);
    c.fromBufferAttribute(points, index + 2).sub(a);
    faceNormal.crossVectors(b, c);
    const ax = Math.abs(faceNormal.x);
    const ay = Math.abs(faceNormal.y);
    const az = Math.abs(faceNormal.z);
    for (let offset = 0; offset < 3; offset += 1) {
      const vertex = index + offset;
      // One UV unit remains one metre, as on the previous pad's top. Ordinary
      // sphere UVs would stretch the existing fabric and pinch at both poles.
      if (ay >= ax && ay >= az) textureCoordinates.setXY(vertex, points.getX(vertex), 1 - points.getZ(vertex));
      else if (ax >= az) textureCoordinates.setXY(vertex, points.getZ(vertex), points.getY(vertex));
      else textureCoordinates.setXY(vertex, points.getX(vertex), points.getY(vertex));
    }
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
