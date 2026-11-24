



export type MaterialRecipe = {
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



export const RECIPES: Record<string, MaterialRecipe> = {
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
  // Zimmer 1 uses the supplied textile pattern in a sand-beige tint; the
  // historical ID remains an alias so saved plans do not lose their surface.
  "wallpaper-vintage-brown-fabric": { color: "#d8c7ae", roughness: 0.98 },
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
  // WC-specific wood finishes; independent from generic oak and from the
  // unrelated WC toilet-roll holder. Each has matching top and edge colours.
  "wc-board-simple-face": { color: "#aa956f", roughness: 0.75 },
  "wc-board-simple-edge": { color: "#bba17b", roughness: 0.77 },
  "wc-board-boxxx-face": { color: "#d8c0a4", roughness: 0.73 },
  "wc-board-boxxx-edge": { color: "#cbb294", roughness: 0.76 },
  "wc-board-livetastic-face": { color: "#cb8652", roughness: 0.79 },
  "wc-board-livetastic-edge": { color: "#a96035", roughness: 0.84 },
  "wc-board-livetastic-end": { color: "#8b5438", roughness: 0.89 },

  "wc-holder-solid-oak": { color: "#e6c497", roughness: 0.72 },
  "wc-holder-oak-edge": { color: "#bb8857", roughness: 0.8 },
  "wc-holder-black-iron": { color: "#20211f", roughness: 0.46, metalness: 0.78 },
  "wc-paper-white": { color: "#f5f2e9", roughness: 0.98 },
  "wc-paper-core": { color: "#ad9981", roughness: 0.95 },
  "oak-artisan": { color: "#d0a66b", roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.68 },
  "oak-artisan-edge": { color: "#9e6b3f", roughness: 0.66 },
  "oak-bozan-directional": { color: "#b78352", roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.7 },
  "oak-bozan-edge": { color: "#8d603c", roughness: 0.68 },
  "oak-light": { color: "#c99d68", roughness: 0.7, clearcoat: 0.04, clearcoatRoughness: 0.78 },
  "oak-wotan": { color: "#b17d4f", roughness: 0.67, clearcoat: 0.05, clearcoatRoughness: 0.8 },
  "oak-wotan-edge": { color: "#835634", roughness: 0.72 },
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
  "fabric-woltu-chenille-cream": { color: "#ded4c5", roughness: 0.99 },
  "fabric-kaleo-beige": { color: "#ddd2c2", roughness: 0.98 },
  "fabric-kaleo-chenille": { color: "#ddd2c2", roughness: 0.99 },
  "fabric-temu-sand": { color: "#d5c7b6", roughness: 0.98 },
  "leather-temu-cream": { color: "#e9dfd2", roughness: 0.5, clearcoat: 0.18, clearcoatRoughness: 0.42 },
  "velvet-temu-beige": { color: "#cdbba9", roughness: 0.98 },
  "fabric-amber-beige": { color: "#d6c4ad", roughness: 0.98 },
  "hallway-walnut-brown": { color: "#806750", roughness: 0.68, clearcoat: 0.06, clearcoatRoughness: 0.8 },
  "hallway-brown-groove": { color: "#4f4033", roughness: 0.84 },
  "hallway-sand-back": { color: "#d8cec0", roughness: 0.94 },
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



export const TEXTURES: Record<string, string> = {
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



export const TILE_TEXTURES: Record<string, { base: [number, number, number]; grout: [number, number, number]; rectangular?: boolean }> = {
  "porcelain-light-taupe": { base: [216, 213, 206], grout: [174, 171, 165] },
  "tile-white-square": { base: [232, 231, 227], grout: [190, 190, 185] },
  "tile-kitchen-grey-square": { base: [216, 216, 211], grout: [176, 176, 171] },
  "tile-white-rect": { base: [234, 233, 229], grout: [191, 191, 186], rectangular: true },
};



export function fallbackRecipe(materialId: string): MaterialRecipe {
  if (materialId.startsWith("#")) return { color: materialId, roughness: 0.72 };
  const hue = [...materialId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 360;
  return { color: `hsl(${hue} 18% 58%)`, roughness: 0.76 };
}
