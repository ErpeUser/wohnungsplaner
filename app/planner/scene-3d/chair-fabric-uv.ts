import { Float32BufferAttribute, Vector3, type BufferGeometry } from "three";

/** Copy owned upholstery geometry with metre-based UVs; preserve its surface. */
export function createMetricChairFabricGeometry(source: BufferGeometry) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  const uv = new Float32BufferAttribute(new Float32Array(position.count * 2), 2);
  const origin = new Vector3(), first = new Vector3(), second = new Vector3(), normal = new Vector3();
  for (let index = 0; index < position.count; index += 3) {
    origin.fromBufferAttribute(position, index);
    first.fromBufferAttribute(position, index + 1).sub(origin);
    second.fromBufferAttribute(position, index + 2).sub(origin);
    normal.crossVectors(first, second);
    const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
    for (let offset = 0; offset < 3; offset += 1) {
      const vertex = index + offset;
      // Same metric projection as the existing seat, including closure faces
      // which previously shared identical UVs across the shell's thickness.
      if (ay >= ax && ay >= az) uv.setXY(vertex, position.getX(vertex), 1 - position.getZ(vertex));
      else if (ax >= az) uv.setXY(vertex, position.getZ(vertex), position.getY(vertex));
      else uv.setXY(vertex, position.getX(vertex), position.getY(vertex));
    }
  }
  geometry.setAttribute("uv", uv);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
