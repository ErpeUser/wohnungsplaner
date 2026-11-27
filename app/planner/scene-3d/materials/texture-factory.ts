import { TILE_ATLAS_METRES } from '../../domain/tile-dimensions.ts';
import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, SRGBColorSpace, Texture, TextureLoader, UnsignedByteType } from "three";
import { plannerAssetUrl } from "../asset-url.ts";
import { RECIPES } from "./recipes.ts";
import { sampleWaffleReference } from "../waffle-photo-reference.ts";


const textureCache = new Map<string, Texture>();


export const PLANNER_TEXTURE_READY_EVENT = "planner:texture-ready";



export function asBumpMap(texture: Texture | null) {
  if (!texture) return null;
  // Color maps stay in sRGB; normal/height sampling must remain linear.  A
  // clone keeps both sampling contracts without mutating the shared color map.
  const bump = texture.clone();
  bump.colorSpace = NoColorSpace;
  bump.needsUpdate = true;
  return bump;
}



/** Four-cell repeat sampled directly from the supplied product photo. */
export function createBathroomWaffleTexture() {
  return createProductDataTexture("photo:aliexpress-waffle-1005013137520536", 256, (x,y) => sampleWaffleReference(x/256,y/256));
}



/** Very fine pale beige fabric threads; the volume is in the curtain folds,
 * not in a printed motif or artificial tassels. */
export function createShowerCurtainTextileTexture() {
  return createProductDataTexture("generated:temu-curtain-fabric-beige", 256, (x, y) => {
    const warp = Math.sin(x * 2.2) * 2.5;
    const weft = Math.cos(y * 2.05) * 2.1;
    const broad = Math.cos(x * 0.12) * 1.3;
    const grain = ((x * 13 + y * 17 + x * y) % 7) - 3;
    const value = warp + weft + broad + grain * 0.25;
    return [228 + value, 216 + value * 0.97, 198 + value * 0.89];
  });
}



function createProductDataTexture(key: string, size: number, pixel: (x: number, y: number) => [number, number, number]) {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixel(x, y);
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, Math.round(r)));
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      data[offset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = key;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.2, 2.2);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadProductWeaveTexture(materialId: string) {
  const colour = new Color(RECIPES[materialId].color).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const base = [colour.r * 255, colour.g * 255, colour.b * 255];
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => productWeavePixel(base, x, y));
}



function productWeavePixel(base: number[], x: number, y: number): [number, number, number] {
  const diagonal = Math.sin((x + y * 0.7) * 0.58) * 5.6;
  const cross = Math.sin((x - y * 0.45) * 0.74) * 3.4;
  const fiber = ((x * 17 + y * 29 + x * y * 3) % 11) - 5;
  return [base[0] + diagonal + fiber, base[1] + diagonal * 0.92 + cross * 0.28 + fiber, base[2] + diagonal * 0.72 + cross * 0.42 + fiber];
}



export function loadChairChenilleTexture(materialId: string) {
  const key = `generated:chair-chenille-${materialId}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const colour = new Color(RECIPES[materialId].color).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const base = [colour.r * 255, colour.g * 255, colour.b * 255];
  const previousSums = [0, 0, 0];
  // Preserve the old finish's exact channel means, including byte rounding,
  // without allocating or retaining an unused legacy texture.
  for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
    productWeavePixel(base, x, y).forEach((value, channel) => {
      previousSums[channel] += Math.max(0, Math.min(255, Math.round(value)));
    });
  }
  const mean = previousSums.map((sum) => sum / (128 * 128));
  // Estimated appearance detail only: this sampling resolution and irregular
  // field do not claim a measured chenille thread size or direction.
  const size = 256;
  const noise = new Float32Array(size * size);
  for (let index = 0; index < noise.length; index += 1) {
    let value = index + 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    noise[index] = (((value ^ (value >>> 15)) >>> 0) / 0xffffffff - 0.5) * 10;
  }
  const detail = new Float32Array(noise.length);
  let detailSum = 0;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const index = y * size + x;
    // Cyclic neighbours avoid a special boundary at the repeating tile edges.
    detail[index] = noise[index] * 0.6 + (
      noise[y * size + ((x + 1) % size)] + noise[y * size + ((x + size - 1) % size)]
      + noise[((y + 1) % size) * size + x] + noise[((y + size - 1) % size) * size + x]
    ) * 0.1;
    detailSum += detail[index];
  }
  const detailMean = detailSum / detail.length;
  const texture = createProductDataTexture(key, size, (x, y) => {
    const value = detail[y * size + x] - detailMean;
    return [mean[0] + value, mean[1] + value, mean[2] + value];
  });
  const pixels = (texture.image as { data: Uint8Array }).data;
  for (let channel = 0; channel < 3; channel += 1) {
    let sum = 0;
    for (let index = channel; index < pixels.length; index += 4) sum += pixels[index];
    let remainder = previousSums[channel] * 4 - sum;
    // Spread the few rounding corrections over the whole power-of-two tile;
    // an odd stride visits every pixel without creating a corrected-row band.
    for (let index = 0; remainder !== 0; index = (index + 40503) % (size * size)) {
      const offset = index * 4 + channel;
      const step = Math.sign(remainder);
      if (pixels[offset] + step >= 0 && pixels[offset] + step <= 255) {
        pixels[offset] += step;
        remainder -= step;
      }
    }
  }
  texture.needsUpdate = true;
  return texture;
}



export function loadProductGrainTexture(materialId: string, base: [number, number, number], direction: number, scale: number) {
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const grain = Math.sin((x * direction + y * scale) * 2.2) * 4.8 + Math.sin((x * 0.14 + y * 0.024) * 3.1) * 2.1;
    return [base[0] + grain, base[1] + grain * 0.95, base[2] + grain * 0.82];
  });
}




/** Product-specific procedural veneer and acacia grain reconstructed from the
 * exact Möbelix Simple / XXXLutz BOXXX / XXXLutz Livetastic product photos.
 * Keeps supplier imagery out of public assets. Uses distinct face, long-edge
 * and cross-grain colours, never a shared generic oak tone.
 */
export function loadWcWallboardProductTexture(materialId: string) {
  const palettes: Record<string, [number, number, number]> = {
    "wc-board-simple-face": [170, 149, 111],
    "wc-board-simple-edge": [187, 160, 121],
    "wc-board-boxxx-face": [216, 192, 164],
    "wc-board-boxxx-edge": [203, 178, 148],
    "wc-board-livetastic-face": [204, 133, 78],
    "wc-board-livetastic-edge": [172, 90, 50],
    "wc-board-livetastic-end": [146, 85, 53],
  };
  const base = palettes[materialId];
  if (!base) throw new Error("Unknown WC board finish: " + materialId);
  const acacia = materialId.includes("livetastic");
  const crossGrain = materialId.endsWith("-end");
  return createProductDataTexture("generated:wc-wallboard-product:" + materialId, 256, (x, y) => {
    // The wood fibres run along the long side. Organic acacia waves and dark
    // heartwood patches are stronger than the fine, repeatable MDF prints.
    const wave = Math.sin(y * (acacia ? 0.089 : 0.124) + Math.sin(x * 0.025) * (acacia ? 2.6 : 1.3));
    const micro = Math.sin(y * (acacia ? 0.51 : 0.38) + Math.sin(x * 0.12) * 1.4);
    const knotDistance = Math.hypot(x - 155, (y - 92) * 0.92);
    const knot = Math.sin(knotDistance * (acacia ? 0.135 : 0.105) + y * 0.022)
      * Math.exp(-knotDistance / 63);
    const fine = Math.sin(y * 0.87 + x * 0.032);
    const grain = wave * (acacia ? 15 : 6.3) + micro * (acacia ? 5 : 2.3)
      + knot * (acacia ? 13 : 5) + fine * (acacia ? 1.2 : 1.7);
    const endRings = crossGrain ? Math.sin(Math.hypot((x - 127) * 0.85, y - 125) * 0.14) * 10 : 0;
    return [base[0] + grain + endRings, base[1] + grain * 0.78 + endRings * 0.82,
      base[2] + grain * 0.54 + endRings * 0.7];
  });
}

export function loadWcShelfOakTexture(edge: boolean) {
  return createProductDataTexture(`generated:wc-shelf-oak-${edge ? "edge" : "face"}`, 256, (x, y) => {
    // The new reference has warmer, slightly darker wood with fine latewood grain.
    const wave = Math.sin(x * 0.09 + Math.sin(y * 0.17) * 2.1) * 8;
    const knots = Math.sin(x * 0.023 + y * 0.068) * 4.8;
    const pores = ((x * 41 + y * 17 + x * y) % 23 - 11) * 0.45;
    const base = edge ? [147, 102, 67] : [190, 151, 107];
    return [base[0] + wave + knots + pores, base[1] + wave * 0.84 + knots + pores, base[2] + wave * 0.68 + knots + pores];
  });
}



export function loadProductWoodTexture(materialId: string) {
  const edge = materialId === "oak-bozan-edge";
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const grain = Math.sin(x * 0.18 + Math.sin(y * 0.08) * 2.5) * 8 + Math.sin(x * 0.047 + y * 0.12) * 3;
    const base = edge ? [141, 96, 60] : [183, 131, 82];
    return [base[0] + grain, base[1] + grain * 0.76, base[2] + grain * 0.55];
  });
}



function comparisonWoodBase(materialId: string): [number, number, number] {
  return materialId === "walnut"
    ? [111, 73, 49]
    : materialId === "oak-artisan-edge"
      ? [142, 94, 55]
      : materialId === "oak-artisan"
        ? [211, 170, 108]
        : [201, 157, 101];
}



export function loadComparisonWoodTexture(materialId: string) {
  const base = comparisonWoodBase(materialId);
  return createProductDataTexture(`generated:comparison-wood-${materialId}`, 192, (x, y) => {
    const broad = Math.sin(x * 0.052 + Math.sin(y * 0.018) * 2.4) * (materialId === "walnut" ? 11 : 9);
    const pore = Math.sin(x * 0.42 + y * 0.03) * 2.8 + Math.sin(x * 0.11 + y * 0.14) * 2.2;
    const knot = Math.sin(x * 0.018 + y * 0.07) * 4.4;
    return [base[0] + broad + pore + knot, base[1] + broad * 0.72 + pore * 0.68 + knot * 0.82, base[2] + broad * 0.48 + pore * 0.42 + knot * 0.62];
  });
}



export function loadComparisonTabletopTexture(materialId: string) {
  const base = comparisonWoodBase(materialId);
  const size = 512;
  return createProductDataTexture(`generated:comparison-tabletop-${materialId}`, size, (x, y) => {
    const u = x / size * Math.PI * 2;
    const v = y / size * Math.PI * 2;
    // Integer cycles and periodic bending close at both tile edges. These are
    // subtle generic grain estimates, not measured veneer or pore dimensions.
    const bend = Math.sin(v) * 0.25 + Math.sin(v * 2) * 0.1;
    const grain = Math.sin(u * 29 + bend) * (materialId === "walnut" ? 4.5 : 4);
    const pore = Math.sin(u * 71 + bend * 1.4) * 1.4 + Math.sin(u * 97 + bend * 0.7) * 0.8;
    const tone = Math.sin(u * 47 + bend * 0.6) * 1.5;
    return [base[0] + grain + pore + tone, base[1] + grain * 0.72 + pore * 0.68 + tone * 0.82, base[2] + grain * 0.48 + pore * 0.42 + tone * 0.62];
  });
}



export function loadProductPebbleTexture() {
  return createProductDataTexture("generated:leather-ivory-pebble", 96, (x, y) => {
    const pebble = Math.sin(x * 0.9 + Math.sin(y * 0.43) * 2) * 2.6 + Math.sin(y * 1.2 + x * 0.22) * 1.8;
    return [229 + pebble, 222 + pebble * 0.92, 212 + pebble * 0.72];
  });
}



export function loadProductLacquerTexture() {
  return createProductDataTexture("generated:white-lacquer", 96, (x, y) => {
    const reflection = Math.sin((x + y) * 0.08) * 2.2 + Math.sin(y * 0.32) * 1.1;
    return [244 + reflection, 242 + reflection, 236 + reflection * 0.78];
  });
}



export function loadProductPileTexture(materialId: string) {
  const living = materialId === "rug-living-relief";
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const pile = Math.sin((x * 0.9 + y * 0.35) * (living ? 0.48 : 0.78)) * (living ? 4.5 : 8);
    const stripe = living ? Math.sin(y * 0.12) * 2.8 : 0;
    const base = living ? [222, 213, 199] : [238, 232, 220];
    return [base[0] + pile + stripe, base[1] + pile * 0.96 + stripe, base[2] + pile * 0.88 + stripe];
  });
}



export function loadProductLeafTexture() {
  return createProductDataTexture("generated:leaf-olive-soft", 96, (x, y) => {
    const vein = Math.sin(x * 0.28 + y * 0.05) * 7 + Math.sin(y * 0.16) * 3;
    return [102 + vein, 115 + vein * 0.9, 88 + vein * 0.6];
  });
}



export function loadProductCeramicTexture() {
  return createProductDataTexture("generated:ceramic-pot-glazed", 64, (x, y) => {
    const glaze = Math.sin(x * 0.14 + y * 0.04) * 2.8;
    return [215 + glaze, 200 + glaze * 0.88, 180 + glaze * 0.6];
  });
}



export function loadKitchenWorktopTexture() {
  const key = "generated:kitchen-worktop-black";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin(x * 0.09 + y * 0.012) * 4 + Math.sin((x + y) * 0.17) * 1.8;
      const grain = ((x * 29 + y * 47 + x * y * 5) % 13) - 6;
      const value = Math.max(0, Math.min(255, 26 + broad + grain));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = Math.max(0, Math.min(255, value + 3));
      data[offset + 2] = Math.max(0, Math.min(255, value + 2));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-kitchen-worktop-black";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.8, 2.8);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadKitchenWalnutBacksplashTexture() {
  const key = "generated:kitchen-walnut-backsplash";
  const cached = textureCache.get(key);
  if (cached) return cached;

  const width = 256;
  const height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Light natural oak veneer from the kitchen photo: horizontal grain,
      // soft plank joints and a warm honey-beige value (not dark walnut).
      const plank = Math.floor(y / 64);
      const withinPlank = y % 64;
      const grain = Math.sin(x * 0.072 + plank * 0.9) * 7.5
        + Math.sin(x * 0.021 + y * 0.012) * 4.2
        + Math.sin((x + y * 0.2) * 0.18) * 2.2;
      const pore = ((x * 17 + y * 31 + x * y * 3) % 17) - 8;
      const seam = withinPlank === 0 || withinPlank === 63;
      const shade = seam ? -18 : grain * 0.72 + pore * 0.26;
      const offset = (y * width + x) * 4;
      data[offset] = Math.max(0, Math.min(255, 211 + shade));
      data[offset + 1] = Math.max(0, Math.min(255, 176 + shade * 0.86));
      data[offset + 2] = Math.max(0, Math.min(255, 126 + shade * 0.7));
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-kitchen-walnut-backsplash";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.15, 1);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadVintageBeigeFabricWallpaperTexture() {
  const key = "generated:wallpaper-vintage-beige-fabric";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 192;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const horizontalThread = Math.sin(y * Math.PI * 0.92) * 3.2;
      const verticalThread = Math.sin(x * Math.PI * 0.84 + y * 0.035) * 2.7;
      const broadFiber = Math.sin((x + y * 0.42) * 0.17) * 1.8;
      const irregularFiber = ((x * 23 + y * 41 + x * y * 5) % 11) - 5;
      const weave = horizontalThread + verticalThread + broadFiber + irregularFiber * 0.34;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, 183 + weave));
      data[offset + 1] = Math.max(0, Math.min(255, 168 + weave * 0.94));
      data[offset + 2] = Math.max(0, Math.min(255, 149 + weave * 0.82));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-wallpaper-vintage-beige-fabric";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(4.8, 3.65);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



/**
 * Warm milk-coffee removable wallpaper from the supplied Temu reference.
 * The real roll is 600 × 40 cm; the material deliberately keeps a very fine
 * cross-weave so it reads as a continuous roll at room scale instead of a
 * repeated square image.
 */
export function loadMacaronMilkCoffeeWallpaperTexture() {
  const key = "generated:wallpaper-milk-coffee-macaron";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 192;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const warp = Math.sin(y * Math.PI * 0.72 + x * 0.03) * 2.4;
      const weft = Math.sin(x * Math.PI * 0.66 + y * 0.025) * 2.1;
      const paper = Math.sin((x + y) * 0.17) * 1.4;
      const noise = ((x * 19 + y * 37 + x * y * 3) % 9) - 4;
      const value = warp + weft + paper + noise * 0.32;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, 214 + value));
      data[offset + 1] = Math.max(0, Math.min(255, 190 + value * 0.94));
      data[offset + 2] = Math.max(0, Math.min(255, 164 + value * 0.8));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-wallpaper-milk-coffee-macaron";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3.8, 2.9);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



/**
 * Sand-beige textile wallpaper from the supplied reference (10 m × 44.96 cm).
 * The broad fibers are intentionally subtle so the seam spacing remains
 * believable when a whole wall is covered.
 */
export function loadVintageBrownFabricWallpaperTexture() {
  const key = "generated:wallpaper-vintage-brown-fabric";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 192;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const horizontal = Math.sin(y * Math.PI * 0.78) * 4.4;
      const vertical = Math.sin(x * Math.PI * 0.58 + y * 0.04) * 3.7;
      const broad = Math.sin((x * 0.9 + y * 0.35) * 0.12) * 2.4;
      const irregular = ((x * 29 + y * 17 + x * y * 5) % 13) - 6;
      const weave = horizontal + vertical + broad + irregular * 0.36;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, 216 + weave));
      data[offset + 1] = Math.max(0, Math.min(255, 199 + weave * 0.92));
      data[offset + 2] = Math.max(0, Math.min(255, 174 + weave * 0.78));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-wallpaper-vintage-brown-fabric";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(4.8, 3.4);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadCashmereVinylTexture() {
  const key = "generated:vinyl-cashmere-cream";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const verticalGrain = Math.sin(x * 0.72) * 3 + Math.sin(x * 0.19) * 2;
      const fineNoise = ((x * 29 + y * 17 + x * y * 3) % 7) - 3;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, Math.min(255, 217 + verticalGrain + fineNoise));
      data[offset + 1] = Math.max(0, Math.min(255, 205 + verticalGrain + fineNoise));
      data[offset + 2] = Math.max(0, Math.min(255, 184 + verticalGrain + fineNoise));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-vinyl-cashmere-cream";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.4, 2.6);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadConcreteTexture() {
  const key = "generated:outdoor-concrete";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = ((x * 37 + y * 61 + x * y * 7) % 19) - 9;
      const speck = (x * 13 + y * 29) % 73 === 0 ? -18 : 0;
      const base = 168 + grain + speck;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, base + 2);
      data[offset + 1] = Math.max(0, base + 1);
      data[offset + 2] = Math.max(0, base - 3);
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-outdoor-concrete";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(3.6, 3.6);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadEpoxyFloorTexture() {
  const key = "generated:epoxy-grey";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Fine aggregate and broad, low-contrast variation keep the resin
      // surface from reading as a flat RGB swatch while preserving the grey
      // epoxy appearance documented in the apartment plan.
      const micro = ((x * 19 + y * 37 + x * y * 3) % 13) - 6;
      const broad = Math.sin(x / 17) * 2.4 + Math.cos(y / 23) * 1.8;
      const value = Math.max(0, Math.min(255, 154 + micro + broad));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = Math.max(0, Math.min(255, value + 2));
      data[offset + 2] = Math.max(0, Math.min(255, value + 1));
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-epoxy-grey";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.6, 2.6);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadBalconyFloorTexture() {
  const key = "generated:balcony-floor-beige";
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = ((x * 31 + y * 47 + x * y * 3) % 17) - 8;
      const broadWear = Math.sin(x / 13) * 4 + Math.cos(y / 18) * 5;
      const stain = (x * 11 + y * 23) % 137 < 3 ? -15 : 0;
      const offset = (y * size + x) * 4;
      data[offset] = Math.max(0, 196 + grain + broadWear + stain);
      data[offset + 1] = Math.max(0, 181 + grain + broadWear + stain);
      data[offset + 2] = Math.max(0, 143 + grain + broadWear + stain);
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = "planner-texture-balcony-floor-beige";
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.2, 4.2);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}



export function loadPlannerTexture(path: string) {
  const url = plannerAssetUrl(path);
  const cached = textureCache.get(url);
  if (cached) return cached;
  const texture = new TextureLoader().load(url, (loadedTexture) => {
    loadedTexture.needsUpdate = true;
    window.dispatchEvent(new CustomEvent(PLANNER_TEXTURE_READY_EVENT, { detail: path }));
  });
  texture.name = `planner-texture-${path.split("/").at(-1)}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  if (path.endsWith("/temu-white-gold-601100207687761.webp") || path.endsWith("/temu-celadon-onyx-601099584128261.webp")) {
    texture.anisotropy = 8;
  } else if (path.includes("temu-easy-line-colorblock-rug") || path.includes("hall-rug-") || path.includes("temu-bath-rug-") || path.includes("temu-vintage-rug-")) {
    texture.repeat.set(1, 1);
  } else {
    texture.repeat.set(path.includes("oak-blonde") ? 3.6 : 2.4, path.includes("oak-blonde") ? 1.45 : 2.4);
  }
  textureCache.set(url, texture);
  return texture;
}



export function loadPlannerTileTexture(
  materialId: string,
  recipe: { base: [number, number, number]; grout: [number, number, number]; staggered?: boolean },
) {
  const key = `generated:${materialId}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / 32);
    for (let x = 0; x < size; x += 1) {
      const staggeredX = (x + (recipe.staggered && row % 2 ? 16 : 0)) % 32;
      const grout = y % 32 < 2 || staggeredX < 2;
      const color = grout ? recipe.grout : recipe.base;
      const offset = (y * size + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.name = `planner-texture-${materialId}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / TILE_ATLAS_METRES, 1 / TILE_ATLAS_METRES);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
