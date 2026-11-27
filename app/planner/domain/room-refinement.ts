import {TILE_SIZE_METRES} from './tile-dimensions.ts';
import { upgradeZimmer1EntryGold, ZIMMER1_ENTRY_ART_ID } from './zimmer1-entry-gold.ts';
import type {PlannerBuiltIn,PlannerMetadata,PlannerPlacement} from './types.ts';

export const INTERIOR_REVISION='interior-refinement-2026-11-11';
export const FINISHED_FLOOR_Y=.012;
export const KITCHEN_REFERENCE=Object.freeze({
  originX:.06,originZ:3.53,northRun:2.425,westRun:2.562,plinth:.12,carcass:.75,
  worktopThickness:.04,worktopTop:.91,backsplashHeight:.56,upperBottom:1.47,upperHeight:.75,
  endPanel:.016,cabinetNorthEnd:1.766,nicheStart:1.768,nicheWidth:.657,worktopDepth:.603,
  // User-confirmed apartment tile size; not a supplier PDF dimension.
  tilePitch:TILE_SIZE_METRES,tileGrout:.002,
});
export const HALL_REFERENCE=Object.freeze({
  tejoPrint:{width:.36,height:.50},plateDiameters:[.18,.14,.11] as readonly number[],
  betweenDoorsPrint:{width:.32,height:.45},planterDiameter:.25,clearDoorGap:.38,
});
const ZIMMER1_ENTRY_NICHE_ID = 'builtin-z1-entry-niche';

/** Retire only the former bedroom placement, not its model. */
export function removeZimmer1EntryNiche<T extends { id: string; builtIns: PlannerBuiltIn[] }>(document: T): T {
  if (document.id !== 'wohnung-v3' || !document.builtIns.some(item => item.id === ZIMMER1_ENTRY_NICHE_ID)) return document;
  return { ...document, builtIns: document.builtIns.filter(item => item.id !== ZIMMER1_ENTRY_NICHE_ID) };
}

export const REMOVED_INTERIOR_IDS=new Set([ZIMMER1_ENTRY_NICHE_ID,ZIMMER1_ENTRY_ART_ID,'builtin-hall-wall-decor','builtin-kitchen-backsplash-corner','builtin-hall-tejo-art-plates','builtin-hall-between-door-decor']);
export function upgradeWoltuNightstandPlacement<T extends { id: string; placements: PlannerPlacement[] }>(document: T): T {
  if (document.id !== 'wohnung-v3') return document;
  let changed = false;
  const placements = document.placements.map((placement) => {
    if (placement.id !== 'zimmer1-led-nightstand' || placement.catalogId !== 'nightstand-led-2drawer-white') return placement;
    changed = true;
    return {
      ...placement,
      catalogId: 'nightstand-aliexpress-woltu-1005012793801128',
      size: { width: 0.396, depth: 0.3, height: 0.604 },
      materialVariants: { ...placement.materialVariants, main: 'white-matte' },
    };
  });
  return changed ? { ...document, placements } : document;
}
export function hookCenters(width:number):number[]{
  if(!Number.isFinite(width)||width<.48)throw new RangeError('Four hooks need at least 48 cm.');
  return Array.from({length:4},(_,i)=>-width/2+.06+i*(width-.12)/3);
}
export function kitchenModuleWidths():number[]{return [.45,.15,.6,.6,.112,.65];}
const kitchenEvidence:PlannerMetadata={source:'BD19929-2.PDF, S. 1-4; Nutzerauftrag',confidence:'estimated',notes:[INTERIOR_REVISION,
  'Bestaetigte Planmasse: 2425/2562 mm Zeilen; Sockel 120, Korpus 750, Arbeitsplatte 40, Rueckwand 560 mm; Oberschraenke UK 1470 / OK 2220 mm.',
  'Nordkette 1766 + 659 bzw. 1768 + 657 mm: 2 mm Plan-/Anschlusstoleranz. Keine erfundene dickere Abschlusswange.',
  'Vorhandene lichte Nordbreite 2380 mm weicht 45 mm vom Lieferplan ab. Module bleiben masshaltig; 600-mm-Kuehlschrank wird ohne Wanddurchdringung eingepasst. Verbindliches Raumaufmass bleibt offen.']};
const bathEvidence:PlannerMetadata={source:'Nutzerfoto und bestätigte Maße; AliExpress Art. 1005013137520536',confidence:'confirmed',notes:[INTERIOR_REVISION,
  'Bad 122 × 61 cm, WC 92 × 61 cm inklusive Fransen; Webpitch und Modellhöhe 1 cm bildbasiert, Position und Ausrichtung nach Nutzerauftrag.']};
type Update=Partial<PlannerBuiltIn>;
const p=(x:number,z:number)=>({x,z});
const s=(width:number,depth:number,height:number)=>({width,depth,height});
const k=(update:Update):Update=>({...update,elevation:(update.elevation??0)+FINISHED_FLOOR_Y,metadata:kitchenEvidence});
export const INTERIOR_UPDATES:Readonly<Record<string,Update>>={
  'builtin-bath-mat':{position:p(-1.25,8.99),size:s(1.22,.61,.01),rotation:90,elevation:.0125,collision:'decorative',materialVariants:{main:'aliexpress-bath-rug-woven'},metadata:bathEvidence,label:'Badteppich · beige Waffelstruktur mit Fransen · 122 × 61 cm · am Waschbecken'},
  'builtin-wc-mat':{position:p(-1.87,5.15),size:s(.92,.61,.01),rotation:90,elevation:.0125,collision:'decorative',materialVariants:{main:'aliexpress-bath-rug-woven'},metadata:bathEvidence,label:'WC-Teppich · beige Waffelstruktur mit Fransen · 92 × 61 cm · längs vor dem WC'},
  'builtin-bath-towel-hook-rail':{position:p(-.20,8.82),size:s(.72,.09,.12),rotation:90,elevation:1.49,catalogId:'bath-towel-hooks-wood-black',materialVariants:{main:'bath-hook-oak-natural'},collision:'decorative',label:'4 einzelne Rundhaken · Naturholz / Schwarz · nebeneinander',metadata:{source:'AliExpress Art. 1005013057225398; Style2; 4PCS; Nutzerfoto',confidence:'estimated',notes:[INTERIOR_REVISION,'Vier einzelne Haken auf einer Hoehe, Achsabstand 20 cm; Mittelpunkt 155 cm ueber Boden. Style2 laut Produktfoto: helles Naturholz mit senkrechter Maserung, kurze schwarze Stiele und ovale schwarze Haken; Klebemontage ohne Bohren. Scheibendurchmesser 12 cm und Montagemasse bleiben Darstellungsannahmen.']}},
  'builtin-wc-paper-holder':{position:p(-2.285,4.88),rotation:270,size:s(.33,.15,.25),elevation:.68,catalogId:'wc-paper-holder',materialVariants:{main:'wc-holder-solid-oak'},collision:'decorative',label:'Dunklere Massivholz-Doppelablage mit Papierhalter · gegenüberliegende WC-Wand',metadata:{source:'Nutzerfotos; AliExpress Art. 1005013624521211',confidence:'estimated',notes:[INTERIOR_REVISION,'Zwei versetzte Holzablagen je 16,99 × 13,97 cm; Eisenarm 14,98 cm; Verbindungssteg 9,39 cm laut Produktbild. Dunklerer warmer Holzton, mattschwarzer Halter.', 'Gegenueberliegende WC-Seitenwand, nach innen orientiert; 33 × 15 × 25 cm Gesamtmass und Montagehoehe bleiben Schaetzwerte.']}},
  'builtin-kitchen-base-west':k({position:p(.3615,5.136),size:s(1.912,.603,.87),rotation:-90,label:'Gerätezeile · 450 + 150 + 600 + 600 + 112 mm bis zur Ecke'}),
  'builtin-kitchen-corner-base':k({position:p(.635,3.855),size:s(1.15,.65,.87),rotation:0,label:'ESPA115-65 · Eckspülenschrank 115 × 65 cm'}),
  'builtin-kitchen-base-north':k({position:p(1.518,3.8315),size:s(.616,.603,.87),rotation:0,label:'600-mm-Geschirrspülerfront und 16-mm-Abschluss'}),
  'builtin-kitchen-worktop-corner':k({position:p(.3615,3.8315),size:s(.603,.603,.04),rotation:0,elevation:.87}),
  'builtin-kitchen-worktop-north':k({position:p(1.2445,3.8315),size:s(1.163,.603,.04),rotation:0,elevation:.87}),
  'builtin-kitchen-worktop-west':k({position:p(.3615,5.1125),size:s(1.959,.603,.04),rotation:-90,elevation:.87}),
  'builtin-kitchen-upper-north':k({position:p(1.168,3.7175),size:s(1.316,.375,.75),rotation:0,elevation:1.47,label:'Oberschränke 300 + 400 + Mikrowellenmodul 600 + Abschluss 16 mm'}),
  'builtin-kitchen-upper-west':k({position:p(.235,4.655),size:s(.45,.35,.75),rotation:-90,elevation:1.47,label:'O45-75 · 45-cm-Oberschrank zwischen Ecke und Haube'}),
  'builtin-kitchen-upper-west-end':k({position:p(.235,5.792),size:s(.6,.35,.75),rotation:-90,elevation:1.47,label:'O60-75 · 60-cm-Oberschrank am Zeilenende'}),
  'builtin-kitchen-corner-shelf':k({position:p(.285,3.98),size:s(.45,.90,.75),rotation:0,elevation:1.47,label:'EO90-75 · L-förmiger Eckoberschrank ohne überlappende Fronten'}),
  'builtin-kitchen-backsplash':k({position:p(.943,3.538),size:s(1.766,.014,.56),rotation:0,elevation:.91}),
  'builtin-kitchen-backsplash-west':k({position:p(.068,4.811),size:s(2.562,.014,.56),rotation:-90,elevation:.91}),
  'builtin-kitchen-sink':k({position:p(.96,3.83),elevation:.75,label:'Edelstahlspüle im 115-cm-Eckschrank, links vom Geschirrspüler'}),
  'builtin-kitchen-hob':k({position:p(.3615,5.192),size:s(.58,.52,.008),rotation:90,elevation:.909}),
  'builtin-kitchen-oven':k({position:p(.3615,5.192),rotation:-90,elevation:.23}),
  'builtin-kitchen-hood':k({position:p(.235,5.192),rotation:-90,elevation:1.47}),
  'builtin-kitchen-microwave':k({position:p(1.51,3.88),rotation:0,elevation:1.49,label:'Mikrowelle im OM60-Modul über der Geschirrspülerfront'}),
  // Keep the refrigerator's existing size, material, identity and product source.
  'builtin-kitchen-fridge':{position:p(2.139,3.855),elevation:FINISHED_FLOOR_Y},
  'builtin-kitchen-tile-north':{position:p(1.25,4.225),size:s(2.38,1.39,.003),rotation:0,elevation:.0122,collision:'decorative',metadata:{...kitchenEvidence,notes:[...(kitchenEvidence.notes??[]),'Unbemasste L-Bodenzone an bestehende lichte Wandbreite geclippt. 20-cm-Fliesenraster laut Nutzerangabe, 2-mm-Fugen als Visualisierungsannahme.']}},
  'builtin-kitchen-tile-west':{position:p(.665,5.506),size:s(1.21,1.172,.003),rotation:0,elevation:.0122,collision:'decorative',metadata:{...kitchenEvidence,notes:[...(kitchenEvidence.notes??[]),'Durchlaufendes 20-cm-Raster; Bodenzone im Lieferplan nicht bemasst.']}},
};
function hall(id:string,label:string,x:number,z:number,size:PlannerBuiltIn['size'],rotation:number,elevation:number,notes:string[]):PlannerBuiltIn{
  return {id,label,catalogId:id.replace('builtin-',''),roomId:'vorraum',kind:'other',locked:true,position:p(x,z),size,rotation,elevation,collision:'decorative',materialVariants:{main:'oak-light'},metadata:{source:'Nutzerreferenzen; herstellerneutrale Deko-Planung',confidence:'estimated',notes:[INTERIOR_REVISION,...notes]}};
}
export const HALL_DECOR:readonly PlannerBuiltIn[]=[
  hall('builtin-hall-tejo-art-plates','Vorraum · Bild 36 × 50 cm und Wandteller Ø 18 / 14 / 11 cm',-2.33,7.52,s(.40,.055,1.10),270,1.07,['Bildmitte 187 cm; Wandteller darunter versetzt. 40-cm-Wandfeld endet vor Tejo bei z=7.72 m. Gegensprechanlage und Schalter bleiben frei.']),
  hall('builtin-hall-between-door-decor','Vorraum zwischen Türen · Bild 32 × 45 cm und Wandpflanzgefäß Ø 25 cm',-1.30,6.012,s(.32,.16,.97),0,1.08,['Topfdurchmesser genau 25 cm. Bildbreite 32 cm passt in das rund 38-cm-Feld zwischen den Zargen. Bildmitte 180 cm; Topfmitte 125 cm. Echte Raumgeometrie statt Fotoebene.']),
];

/** Previous art and planter groups remain available in model review. Only their
 * active placements are retired. The new set is one purchase, ten objects. */
export const HALL_BASKET_ARTICLE_ID='607596656326590';
export const HALL_BASKET_SPECS = [
  {id:'flower', label:'Blüte Creme', w:30, h:30, u:50, y:143},
  {id:'leaf-horizontal', label:'Naturblatt quer', w:24, h:16, u:52, y:173},
  {id:'small-spiral', label:'Kleiner Spiralkorb', w:11, h:11, u:35, y:193},
  {id:'small-braid-a', label:'Kleiner Flechtkorb', w:11, h:11, u:69.5, y:130},
  {id:'ring-white', label:'Weißer Ringkorb', w:25, h:25, u:19, y:80.5},
  {id:'leaf-vertical', label:'Naturblatt hoch', w:16, h:23, u:30.5, y:50},
  {id:'ring-brown', label:'Braun-weißer Ringkorb', w:24, h:24, u:22.5, y:126.5},
  {id:'spiral-white', label:'Weißer Spiralkorb', w:25, h:25, u:17, y:173},
  {id:'natural-round', label:'Runder Naturkorb', w:24, h:24, u:53, y:105},
  {id:'small-braid-b', label:'Kleiner Flechtkorb', w:11, h:11, u:8.5, y:54},
] as const;
/** One gallery on the entry wall. The narrow 44.5 cm strip opens into the
 * white wall beside the open TEJO seating bay between 75 and 181 cm.
 * Use that wider area without touching the cabinet, door or fittings. */
export const HALL_BASKET_WALL=Object.freeze({x:-2.345,startZ:7.2975,narrowEndZ:7.7425,endZ:8.06,openBottom:.75,openTop:1.81,height:2.56,rotation:270});
export function hallBasketDecor(): PlannerBuiltIn[]{
  const depth=.03;
  const round=(n:number)=>Math.round(n*1e6)/1e6;
  return HALL_BASKET_SPECS.map(spec=>{
    const label='Vorraum · Wandkorb '+spec.label+' · '+(spec.w===spec.h?'Ø '+spec.w+' cm':spec.w+' × '+spec.h+' cm');
    const target=hall('builtin-hall-woven-basket-'+spec.id,label,HALL_BASKET_WALL.x,round(HALL_BASKET_WALL.startZ+spec.u/100),s(spec.w/100,depth,spec.h/100),HALL_BASKET_WALL.rotation,round((spec.y-spec.h/2)/100),[
      'Alle 10 Teile auf derselben weißen Eingangswand, einschließlich der offenen Wand neben der TEJO-Sitzbank; Mittelpunkt '+spec.y+' cm über Boden, '+spec.u+' cm von der Eingangszarge in Richtung Garderobe.',
      'Eine Packung; Schalter und Gegensprechanlage bleiben frei. Blatt-Zweitmaß und nicht ausgewiesene Tiefen sind Modellannahmen; Montage vor Ort prüfen.',
    ]);
    return {...target,metadata:{...target.metadata,source:'Temu Art. '+HALL_BASKET_ARTICLE_ID+' · SKU 107311636987647 · Nutzer-Produktbild',confidence:'estimated' as const}};
  });
}

/** User-selected AliExpress wall pockets. Only width and height are confirmed
 * by the supplied dimension photograph; depth and mounting heights are estimates. */
export const HALL_VASE_REFERENCE=Object.freeze({articleId:'1005009477769018',width:.07,height:.30,depth:.04,gap:.04,wallFaceZ:5.93,centerX:-1.30});
export const HALL_VASE_SPECS=[
  {id:'light',sku:'12000049222509307',label:'Helles Naturholz',fill:'Goldgelber künstlicher Weizen',wheatArticle:'606405775986248',visibleWheatHeight:.19,x:-1.355,elevation:.90},
  {id:'brown',sku:'12000049222509306',label:'Haselnussbraun',fill:'Cremefarbener künstlicher Weizen',wheatArticle:'606886610979660',visibleWheatHeight:.21,x:-1.245,elevation:.84},
] as const;
export function hallVaseDecor():PlannerBuiltIn[]{
  const v=HALL_VASE_REFERENCE;
  return HALL_VASE_SPECS.map(spec=>{
    const target=hall('builtin-hall-wall-vase-'+spec.id,'Vorraum · Wandvase '+spec.label+' · 7 × 30 cm',spec.x,v.wallFaceZ+.001+v.depth/2,s(v.width,v.depth,v.height),0,spec.elevation,[
      'Breite 7 cm und Höhe 30 cm laut Nutzer-Maßbild; Tiefe 4 cm ist eine Planungsannahme. Zwischen WC und Abstellraum, 4 cm horizontaler Abstand und 6 cm Höhenversatz.',
      'Füllung: '+spec.fill+' · Temu Art. '+spec.wheatArticle+' · lockerer Strauß mit ca. '+Math.round(spec.visibleWheatHeight*100)+' cm sichtbarem Überstand; Stiellänge und Einstecktiefe vor Ort anpassen. Separates Set in der Einkaufsliste.',
      'Farbzuordnung nach der vom Nutzer angegebenen Variantenreihenfolge; SKU vor Bestellung prüfen.',
    ]);
    return {...target,materialVariants:{main:'hall-vase-'+spec.id},metadata:{...target.metadata,source:'AliExpress Art. '+v.articleId+' · SKU '+spec.sku+' · Nutzer-Produktbild',confidence:'estimated' as const}};
  });
}

/** Original printed textile 40 x 60 cm; 3 cm margins are wrapped around a
 * slim, estimated backing so the piece fits the measured 38 cm clear wall. */
export const HALL_WHEAT_PRINT_REFERENCE=Object.freeze({
  articleId:'606319608216104',sku:'89726296053363',textileWidth:.40,textileHeight:.60,
  width:.34,height:.54,depth:.018,elevation:1.48,wrappedMargin:.03,
});
export function hallWheatPrint():PlannerBuiltIn{
  const a=HALL_WHEAT_PRINT_REFERENCE,v=HALL_VASE_REFERENCE;
  const target=hall('builtin-hall-wheat-print','Vorraum · Weizenähren-Bild auf Textil · 40 × 60 cm · sichtbare Fläche 34 × 54 cm',
    v.centerX,v.wallFaceZ+.001+a.depth/2,s(a.width,a.depth,a.height),0,a.elevation,[
      'Temu Handtuch mit einseitigem Weizenährenmotiv, Originalmaß 40 × 60 cm laut Nutzerfoto. Motiv nach dem Foto rekonstruiert.',
      'Das lichte Wandfeld misst ca. 38 cm. Planung: an allen vier Kanten 3 cm nach hinten umschlagen; sichtbare Fläche 34 × 54 cm, seitlich je 2 cm Platz. Unterkonstruktion nicht im Artikelpreis enthalten.',
      'Bildunterkante 148 cm, Oberkante 202 cm über Boden. Rund 9 cm Abstand zum höchsten Weizenstrauß. Montagehöhe und 1,8 cm Unterkonstruktion als Planungsannahmen.',
    ]);
  return {...target,materialVariants:{main:'hall-wheat-print'},metadata:{...target.metadata,source:'Temu Art. '+a.articleId+' · SKU '+a.sku+' · Nutzer-Produktbild',confidence:'estimated'}};
}

/** Pure and idempotent: unrelated furniture, room boundaries and appliances remain. */
export function refineRoomLayout<T extends {id:string;builtIns:PlannerBuiltIn[];placements?:PlannerPlacement[]}>(document:T):T{
  if(document.id!=='wohnung-v3')return document;
  document=upgradeZimmer1EntryGold(document);
  const activeHallDecor=[...hallBasketDecor(),...hallVaseDecor(),hallWheatPrint()];
  const hallIds=new Set(activeHallDecor.map(item=>item.id));
  let changed=false;const builtIns:PlannerBuiltIn[]=[];
  for(const item of document.builtIns){
    if(REMOVED_INTERIOR_IDS.has(item.id)||(item.id.startsWith('builtin-hall-woven-basket-')&&!hallIds.has(item.id))){changed=true;continue;}
    const update=INTERIOR_UPDATES[item.id];
    if(!update){builtIns.push(item);continue;}
    const next={...item,...update};
    if(JSON.stringify(next)===JSON.stringify(item))builtIns.push(item);else{builtIns.push(next);changed=true;}
  }
  for(const target of activeHallDecor){const index=builtIns.findIndex(item=>item.id===target.id);
    if(index<0){builtIns.push(structuredClone(target));changed=true;}
    else if(JSON.stringify(builtIns[index])!==JSON.stringify(target)){builtIns[index]=structuredClone(target);changed=true;}}
  return changed?{...document,builtIns}:document;
}
