import type {PlannerBuiltIn,PlannerMetadata} from './types.ts';

export const INTERIOR_REVISION='interior-refinement-2026-11-11';
export const FINISHED_FLOOR_Y=.012;
export const KITCHEN_REFERENCE=Object.freeze({
  originX:.06,originZ:3.53,northRun:2.425,westRun:2.562,plinth:.12,carcass:.75,
  worktopThickness:.04,worktopTop:.91,backsplashHeight:.56,upperBottom:1.47,upperHeight:.75,
  endPanel:.016,cabinetNorthEnd:1.766,nicheStart:1.768,nicheWidth:.657,worktopDepth:.603,
  // Prior project floor reference; NOT a dimension from the supplier PDF.
  tilePitch:.32,tileGrout:.002,
});
export const HALL_REFERENCE=Object.freeze({
  tejoPrint:{width:.36,height:.50},plateDiameters:[.18,.14,.11] as readonly number[],
  betweenDoorsPrint:{width:.32,height:.45},planterDiameter:.25,clearDoorGap:.38,
});
export const REMOVED_INTERIOR_IDS=new Set(['builtin-hall-wall-decor','builtin-kitchen-backsplash-corner']);
export function hookCenters(width:number):number[]{
  if(!Number.isFinite(width)||width<.48)throw new RangeError('Four hooks need at least 48 cm.');
  return Array.from({length:4},(_,i)=>-width/2+.06+i*(width-.12)/3);
}
export function kitchenModuleWidths():number[]{return [.45,.15,.6,.6,.112,.65];}
const kitchenEvidence:PlannerMetadata={source:'BD19929-2.PDF, S. 1-4; Nutzerauftrag',confidence:'estimated',notes:[INTERIOR_REVISION,
  'Bestaetigte Planmasse: 2425/2562 mm Zeilen; Sockel 120, Korpus 750, Arbeitsplatte 40, Rueckwand 560 mm; Oberschraenke UK 1470 / OK 2220 mm.',
  'Nordkette 1766 + 659 bzw. 1768 + 657 mm: 2 mm Plan-/Anschlusstoleranz. Keine erfundene dickere Abschlusswange.',
  'Vorhandene lichte Nordbreite 2380 mm weicht 45 mm vom Lieferplan ab. Module bleiben masshaltig; 600-mm-Kuehlschrank wird ohne Wanddurchdringung eingepasst. Verbindliches Raumaufmass bleibt offen.']};
const bathEvidence:PlannerMetadata={source:'Nutzer-Massbild; Temu Art. 606121368598635',confidence:'confirmed',notes:[INTERIOR_REVISION,
  '122 x 61 cm bzw. 77 x 46 cm; Hoehe 1 cm laut Massbild. Position und Ausrichtung nach Nutzerauftrag.']};
type Update=Partial<PlannerBuiltIn>;
const p=(x:number,z:number)=>({x,z});
const s=(width:number,depth:number,height:number)=>({width,depth,height});
const k=(update:Update):Update=>({...update,elevation:(update.elevation??0)+FINISHED_FLOOR_Y,metadata:kitchenEvidence});
export const INTERIOR_UPDATES:Readonly<Record<string,Update>>={
  'builtin-bath-mat':{position:p(-1.25,8.99),size:s(1.22,.61,.01),rotation:90,elevation:.0125,collision:'decorative',materialVariants:{main:'temu-bath-rug-woven'},metadata:bathEvidence,label:'Badteppich · beige Waffelstruktur · 122 × 61 cm · am Waschbecken'},
  'builtin-wc-mat':{position:p(-1.97,5.15),size:s(.77,.46,.01),rotation:90,elevation:.0125,collision:'decorative',materialVariants:{main:'temu-bath-rug-woven'},metadata:bathEvidence,label:'WC-Teppich · beige Waffelstruktur · 77 × 46 cm · längs vor dem WC'},
  'builtin-bath-towel-hook-rail':{position:p(-.20,8.82),size:s(.72,.09,.12),rotation:90,elevation:1.49,catalogId:'bath-towel-hooks-wood-black',materialVariants:{main:'bath-hook-oak-natural'},collision:'decorative',label:'4 einzelne Rundhaken · Naturholz / Schwarz · nebeneinander',metadata:{source:'Temu Art. 607039887632432; SKU 118446205486445; 4er-Pack',confidence:'estimated',notes:[INTERIOR_REVISION,'Vier einzelne Haken auf einer Hoehe, Achsabstand 20 cm; Mittelpunkt 155 cm ueber Boden. Scheibendurchmesser 12 cm und Montagemasse sind Darstellungsannahmen.']}},
  'builtin-wc-paper-holder':{position:p(-2.285,4.88),rotation:270,size:s(.33,.15,.25),elevation:.68,catalogId:'wc-paper-holder',materialVariants:{main:'wc-holder-solid-oak'},collision:'decorative',label:'Naturholz-Papierhalter · gegenüberliegende WC-Wand',metadata:{source:'Temu Art. 601100249492431; SKU 17595354506975; Nutzerbild',confidence:'estimated',notes:[INTERIOR_REVISION,'Holzbrett 17 × 14 cm, Papierarm 15 cm, Verbindungssteg 9 cm laut Massbild. Gegenueberliegende Seitenwand, nach innen orientiert; Gesamtmass und Montagehoehe geschaetzt.']}},
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
  'builtin-kitchen-tile-north':{position:p(1.25,4.225),size:s(2.38,1.39,.003),rotation:0,elevation:.0122,collision:'decorative',metadata:{...kitchenEvidence,notes:[...(kitchenEvidence.notes??[]),'Unbemasste L-Bodenzone an bestehende lichte Wandbreite geclippt. 32-cm-Fliesenraster und 2-mm-Fugen sind als Visualisierungsannahme gekennzeichnet.']}},
  'builtin-kitchen-tile-west':{position:p(.665,5.506),size:s(1.21,1.172,.003),rotation:0,elevation:.0122,collision:'decorative',metadata:{...kitchenEvidence,notes:[...(kitchenEvidence.notes??[]),'Durchlaufendes 32-cm-Raster; Bodenzone im Lieferplan nicht bemasst.']}},
};
function hall(id:string,label:string,x:number,z:number,size:PlannerBuiltIn['size'],rotation:number,elevation:number,notes:string[]):PlannerBuiltIn{
  return {id,label,catalogId:id.replace('builtin-',''),roomId:'vorraum',kind:'other',locked:true,position:p(x,z),size,rotation,elevation,collision:'decorative',materialVariants:{main:'oak-light'},metadata:{source:'Nutzerreferenzen; herstellerneutrale Deko-Planung',confidence:'estimated',notes:[INTERIOR_REVISION,...notes]}};
}
export const HALL_DECOR:readonly PlannerBuiltIn[]=[
  hall('builtin-hall-tejo-art-plates','Vorraum · Bild 36 × 50 cm und Wandteller Ø 18 / 14 / 11 cm',-2.33,7.52,s(.40,.055,1.10),270,1.07,['Bildmitte 187 cm; Wandteller darunter versetzt. 40-cm-Wandfeld endet vor Tejo bei z=7.72 m. Gegensprechanlage und Schalter bleiben frei.']),
  hall('builtin-hall-between-door-decor','Vorraum zwischen Türen · Bild 32 × 45 cm und Wandpflanzgefäß Ø 25 cm',-1.30,6.012,s(.32,.16,.97),0,1.08,['Topfdurchmesser genau 25 cm. Bildbreite 32 cm passt in das rund 38-cm-Feld zwischen den Zargen. Bildmitte 180 cm; Topfmitte 125 cm. Echte Raumgeometrie statt Fotoebene.']),
];
/** Pure and idempotent: unrelated furniture, room boundaries and appliances remain. */
export function refineRoomLayout<T extends {id:string;builtIns:PlannerBuiltIn[]}>(document:T):T{
  if(document.id!=='wohnung-v3')return document;
  let changed=false;const builtIns:PlannerBuiltIn[]=[];
  for(const item of document.builtIns){
    if(REMOVED_INTERIOR_IDS.has(item.id)){changed=true;continue;}
    const update=INTERIOR_UPDATES[item.id];
    if(!update){builtIns.push(item);continue;}
    const next={...item,...update};
    if(JSON.stringify(next)===JSON.stringify(item))builtIns.push(item);else{builtIns.push(next);changed=true;}
  }
  for(const target of HALL_DECOR){const index=builtIns.findIndex(item=>item.id===target.id);
    if(index<0){builtIns.push(structuredClone(target));changed=true;}
    else if(JSON.stringify(builtIns[index])!==JSON.stringify(target)){builtIns[index]=structuredClone(target);changed=true;}}
  return changed?{...document,builtIns}:document;
}
