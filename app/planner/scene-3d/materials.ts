import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UnsignedByteType,
} from "three";

type MaterialRecipe = {
  color: string;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  opacity?: number;
  thickness?: number;
  ior?: number;
  envMapIntensity?: number;
};

const RECIPES: Record<string, MaterialRecipe> = {
  "parquet-oak": { color: "#f5f1ea", roughness: 0.72 },
  "parquet-oak-narrow": { color: "#f5f1ea", roughness: 0.7 },
  "floor-oak": { color: "#f5f1ea", roughness: 0.72 },
  "floor-oak-herringbone": { color: "#f5f1ea", roughness: 0.7 },
  "porcelain-light": { color: "#f1f0ec", roughness: 0.58 },
  "porcelain-light-taupe": { color: "#efede8", roughness: 0.6 },
  "floor-tile-light": { color: "#f1f0ec", roughness: 0.58 },
  "epoxy-grey": { color: "#9b9f9c", roughness: 0.58 },
  "outdoor-concrete": { color: "#ffffff", roughness: 0.92 },
  "balcony-floor-beige": { color: "#e2d3ad", roughness: 0.9 },
  "balcony-facade-grey": { color: "#888985", roughness: 0.94 },
  "balcony-parapet-grey": { color: "#777b79", roughness: 0.92 },
  "balcony-coping-grey": { color: "#5f6463", roughness: 0.82 },
  "balcony-rail-rust": { color: "#9a4d3d", roughness: 0.55, metalness: 0.38 },
  "balcony-ceiling": { color: "#c9c9c4", roughness: 0.9 },
  "wall-warm-white": { color: "#f4f2ed", roughness: 0.88 },
  "paint-warm-white": { color: "#f4f2ed", roughness: 0.9 },
  "paint-warm-taupe": { color: "#B4A495", roughness: 0.88 },
  "wallpaper-vintage-beige-fabric": { color: "#fffaf5", roughness: 0.98 },
  // The two supplied Temu wallpaper variants remain selectable surface
  // materials.  Their finish is matte, lightly fibrous and removable rather
  // than glossy paint or a flat RGB swatch.
  "wallpaper-milk-coffee-macaron": { color: "#d6bea6", roughness: 0.97 },
  "wallpaper-vintage-brown-fabric": { color: "#a8876b", roughness: 0.98 },
  "paint-white": { color: "#f7f6f2", roughness: 0.9 },
  "tile-white-rect": { color: "#f0efeb", roughness: 0.58 },
  "tile-white-square": { color: "#efeeea", roughness: 0.6 },
  "tile-kitchen-grey-square": { color: "#d9d8d3", roughness: 0.62 },
  "tile-grout": { color: "#9d9b94", roughness: 0.82 },
  "kitchen-white-gloss": { color: "#f7f5f0", roughness: 0.2, clearcoat: 0.66, clearcoatRoughness: 0.2 },
  "cashmere-matte": { color: "#cfc3b2", roughness: 0.52, clearcoat: 0.1, clearcoatRoughness: 0.7 },
  "scout-oak": { color: "#b9a68c", roughness: 0.66 },
  "oak-backsplash": { color: "#f2eee8", roughness: 0.6, clearcoat: 0.04, clearcoatRoughness: 0.74 },
  "walnut-grain-dark": { color: "#493a31", roughness: 0.78 },
  "kitchen-worktop-black": { color: "#191d1c", roughness: 0.3, clearcoat: 0.28, clearcoatRoughness: 0.34 },
  "kitchen-plinth-grey": { color: "#a7a8a4", roughness: 0.46, metalness: 0.18 },
  "slat-oak-dark": { color: "#c08a5b", roughness: 0.7 },
  "moss-green": { color: "#405539", roughness: 0.98 },
  "metal-satin": { color: "#b6b7b3", roughness: 0.34, metalness: 0.55 },
  "chrome-polished": { color: "#d9dcdb", roughness: 0.16, metalness: 0.92, clearcoat: 0.72, clearcoatRoughness: 0.12 },
  "screen-black": { color: "#090c0d", roughness: 0.16, clearcoat: 0.5, clearcoatRoughness: 0.18 },
  "tv-display": { color: "#142126", roughness: 0.08, clearcoat: 0.82, clearcoatRoughness: 0.1 },
  "cabinet-black": { color: "#171919", roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.28 },
  "door-oak": { color: "#a66f43", roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.75 },
  "oak-natural": { color: "#b98a5e", roughness: 0.64 },
  "wc-holder-solid-oak": { color: "#e6c497", roughness: 0.72 },
  "wc-holder-oak-edge": { color: "#bb8857", roughness: 0.8 },
  "wc-holder-black-iron": { color: "#20211f", roughness: 0.46, metalness: 0.78 },
  "wc-paper-white": { color: "#f5f2e9", roughness: 0.98 },
  "wc-paper-core": { color: "#ad9981", roughness: 0.95 },
  "oak-artisan": { color: "#b78352", roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.68 },
  "oak-artisan-edge": { color: "#8d603c", roughness: 0.66 },
  "oak-bozan-directional": { color: "#b78352", roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.7 },
  "oak-bozan-edge": { color: "#8d603c", roughness: 0.68 },
  "oak-light": { color: "#c99d68", roughness: 0.7, clearcoat: 0.04, clearcoatRoughness: 0.78 },
  walnut: { color: "#704c35", roughness: 0.62 },
  "white-matte": { color: "#f4f2ec", roughness: 0.72 },
  "vinyl-cashmere-cream": { color: "#d9cdb8", roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.72 },
  "wardrobe-frame-silver": { color: "#d5d5d1", roughness: 0.54, metalness: 0.06 },
  "fabric-sand": { color: "#c4aa8e", roughness: 0.96 },
  "fabric-sage": { color: "#82938a", roughness: 0.98 },
  "fabric-anthracite": { color: "#4c5252", roughness: 0.94 },
  "fabric-white": { color: "#f7f4ef", roughness: 0.96 },
  "fabric-light-grey": { color: "#767a79", roughness: 0.97 },
  "fabric-blush": { color: "#e1a9b2", roughness: 0.94 },
  "leather-ivory": { color: "#e5ded4", roughness: 0.48, clearcoat: 0.18, clearcoatRoughness: 0.42 },
  "leather-ivory-pebble": { color: "#e5ded4", roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4 },
  "white-lacquer": { color: "#f4f2ec", roughness: 0.34, clearcoat: 0.48, clearcoatRoughness: 0.24 },
  "fabric-bliss-beige": { color: "#ddd1bd", roughness: 0.97 },
  "fabric-bliss-weave": { color: "#ddd1bd", roughness: 0.98 },
  "fabric-ecru": { color: "#eee6d9", roughness: 0.98 },
  "fabric-ecru-sheer": { color: "#f2ede4", roughness: 0.76, opacity: 0.64, transmission: 0.14, thickness: 0.006 },
  "shower-curtain-linen-beige": { color: "#d8cdbb", roughness: 0.96, clearcoat: 0.02, clearcoatRoughness: 0.9 },
  "temu-shower-curtain-beige": { color: "#f2eade", roughness: 0.98 },
  "shower-curtain-hem-beige": { color: "#e4dacb", roughness: 0.99 },
  "bath-hook-oak-natural": { color: "#d6b486", roughness: 0.83 },
  "bath-hook-black": { color: "#191918", roughness: 0.56, metalness: 0.14 },
  "fabric-taupe": { color: "#aa9684", roughness: 0.98 },
  // Warm beige fabric; the previous near-white value made the sofa read as
  // white under the 3D tone mapping.
  "fabric-ali-ivory": { color: "#d8c8b6", roughness: 0.99 },
  "fabric-ali-seam": { color: "#cdc4b7", roughness: 0.99 },
  "fabric-ali-shade": { color: "#dcd2c4", roughness: 0.99 },
  "fabric-chicago-beige": { color: "#d8d5cc", roughness: 0.98 },
  "fabric-chicago-chenille": { color: "#d8d5cc", roughness: 0.99 },
  "fabric-kaleo-beige": { color: "#ddd2c2", roughness: 0.98 },
  "fabric-kaleo-chenille": { color: "#ddd2c2", roughness: 0.99 },
  "fabric-temu-sand": { color: "#d5c7b6", roughness: 0.98 },
  "leather-temu-cream": { color: "#e9dfd2", roughness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.42 },
  "velvet-temu-beige": { color: "#cdbba9", roughness: 0.98 },
  "fabric-amber-beige": { color: "#d6c4ad", roughness: 0.98 },
  "tejo-cashmere": { color: "#cbc2b6", roughness: 0.58 },
  "tejo-cashmere-grain": { color: "#cbc2b6", roughness: 0.62 },
  "tejo-panel-greige": { color: "#b8afa5", roughness: 0.93 },
  "rug-woven": { color: "#d7c4a6", roughness: 0.98 },
  "rug-gala-beige-taupe": { color: "#e8e0d3", roughness: 1 },
  "rug-gala-cream": { color: "#eee9df", roughness: 1 },
  "rug-gala-taupe": { color: "#aa9b8e", roughness: 1 },
  "rug-temu-shaggy-white": { color: "#f1ede4", roughness: 1 },
  "bath-mat-shaggy-cream": { color: "#f1e8da", roughness: 1 },
  "temu-bath-rug-woven": { color: "#e8d4b6", roughness: 1 },
  "bath-mat-fringe-sand": { color: "#c9ad87", roughness: 1 },
  "rug-temu-shaggy-shadow": { color: "#d8d0c2", roughness: 1 },
  "rug-temu-easy-line-colorblock": { color: "#ded5bd", roughness: 1 },
  "rug-hall-overlap-taupe": { color: "#b9aa98", roughness: 1 },
  "rug-hall-soft-abstract": { color: "#d8d0bd", roughness: 1 },
  "rug-hall-beige-patchwork": { color: "#cfc2aa", roughness: 1 },
  "rug-hall-olive-lineart": { color: "#d8d2b8", roughness: 1 },
  "rug-temu-rabbit-ivory": { color: "#eee7da", roughness: 1 },
  "rug-rabbit-pile": { color: "#eee7da", roughness: 1 },
  "rug-temu-rabbit-highlight": { color: "#fffaf0", roughness: 1 },
  "rug-temu-rabbit-shadow": { color: "#d4c9b8", roughness: 1 },
  // Tint the SVG pattern so the vintage rug remains visibly beige/taupe.
  "rug-temu-vintage-cream": { color: "#d8c7ae", roughness: 1 },
  "rug-living-ivory-greige": { color: "#ded5c7", roughness: 1 },
  "rug-living-relief": { color: "#eee8de", roughness: 1 },
  "metal-dark": { color: "#343b3b", roughness: 0.36, metalness: 0.78 },
  "metal-black": { color: "#111515", roughness: 0.24, metalness: 0.72, clearcoat: 0.35, clearcoatRoughness: 0.2 },
  "metal-gold": { color: "#c99a45", roughness: 0.24, metalness: 0.88, envMapIntensity: 1.15 },
  "glass-clear": { color: "#dfeff3", roughness: 0.08, transmission: 0.9, opacity: 0.34, thickness: 0.012, ior: 1.48, envMapIntensity: 1.2 },
  "glass-frosted": { color: "#e3eceb", roughness: 0.42, transmission: 0.48, opacity: 0.66, thickness: 0.02, ior: 1.42, envMapIntensity: 0.82 },
  "mirror-glass": { color: "#dbe5e6", roughness: 0.08, metalness: 0.16, clearcoat: 0.92, clearcoatRoughness: 0.05, envMapIntensity: 1.25 },
  "drawer-charcoal": { color: "#242728", roughness: 0.34, clearcoat: 0.24, clearcoatRoughness: 0.3 },
  "ceramic-white": { color: "#f5f4ef", roughness: 0.18, clearcoat: 0.55, clearcoatRoughness: 0.14 },
  "shade-linen": { color: "#eadcc8", roughness: 0.92 },
  terracotta: { color: "#9c5d3f", roughness: 0.86 },
  "leaf-green": { color: "#557b5d", roughness: 0.9 },
  "leaf-olive": { color: "#667358", roughness: 0.94 },
  "leaf-olive-soft": { color: "#667358", roughness: 0.96 },
  "ceramic-beige": { color: "#d7c8b4", roughness: 0.64, clearcoat: 0.08, clearcoatRoughness: 0.72 },
  "ceramic-pot-glazed": { color: "#d7c8b4", roughness: 0.58, clearcoat: 0.16, clearcoatRoughness: 0.52 },
  "paper-cream": { color: "#ece3d3", roughness: 0.96 },
  "paper-taupe": { color: "#b59c82", roughness: 0.96 },
  "led-warm": { color: "#ffd9a0", roughness: 0.3, clearcoat: 0.18, clearcoatRoughness: 0.35 },
  "object-neutral": { color: "#9d8a78", roughness: 0.78 },
};

const cache = new Map<string, MeshStandardMaterial>();
const textureCache = new Map<string, Texture>();
export const PLANNER_TEXTURE_READY_EVENT = "planner:texture-ready";
const TEXTURES: Record<string, string> = {
  "parquet-oak": "/planner-assets/textures/wood/oak.svg",
  "parquet-oak-narrow": "/planner-assets/textures/wood/oak-narrow.svg",
  "floor-oak": "/planner-assets/textures/wood/oak.svg",
  "floor-oak-herringbone": "/planner-assets/textures/wood/oak.svg",
  "oak-natural": "/planner-assets/textures/wood/oak.svg",
  "oak-artisan": "/planner-assets/textures/wood/oak.svg",
  "oak-light": "/planner-assets/textures/wood/oak-blonde.svg",
  "slat-oak-dark": "/planner-assets/textures/wood/oak.svg",
  "fabric-sand": "/planner-assets/textures/fabric/weave.svg",
  "fabric-sage": "/planner-assets/textures/fabric/weave.svg",
  "fabric-anthracite": "/planner-assets/textures/fabric/weave.svg",
  "fabric-white": "/planner-assets/textures/fabric/weave.svg",
  "fabric-light-grey": "/planner-assets/textures/fabric/weave.svg",
  "fabric-blush": "/planner-assets/textures/fabric/weave.svg",
  "fabric-bliss-beige": "/planner-assets/textures/fabric/weave.svg",
  "fabric-ecru": "/planner-assets/textures/fabric/weave.svg",
  "fabric-ecru-sheer": "/planner-assets/textures/fabric/weave.svg",
  "shower-curtain-linen-beige": "/planner-assets/textures/fabric/shower-curtain-linen-beige.svg",
  "temu-shower-curtain-beige": "/planner-assets/textures/fabric/shower-curtain-linen-beige.svg",
  "fabric-taupe": "/planner-assets/textures/fabric/weave.svg",
  "fabric-chicago-beige": "/planner-assets/textures/fabric/weave.svg",
  "fabric-kaleo-beige": "/planner-assets/textures/fabric/weave.svg",
  "tejo-panel-greige": "/planner-assets/textures/fabric/weave.svg",
  "rug-woven": "/planner-assets/textures/fabric/rug.svg",
  "rug-gala-beige-taupe": "/planner-assets/textures/fabric/rug.svg",
  "rug-gala-cream": "/planner-assets/textures/fabric/rug.svg",
  "rug-gala-taupe": "/planner-assets/textures/fabric/rug.svg",
  "rug-temu-shaggy-white": "/planner-assets/products/temu-shaggy-rug-white-607474249752115.svg",
  "bath-mat-shaggy-cream": "/planner-assets/textures/fabric/bath-mat-shaggy-cream.svg",
  "rug-temu-shaggy-shadow": "/planner-assets/textures/fabric/rug.svg",
  "rug-temu-easy-line-colorblock": "/planner-assets/textures/fabric/temu-easy-line-colorblock-rug.svg",
  "rug-hall-overlap-taupe": "/planner-assets/textures/fabric/hall-rug-overlap-taupe.svg",
  "rug-hall-soft-abstract": "/planner-assets/textures/fabric/hall-rug-soft-abstract.svg",
  "rug-hall-beige-patchwork": "/planner-assets/textures/fabric/hall-rug-beige-patchwork.svg",
  "rug-hall-olive-lineart": "/planner-assets/textures/fabric/hall-rug-olive-lineart.svg",
  "rug-temu-rabbit-ivory": "/planner-assets/textures/fabric/temu-rabbit-ivory.svg",
  "rug-temu-rabbit-highlight": "/planner-assets/textures/fabric/temu-rabbit-ivory.svg",
  "rug-temu-rabbit-shadow": "/planner-assets/textures/fabric/temu-rabbit-ivory.svg",
  "rug-temu-vintage-cream": "/planner-assets/textures/fabric/temu-vintage-rug-607199740937372.svg",
  "rug-living-ivory-greige": "/planner-assets/textures/fabric/rug.svg",
  "rug-living-relief": "/planner-assets/textures/fabric/rug.svg",
};

const TILE_TEXTURES: Record<string, { base: [number, number, number]; grout: [number, number, number]; rectangular?: boolean }> = {
  "porcelain-light-taupe": { base: [216, 213, 206], grout: [174, 171, 165] },
  "tile-white-square": { base: [232, 231, 227], grout: [190, 190, 185] },
  "tile-kitchen-grey-square": { base: [216, 216, 211], grout: [176, 176, 171] },
  "tile-white-rect": { base: [234, 233, 229], grout: [191, 191, 186], rectangular: true },
};

export function getPlannerMaterial(materialId: string): MeshStandardMaterial {
  const cached = cache.get(materialId);
  if (cached) return cached;
  const recipe = RECIPES[materialId] ?? fallbackRecipe(materialId);
  const physical = recipe.clearcoat !== undefined || recipe.transmission !== undefined;
  const material = !physical
    ? new MeshStandardMaterial({
      name: `planner-material-${materialId}`,
      color: new Color(recipe.color),
      roughness: recipe.roughness,
      metalness: recipe.metalness ?? 0,
    })
    : new MeshPhysicalMaterial({
      name: `planner-material-${materialId}`,
      color: new Color(recipe.color),
      roughness: recipe.roughness,
      metalness: recipe.metalness ?? 0,
      clearcoat: recipe.clearcoat ?? 0,
      clearcoatRoughness: recipe.clearcoatRoughness ?? 0,
      transmission: recipe.transmission ?? 0,
      transparent: recipe.opacity !== undefined,
      opacity: recipe.opacity ?? 1,
      thickness: recipe.thickness ?? 0,
      ior: recipe.ior ?? 1.5,
      envMapIntensity: recipe.envMapIntensity ?? 1,
      depthWrite: recipe.opacity === undefined,
    });
  cache.set(materialId, material);
  const tileTexture = TILE_TEXTURES[materialId];
  const texturePath = TEXTURES[materialId];
  if (tileTexture) {
    material.map = loadPlannerTileTexture(materialId, tileTexture);
    material.bumpMap = material.map;
    material.bumpScale = 0.035;
    material.needsUpdate = true;
  } else if (materialId === "oak-backsplash") {
    const backsplashTexture = loadKitchenWalnutBacksplashTexture();
    material.map = backsplashTexture;
    material.bumpMap = backsplashTexture;
    material.bumpScale = 0.004;
    material.needsUpdate = true;
  } else if (materialId === "kitchen-worktop-black") {
    const worktopTexture = loadKitchenWorktopTexture();
    material.map = worktopTexture;
    material.bumpMap = worktopTexture;
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (["fabric-bliss-weave", "fabric-chicago-chenille", "fabric-kaleo-chenille", "fabric-temu-sand", "velvet-temu-beige", "fabric-amber-beige"].includes(materialId)) {
    const weave = loadProductWeaveTexture(materialId);
    material.map = weave;
    material.bumpMap = weave;
    material.bumpScale = materialId === "fabric-chicago-chenille" ? 0.022 : 0.018;
    material.needsUpdate = true;
  } else if (materialId === "tejo-cashmere-grain") {
    const grain = loadProductGrainTexture(materialId, [203, 194, 182], 0.76, 0.018);
    material.map = grain;
    material.bumpMap = grain;
    material.bumpScale = 0.012;
    material.needsUpdate = true;
  } else if (materialId === "wc-holder-solid-oak" || materialId === "wc-holder-oak-edge") {
    const oak = loadWcShelfOakTexture(materialId === "wc-holder-oak-edge");
    material.map = oak;
    material.bumpMap = oak;
    material.bumpScale = 0.009;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  } else if (materialId === "oak-bozan-directional" || materialId === "oak-bozan-edge") {
    const oak = loadProductWoodTexture(materialId);
    material.map = oak;
    material.bumpMap = oak;
    material.bumpScale = 0.014;
    material.needsUpdate = true;
  } else if (materialId === "leather-ivory-pebble") {
    const leather = loadProductPebbleTexture();
    material.map = leather;
    material.bumpMap = leather;
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (materialId === "white-lacquer") {
    material.map = loadProductLacquerTexture();
    material.needsUpdate = true;
  } else if (materialId === "rug-rabbit-pile" || materialId === "rug-living-relief") {
    const pile = loadProductPileTexture(materialId);
    material.map = pile;
    material.bumpMap = pile;
    material.bumpScale = materialId === "rug-rabbit-pile" ? 0.024 : 0.014;
    material.needsUpdate = true;
  } else if (materialId === "temu-bath-rug-woven") {
    const waffle = createBathroomWaffleTexture();
    waffle.repeat.set(7.6, 3.8);
    material.color.set("#ffffff");
    material.map = waffle;
    material.bumpMap = waffle;
    material.bumpScale = 0.010;
    material.needsUpdate = true;
  } else if (materialId === "temu-shower-curtain-beige") {
    const linen = createShowerCurtainTextileTexture();
    linen.repeat.set(2.8, 5.0);
    material.color.set("#ffffff");
    material.map = linen;
    material.bumpMap = linen;
    material.bumpScale = 0.003;
    material.needsUpdate = true;
  } else if (materialId === "bath-hook-oak-natural") {
    const oak = loadProductWoodTexture("oak-bozan-directional");
    material.color.set("#ffffff");
    material.map = oak;
    material.bumpMap = oak;
    material.bumpScale = 0.003;
    material.needsUpdate = true;
  } else if (materialId === "leaf-olive-soft") {
    const leaves = loadProductLeafTexture();
    material.map = leaves;
    material.bumpMap = leaves;
    material.bumpScale = 0.006;
    material.needsUpdate = true;
  } else if (materialId === "ceramic-pot-glazed") {
    material.map = loadProductCeramicTexture();
    material.needsUpdate = true;
  } else if (materialId === "vinyl-cashmere-cream") {
    material.map = loadCashmereVinylTexture();
    material.needsUpdate = true;
  } else if (materialId === "wallpaper-vintage-beige-fabric") {
    const wallpaperTexture = loadVintageBeigeFabricWallpaperTexture();
    material.map = wallpaperTexture;
    material.bumpMap = wallpaperTexture;
    material.bumpScale = 0.006;
    material.needsUpdate = true;
  } else if (materialId === "wallpaper-milk-coffee-macaron") {
    const wallpaperTexture = loadMacaronMilkCoffeeWallpaperTexture();
    material.map = wallpaperTexture;
    material.bumpMap = wallpaperTexture;
    material.bumpScale = 0.005;
    material.needsUpdate = true;
  } else if (materialId === "wallpaper-vintage-brown-fabric") {
    const wallpaperTexture = loadVintageBrownFabricWallpaperTexture();
    material.map = wallpaperTexture;
    material.bumpMap = wallpaperTexture;
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (materialId === "outdoor-concrete") {
    material.map = loadConcreteTexture();
    material.needsUpdate = true;
  } else if (materialId === "epoxy-grey") {
    const epoxyTexture = loadEpoxyFloorTexture();
    material.map = epoxyTexture;
    material.bumpMap = epoxyTexture;
    material.bumpScale = 0.006;
    material.needsUpdate = true;
  } else if (materialId === "balcony-floor-beige") {
    material.map = loadBalconyFloorTexture();
    material.needsUpdate = true;
  } else if (texturePath && typeof document !== "undefined") {
    material.map = loadPlannerTexture(texturePath);
    if (materialId.startsWith("parquet-") || materialId.startsWith("floor-") || materialId.startsWith("oak-")) {
      material.bumpMap = material.map;
      material.bumpScale = materialId.startsWith("floor-") ? 0.035 : 0.018;
    }
    material.needsUpdate = true;
  }
  return material;
}

/** 1-cm waffles sampled from the user photo: raised sand yarn borders and
 * a slightly darker recessed square center.  A single local procedural texture
 * works in the 2D/3D pipeline without downloading third-party image assets. */
function createBathroomWaffleTexture() {
  return createProductDataTexture("generated:temu-bath-rug-waffle-1cm", 256, (x, y) => {
    const cell = 16; // 16 cells across the texture, sized as a real small waffle weave
    const u = x % cell;
    const v = y % cell;
    const edge = Math.min(u, cell - 1 - u, v, cell - 1 - v);
    const raised = edge < 3;
    const yarn = Math.sin(x * 1.36) * 3.8 + Math.cos(y * 1.45) * 3.6;
    const grain = ((x * 19 + y * 29 + x * y * 3) % 11 - 5) * 0.66;
    const relief = raised ? 8 : -15;
    return [198 + relief + yarn + grain, 167 + relief + yarn * 0.93 + grain, 131 + relief + yarn * 0.72 + grain];
  });
}

/** Very fine pale beige fabric threads; the volume is in the curtain folds,
 * not in a printed motif or artificial tassels. */
function createShowerCurtainTextileTexture() {
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

function loadProductWeaveTexture(materialId: string) {
  const base = materialId === "fabric-chicago-chenille" ? [216, 213, 204] : materialId === "fabric-kaleo-chenille" ? [221, 210, 194] : [221, 209, 189];
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const diagonal = Math.sin((x + y * 0.7) * 0.58) * 5.6;
    const cross = Math.sin((x - y * 0.45) * 0.74) * 3.4;
    const fiber = ((x * 17 + y * 29 + x * y * 3) % 11) - 5;
    return [base[0] + diagonal + fiber, base[1] + diagonal * 0.92 + cross * 0.28 + fiber, base[2] + diagonal * 0.72 + cross * 0.42 + fiber];
  });
}

function loadProductGrainTexture(materialId: string, base: [number, number, number], direction: number, scale: number) {
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const grain = Math.sin((x * direction + y * scale) * 2.2) * 4.8 + Math.sin((x * 0.14 + y * 0.024) * 3.1) * 2.1;
    return [base[0] + grain, base[1] + grain * 0.95, base[2] + grain * 0.82];
  });
}

function loadWcShelfOakTexture(edge: boolean) {
  return createProductDataTexture(`generated:wc-shelf-oak-${edge ? "edge" : "face"}`, 256, (x, y) => {
    // Directional honey-oak grain, narrow pores and warm latewood lines.
    const wave = Math.sin(x * 0.09 + Math.sin(y * 0.17) * 2.1) * 8;
    const knots = Math.sin(x * 0.023 + y * 0.068) * 4.8;
    const pores = ((x * 41 + y * 17 + x * y) % 23 - 11) * 0.45;
    const base = edge ? [180, 127, 77] : [224, 186, 139];
    return [base[0] + wave + knots + pores, base[1] + wave * 0.84 + knots + pores, base[2] + wave * 0.68 + knots + pores];
  });
}

function loadProductWoodTexture(materialId: string) {
  const edge = materialId === "oak-bozan-edge";
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const grain = Math.sin(x * 0.18 + Math.sin(y * 0.08) * 2.5) * 8 + Math.sin(x * 0.047 + y * 0.12) * 3;
    const base = edge ? [141, 96, 60] : [183, 131, 82];
    return [base[0] + grain, base[1] + grain * 0.76, base[2] + grain * 0.55];
  });
}

function loadProductPebbleTexture() {
  return createProductDataTexture("generated:leather-ivory-pebble", 96, (x, y) => {
    const pebble = Math.sin(x * 0.9 + Math.sin(y * 0.43) * 2) * 2.6 + Math.sin(y * 1.2 + x * 0.22) * 1.8;
    return [229 + pebble, 222 + pebble * 0.92, 212 + pebble * 0.72];
  });
}

function loadProductLacquerTexture() {
  return createProductDataTexture("generated:white-lacquer", 96, (x, y) => {
    const reflection = Math.sin((x + y) * 0.08) * 2.2 + Math.sin(y * 0.32) * 1.1;
    return [244 + reflection, 242 + reflection, 236 + reflection * 0.78];
  });
}

function loadProductPileTexture(materialId: string) {
  const living = materialId === "rug-living-relief";
  return createProductDataTexture(`generated:${materialId}`, 128, (x, y) => {
    const pile = Math.sin((x * 0.9 + y * 0.35) * (living ? 0.48 : 0.78)) * (living ? 4.5 : 8);
    const stripe = living ? Math.sin(y * 0.12) * 2.8 : 0;
    const base = living ? [222, 213, 199] : [238, 232, 220];
    return [base[0] + pile + stripe, base[1] + pile * 0.96 + stripe, base[2] + pile * 0.88 + stripe];
  });
}

function loadProductLeafTexture() {
  return createProductDataTexture("generated:leaf-olive-soft", 96, (x, y) => {
    const vein = Math.sin(x * 0.28 + y * 0.05) * 7 + Math.sin(y * 0.16) * 3;
    return [102 + vein, 115 + vein * 0.9, 88 + vein * 0.6];
  });
}

function loadProductCeramicTexture() {
  return createProductDataTexture("generated:ceramic-pot-glazed", 64, (x, y) => {
    const glaze = Math.sin(x * 0.14 + y * 0.04) * 2.8;
    return [215 + glaze, 200 + glaze * 0.88, 180 + glaze * 0.6];
  });
}

function loadKitchenWorktopTexture() {
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

function loadKitchenWalnutBacksplashTexture() {
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

function loadVintageBeigeFabricWallpaperTexture() {
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
function loadMacaronMilkCoffeeWallpaperTexture() {
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
 * Slightly deeper brown textile wallpaper from the second supplied Temu
 * reference (10 m × 44.96 cm).  The broad fibers are intentionally subtle so
 * the seam spacing remains believable when a whole wall is covered.
 */
function loadVintageBrownFabricWallpaperTexture() {
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
      data[offset] = Math.max(0, Math.min(255, 169 + weave));
      data[offset + 1] = Math.max(0, Math.min(255, 139 + weave * 0.92));
      data[offset + 2] = Math.max(0, Math.min(255, 112 + weave * 0.78));
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

function loadCashmereVinylTexture() {
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

function loadConcreteTexture() {
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

function loadEpoxyFloorTexture() {
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

function loadBalconyFloorTexture() {
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

export function plannerMaterialCacheSize() {
  return cache.size;
}

function fallbackRecipe(materialId: string): MaterialRecipe {
  if (materialId.startsWith("#")) return { color: materialId, roughness: 0.72 };
  const hue = [...materialId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 360;
  return { color: `hsl(${hue} 18% 58%)`, roughness: 0.76 };
}

function loadPlannerTexture(path: string) {
  const cached = textureCache.get(path);
  if (cached) return cached;
  const texture = new TextureLoader().load(path, (loadedTexture) => {
    loadedTexture.needsUpdate = true;
    window.dispatchEvent(new CustomEvent(PLANNER_TEXTURE_READY_EVENT, { detail: path }));
  });
  texture.name = `planner-texture-${path.split("/").at(-1)}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  if (path.includes("temu-easy-line-colorblock-rug") || path.includes("hall-rug-") || path.includes("temu-bath-rug-") || path.includes("temu-vintage-rug-")) {
    texture.repeat.set(1, 1);
  } else {
    texture.repeat.set(path.includes("oak-blonde") ? 3.6 : 2.4, path.includes("oak-blonde") ? 1.45 : 2.4);
  }
  textureCache.set(path, texture);
  return texture;
}

function loadPlannerTileTexture(
  materialId: string,
  recipe: { base: [number, number, number]; grout: [number, number, number]; rectangular?: boolean },
) {
  const key = `generated:${materialId}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const row = Math.floor(y / 16);
    for (let x = 0; x < size; x += 1) {
      const staggeredX = (x + (recipe.rectangular && row % 2 ? 16 : 0)) % 32;
      const grout = recipe.rectangular
        ? y % 16 < 2 || staggeredX < 2
        : y % 32 < 2 || x % 32 < 2;
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
  texture.repeat.set(recipe.rectangular ? 3.2 : 2.4, recipe.rectangular ? 4.8 : 2.4);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
