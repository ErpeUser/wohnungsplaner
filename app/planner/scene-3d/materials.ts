import {
    Color,
    MeshPhysicalMaterial,
    MeshStandardMaterial
} from "three";
import { RECIPES, TEXTURES, TILE_TEXTURES, fallbackRecipe } from "./materials/recipes.ts";
import { asBumpMap, createBathroomWaffleTexture, createShowerCurtainTextileTexture, loadBalconyFloorTexture, loadCashmereVinylTexture, loadChairChenilleTexture, loadComparisonTabletopTexture, loadComparisonWoodTexture, loadConcreteTexture, loadEpoxyFloorTexture, loadKitchenWalnutBacksplashTexture, loadKitchenWorktopTexture, loadMacaronMilkCoffeeWallpaperTexture, loadPlannerTexture, loadPlannerTileTexture, loadProductCeramicTexture, loadProductGrainTexture, loadProductLacquerTexture, loadProductLeafTexture, loadProductPebbleTexture, loadProductPileTexture, loadProductWeaveTexture, loadProductWoodTexture, loadVintageBeigeFabricWallpaperTexture, loadVintageBrownFabricWallpaperTexture, loadWcShelfOakTexture } from "./materials/texture-factory.ts";
export { PLANNER_TEXTURE_READY_EVENT } from "./materials/texture-factory.ts";


const cache = new Map<string, MeshStandardMaterial>();
const comparisonTabletopCache = new Map<string, MeshStandardMaterial>();

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
    material.bumpMap = asBumpMap(material.map);
    material.bumpScale = 0.035;
    material.needsUpdate = true;
  } else if (materialId === "oak-backsplash") {
    const backsplashTexture = loadKitchenWalnutBacksplashTexture();
    material.map = backsplashTexture;
    material.bumpMap = asBumpMap(backsplashTexture);
    material.bumpScale = 0.004;
    material.needsUpdate = true;
  } else if (materialId === "kitchen-worktop-black") {
    const worktopTexture = loadKitchenWorktopTexture();
    material.map = worktopTexture;
    material.bumpMap = asBumpMap(worktopTexture);
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (["fabric-bliss-weave", "fabric-chicago-chenille", "fabric-kaleo-chenille", "fabric-woltu-chenille-cream", "fabric-temu-sand", "velvet-temu-beige", "fabric-amber-beige"].includes(materialId)) {
    const weave = materialId === "fabric-kaleo-chenille" || materialId === "fabric-woltu-chenille-cream" || materialId === "fabric-amber-beige"
      ? loadChairChenilleTexture(materialId) : loadProductWeaveTexture(materialId);
    material.map = weave;
    material.bumpMap = asBumpMap(weave);
    material.bumpScale = materialId === "fabric-chicago-chenille" ? 0.022 : 0.018;
    // Generated RGB already carries the finish; tinting it again darkens it.
    material.color.set("#ffffff");
    material.needsUpdate = true;
  } else if (materialId === "hallway-walnut-brown") {
    // Generated wood grain keeps the user-provided private photo out of public assets.
    const grain = loadProductGrainTexture(materialId, [128, 103, 80], 0.78, 0.018);
    material.map = grain;
    material.bumpMap = asBumpMap(grain);
    material.bumpScale = 0.012;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  } else if (materialId === "tejo-cashmere-grain") {
    const grain = loadProductGrainTexture(materialId, [203, 194, 182], 0.76, 0.018);
    material.map = grain;
    material.bumpMap = asBumpMap(grain);
    material.bumpScale = 0.012;
    material.needsUpdate = true;
  } else if (materialId === "wc-holder-solid-oak" || materialId === "wc-holder-oak-edge") {
    const oak = loadWcShelfOakTexture(materialId === "wc-holder-oak-edge");
    material.map = oak;
    material.bumpMap = asBumpMap(oak);
    material.bumpScale = 0.009;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  } else if (materialId === "oak-bozan-directional" || materialId === "oak-bozan-edge") {
    const oak = loadProductWoodTexture(materialId);
    material.map = oak;
    material.bumpMap = asBumpMap(oak);
    material.bumpScale = 0.014;
    material.needsUpdate = true;
  } else if (["oak-natural", "oak-artisan", "oak-artisan-edge", "walnut"].includes(materialId)) {
    // Comparison furniture must remain recognizably different in the 3D
    // view.  The old shared SVG swatch flattened oak, artisan oak and walnut
    // into almost the same brown under tone mapping.  Use local procedural
    // grain with a per-finish base colour so no merchant/private image is
    // required and each material keeps a real PBR bump response.
    const wood = loadComparisonWoodTexture(materialId);
    material.map = wood;
    material.bumpMap = asBumpMap(wood);
    material.bumpScale = materialId === "walnut" ? 0.018 : 0.014;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  } else if (materialId === "leather-ivory-pebble") {
    const leather = loadProductPebbleTexture();
    material.map = leather;
    material.bumpMap = asBumpMap(leather);
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (materialId === "white-lacquer") {
    material.map = loadProductLacquerTexture();
    material.needsUpdate = true;
  } else if (materialId === "rug-rabbit-pile" || materialId === "rug-living-relief") {
    const pile = loadProductPileTexture(materialId);
    material.map = pile;
    material.bumpMap = asBumpMap(pile);
    material.bumpScale = materialId === "rug-rabbit-pile" ? 0.024 : 0.014;
    material.needsUpdate = true;
  } else if (materialId === "temu-bath-rug-woven") {
    const waffle = createBathroomWaffleTexture();
    waffle.repeat.set(7.6, 3.8);
    material.color.set("#ffffff");
    material.map = waffle;
    material.bumpMap = asBumpMap(waffle);
    material.bumpScale = 0.010;
    material.needsUpdate = true;
  } else if (materialId === "temu-shower-curtain-beige") {
    const linen = createShowerCurtainTextileTexture();
    linen.repeat.set(2.8, 5.0);
    material.color.set("#ffffff");
    material.map = linen;
    material.bumpMap = asBumpMap(linen);
    material.bumpScale = 0.003;
    material.needsUpdate = true;
  } else if (materialId === "bath-hook-oak-natural") {
    const oak = loadProductWoodTexture("oak-bozan-directional");
    material.color.set("#ffffff");
    material.map = oak;
    material.bumpMap = asBumpMap(oak);
    material.bumpScale = 0.003;
    material.needsUpdate = true;
  } else if (materialId === "leaf-olive-soft") {
    const leaves = loadProductLeafTexture();
    material.map = leaves;
    material.bumpMap = asBumpMap(leaves);
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
    material.bumpMap = asBumpMap(wallpaperTexture);
    material.bumpScale = 0.006;
    material.needsUpdate = true;
  } else if (materialId === "wallpaper-milk-coffee-macaron") {
    const wallpaperTexture = loadMacaronMilkCoffeeWallpaperTexture();
    material.map = wallpaperTexture;
    material.bumpMap = asBumpMap(wallpaperTexture);
    material.bumpScale = 0.005;
    material.needsUpdate = true;
  } else if (materialId === "wallpaper-vintage-brown-fabric") {
    const wallpaperTexture = loadVintageBrownFabricWallpaperTexture();
    material.map = wallpaperTexture;
    material.bumpMap = asBumpMap(wallpaperTexture);
    material.bumpScale = 0.008;
    material.needsUpdate = true;
  } else if (materialId === "outdoor-concrete") {
    const concrete = loadConcreteTexture();
    material.map = concrete;
    material.bumpMap = asBumpMap(concrete);
    material.bumpScale = 0.012;
    material.needsUpdate = true;
  } else if (materialId === "epoxy-grey") {
    const epoxyTexture = loadEpoxyFloorTexture();
    material.map = epoxyTexture;
    material.bumpMap = asBumpMap(epoxyTexture);
    material.bumpScale = 0.006;
    material.needsUpdate = true;
  } else if (materialId === "balcony-floor-beige") {
    const balconyFloor = loadBalconyFloorTexture();
    material.map = balconyFloor;
    material.bumpMap = asBumpMap(balconyFloor);
    material.bumpScale = 0.01;
    material.needsUpdate = true;
  } else if (texturePath && typeof document !== "undefined") {
    material.map = loadPlannerTexture(texturePath);
    if (materialId.startsWith("parquet-") || materialId.startsWith("floor-") || materialId.startsWith("oak-")) {
      material.bumpMap = asBumpMap(material.map);
      material.bumpScale = materialId.startsWith("floor-") ? 0.035 : 0.018;
    }
    material.needsUpdate = true;
  }
  return material;
}

/** A separate, application-lifetime profile for the three primary table tops.
 * Shared wood recipes also serve cabinets, supports and generic catalogue models. */
export function getComparisonTabletopMaterial(materialId: string): MeshStandardMaterial {
  if (!["walnut", "oak-natural", "oak-artisan"].includes(materialId)) return getPlannerMaterial(materialId);
  const cached = comparisonTabletopCache.get(materialId);
  if (cached) return cached;
  const material = getPlannerMaterial(materialId).clone();
  const wood = loadComparisonTabletopTexture(materialId);
  material.name = `planner-tabletop-${materialId}`;
  material.map = wood;
  material.bumpMap = asBumpMap(wood);
  material.needsUpdate = true;
  comparisonTabletopCache.set(materialId, material);
  return material;
}
