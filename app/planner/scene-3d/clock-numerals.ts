import { BufferGeometry, Float32BufferAttribute } from "three";

const HOURS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const STROKES: Record<string, readonly (readonly [number, number, number, number])[]> = {
  I: [[0, -0.5, 0, 0.5], [-0.35, 0.5, 0.35, 0.5], [-0.35, -0.5, 0.35, -0.5]],
  V: [[-0.45, 0.5, 0, -0.5], [0, -0.5, 0.45, 0.5]],
  X: [[-0.45, 0.5, 0.45, -0.5], [-0.45, -0.5, 0.45, 0.5]],
};

/** Authored Roman marks for the portrait dial, without image or font assets.
 * Lettering and spacing are estimated; coordinates stay inside the dial's 0.7 envelope. */
export function createRomanClockNumeralGeometry() {
  const positions: number[] = [];
  const glyphWidth = 0.022;
  const glyphHeight = 0.085;
  const gap = 0.006;
  const halfStroke = 0.002;

  HOURS.forEach((text, hour) => {
    const angle = hour * Math.PI / 6;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const square = Math.max(Math.abs(sin), Math.abs(cos));
    const centerX = 0.265 * sin / square;
    const centerY = 0.265 * cos / square;
    const textWidth = text.length * glyphWidth + (text.length - 1) * gap;
    const vertex = (x: number, y: number) => {
      // Rotate the lettering radially, matching the visible square-dial layout.
      positions.push(centerX + cos * x + sin * y, centerY - sin * x + cos * y, 0);
    };

    [...text].forEach((letter, index) => {
      const offset = -textWidth / 2 + glyphWidth / 2 + index * (glyphWidth + gap);
      for (const [ax, ay, bx, by] of STROKES[letter]) {
        const x0 = offset + ax * glyphWidth;
        const y0 = ay * glyphHeight;
        const x1 = offset + bx * glyphWidth;
        const y1 = by * glyphHeight;
        const length = Math.hypot(x1 - x0, y1 - y0);
        const nx = -(y1 - y0) / length * halfStroke;
        const ny = (x1 - x0) / length * halfStroke;
        const corners = [[x0 + nx, y0 + ny], [x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny]];
        for (const corner of [0, 1, 2, 0, 2, 3]) vertex(...corners[corner] as [number, number]);
      }
    });
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let index = 2; index < normals.length; index += 3) normals[index] = 1;
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
