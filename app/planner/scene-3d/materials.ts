import {
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";

type MaterialRecipe = {
  color: string;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
};

const RECIPES: Record<string, MaterialRecipe> = {
  "parquet-oak": { color: "#b98758", roughness: 0.68 },
  "floor-oak": { color: "#b98758", roughness: 0.68 },
  "floor-oak-herringbone": { color: "#bd8d5e", roughness: 0.66 },
  "porcelain-light": { color: "#d7d4cc", roughness: 0.48 },
  "floor-tile-light": { color: "#d7d4cc", roughness: 0.48 },
  "epoxy-grey": { color: "#9b9f9c", roughness: 0.58 },
  "outdoor-concrete": { color: "#a4a29b", roughness: 0.9 },
  "wall-warm-white": { color: "#eee9df", roughness: 0.82 },
  "door-oak": { color: "#a66f43", roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.75 },
  "oak-natural": { color: "#b98a5e", roughness: 0.64 },
  walnut: { color: "#704c35", roughness: 0.62 },
  "white-matte": { color: "#e8e5de", roughness: 0.76 },
  "fabric-sand": { color: "#c4aa8e", roughness: 0.96 },
  "fabric-sage": { color: "#82938a", roughness: 0.98 },
  "fabric-anthracite": { color: "#4c5252", roughness: 0.94 },
  "rug-woven": { color: "#d7c4a6", roughness: 0.98 },
  "metal-dark": { color: "#343b3b", roughness: 0.36, metalness: 0.78 },
  "shade-linen": { color: "#eadcc8", roughness: 0.92 },
  terracotta: { color: "#9c5d3f", roughness: 0.86 },
  "leaf-green": { color: "#557b5d", roughness: 0.9 },
  "object-neutral": { color: "#9d8a78", roughness: 0.78 },
};

const cache = new Map<string, MeshStandardMaterial>();
const textureCache = new Map<string, Texture>();
const TEXTURES: Record<string, string> = {
  "parquet-oak": "/planner-assets/textures/wood/oak.svg",
  "floor-oak": "/planner-assets/textures/wood/oak.svg",
  "floor-oak-herringbone": "/planner-assets/textures/wood/oak.svg",
  "oak-natural": "/planner-assets/textures/wood/oak.svg",
  "fabric-sand": "/planner-assets/textures/fabric/weave.svg",
  "fabric-sage": "/planner-assets/textures/fabric/weave.svg",
  "fabric-anthracite": "/planner-assets/textures/fabric/weave.svg",
  "rug-woven": "/planner-assets/textures/fabric/rug.svg",
};

export function getPlannerMaterial(materialId: string): MeshStandardMaterial {
  const cached = cache.get(materialId);
  if (cached) return cached;
  const recipe = RECIPES[materialId] ?? fallbackRecipe(materialId);
  const material = recipe.clearcoat === undefined
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
      clearcoat: recipe.clearcoat,
      clearcoatRoughness: recipe.clearcoatRoughness,
    });
  cache.set(materialId, material);
  const texturePath = TEXTURES[materialId];
  if (texturePath && typeof document !== "undefined") {
    material.map = loadPlannerTexture(texturePath);
    material.needsUpdate = true;
  }
  return material;
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
  const texture = new TextureLoader().load(path);
  texture.name = `planner-texture-${path.split("/").at(-1)}`;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  textureCache.set(path, texture);
  return texture;
}
