'use client';
import {useEffect,useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {RoundedBoxGeometry} from 'three-stdlib';
import {BufferGeometry,Float32BufferAttribute,Uint32BufferAttribute,Shape,Vector2} from 'three';
import type {PlannerBuiltIn} from '../domain/types.ts';
import type {SceneObject} from './scene-model.ts';
import {HALL_REFERENCE,hookCenters,KITCHEN_REFERENCE,INTERIOR_REVISION} from '../domain/room-refinement.ts';
import {createWaffleSurface,createWaffleFringe,WAFFLE_FRINGE,createKitchenTiles,worktopSlabs,sinkProfile,baseShellPanels,type InteriorMesh} from './interior-geometry.ts';
import {getInteriorMaterial as material} from './interior-materials.ts';
type Item=SceneObject<PlannerBuiltIn>;
type Triple=[number,number,number];
const MODEL_IDS=new Set(['bath-mat','wc-mat','bath-towel-hooks-wood-black','wc-paper-holder','hall-tejo-art-plates','hall-between-door-decor','kitchen-sink','kitchen-base','kitchen-corner-base','kitchen-worktop','kitchen-upper','kitchen-corner-upper','kitchen-backsplash-oak','floor-zone-kitchen']);
export function hasRefinedInteriorModel(item:Item){return MODEL_IDS.has(item.catalogId)&&Boolean(item.source.metadata?.notes?.includes(INTERIOR_REVISION));}
function useBufferGeometry(data:InteriorMesh){
  const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(data.positions,3));g.setAttribute('normal',new Float32BufferAttribute(data.normals,3));g.setAttribute('uv',new Float32BufferAttribute(data.uvs,2));if(data.colors)g.setAttribute('color',new Float32BufferAttribute(data.colors,3));g.setIndex(new Uint32BufferAttribute(data.indices,1));g.computeBoundingBox();g.computeBoundingSphere();return g;},[data]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);return geometry;
}
function Block({size,position=[0,0,0],finish='carcass',radius=.002}:{size:Triple;position?:Triple;finish?:string;radius?:number}){
  return <RoundedBox args={size} radius={Math.min(radius,...size.map(v=>v/3))} smoothness={3} position={position} castShadow receiveShadow><primitive object={material(finish)} attach="material"/></RoundedBox>;
}
function Handle({position,width=.128,vertical=false}:{position:Triple;width?:number;vertical?:boolean}){
  return <group position={position} rotation={[0,0,vertical?Math.PI/2:0]}><Block size={[width,.009,.012]} finish="steel" radius={.004}/>{[-1,1].map(side=><Block key={side} position={[side*(width/2-.01),0,-.009]} size={[.008,.008,.018]} finish="steel"/>)}</group>;
}
export function RefinedInteriorModel({item}:{item:Item}){
  switch(item.catalogId){
    case 'bath-mat':case 'wc-mat':return <WaffleMat item={item}/>;
    case 'bath-towel-hooks-wood-black':return <Style2Hooks item={item}/>;
    case 'wc-paper-holder':return <WoodPaperHolder/>;
    case 'hall-tejo-art-plates':return <HallArtPlates/>;
    case 'hall-between-door-decor':return <HallBetweenDoors/>;
    case 'kitchen-sink':return <KitchenSink item={item}/>;
    case 'kitchen-base':return <KitchenBase item={item}/>;
    case 'kitchen-corner-base':return <KitchenCornerBase item={item}/>;
    case 'kitchen-worktop':return <KitchenWorktop item={item}/>;
    case 'kitchen-upper':return <KitchenUpper item={item}/>;
    case 'kitchen-corner-upper':return <KitchenCornerUpper item={item}/>;
    case 'kitchen-backsplash-oak':return <Block size={item.size} finish="backsplash-wood" radius={.002}/>;
    case 'floor-zone-kitchen':return <KitchenTiles item={item}/>;
    default:return null;
  }
}
export function WaffleMat({item}:{item:Item}){
  const [w,h,d]=item.size,bodyW=w-2*WAFFLE_FRINGE,bodyD=d-2*WAFFLE_FRINGE;
  const data=useMemo(()=>createWaffleSurface(bodyW,bodyD,h),[bodyW,bodyD,h]),geometry=useBufferGeometry(data);
  const fringe=useMemo(()=>createWaffleFringe(w,d,h),[w,d,h]),fringeGeometry=useBufferGeometry(fringe);
  return <group name={"physical-waffle-"+item.id}>
    <Block size={[bodyW,h*.24,bodyD]} position={[0,-h*.38,0]} finish="cotton-edge" radius={.002}/>
    <mesh geometry={geometry} material={material("cotton")} castShadow receiveShadow dispose={null}/>
    <mesh name="woven-fringes" geometry={fringeGeometry} material={material("cotton-fringe")} castShadow receiveShadow dispose={null}/>
  </group>;
}
function Style2Hooks({item}:{item:Item}){
  // Style2's four individual round wooden discs have a vertical natural grain,
  // darkened cut edges and short black stems with a gently tilted oval stop.
  // The existing 20-cm spacing and assumed 12-cm diameter stay unchanged.
  const plateMaterials=useMemo(()=>[material('bath-hook-style2-edge'),material('bath-hook-style2-wood'),material('bath-hook-style2-wood')],[]);
  const black=material('bath-hook-style2-black');
  return <group name="four-style2-hooks-horizontal-row">{hookCenters(item.size[0]).map((x,index)=><group key={index} name={'style2-hook-'+index} position={[x,0,0]}>
    <mesh name="style2-round-natural-wood" position={[0,0,-.033]} rotation={[Math.PI/2,0,0]} material={plateMaterials} castShadow receiveShadow><cylinderGeometry args={[.058,.06,.014,48]}/></mesh>
    <mesh name="style2-black-stem" position={[0,-.006,.002]} rotation={[Math.PI/2,0,0]} material={black} castShadow><cylinderGeometry args={[.010,.010,.055,24]}/></mesh>
    <mesh name="style2-black-oval" position={[0,.004,.032]} rotation={[-.22,0,-.19]} scale={[1,1,.22]} material={black} castShadow receiveShadow><capsuleGeometry args={[.021,.027,8,24]}/></mesh>
  </group>)}</group>;
}
function WoodPaperHolder(){
  // RoundedBoxGeometry has normalized face UVs; assign the real face grain only
  // to the horizontal surfaces and the separate darker photo grain to edges.
  const shelfGeometry=useMemo(()=>{
    const geometry=new RoundedBoxGeometry(.1699,.021,.1397,3,.004);
    if(geometry.groups.length!==6) throw new Error("Unexpected rounded shelf face groups");
    geometry.groups.forEach((group,index)=>{group.materialIndex=index===2||index===3?0:1;});
    return geometry;
  },[]);
  useEffect(()=>()=>shelfGeometry.dispose(),[shelfGeometry]);
  const shelfMaterials=useMemo(()=>[material('wc-paper-holder-wood'),material('wc-paper-holder-edge')],[]);
  // The supplied AliExpress reference shows two staggered 16.99 x 13.97 cm
  // shelves, a 14.98 cm arm and a 9.39 cm matte-black connecting bracket.
  // Whole-object depth, envelope and mounting height are still estimates.
  const tail=useMemo(()=>{const g=new BufferGeometry(),positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let j=0;j<=16;j++)for(let i=0;i<2;i++){const t=j/16;positions.push(.078+(i-.5)*.102,-.019-t*.048,.055+Math.sin(t*Math.PI)*.006);uv.push(i,1-t);}
    for(let j=0;j<16;j++){const a=j*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;},[]);
  useEffect(()=>()=>tail.dispose(),[tail]);
  return <group name="aliexpress-dark-oak-two-tier-paper-holder">
    {/* The two rounded shelves remain within the 15-cm planned height. */}
    <mesh name="photo-grain-upper-wood-shelf" geometry={shelfGeometry} material={shelfMaterials} position={[.075,.058,0]} castShadow receiveShadow dispose={null}/>
    <mesh name="photo-grain-lower-wood-shelf" geometry={shelfGeometry} material={shelfMaterials} position={[-.075,-.058,0]} castShadow receiveShadow dispose={null}/>
    {/* Steel support reaches the underside of the upper board. */}
    <Block size={[.020,.0939,.022]} position={[.002,-.001,-.017]} finish="black-iron" radius={.003}/>
    <Block size={[.1498,.011,.012]} position={[.078,-.006,.008]} finish="black-iron" radius={.003}/>
    <Block size={[.008,.022,.011]} position={[.151,-.002,.008]} finish="black-iron" radius={.002}/>
    {/* The white paper roll hangs below the shelf without cutting through it. */}
    <mesh position={[.078,-.006,.008]} rotation={[0,0,Math.PI/2]} castShadow receiveShadow>
      <cylinderGeometry args={[.049,.049,.105,40,1,true]}/>
      <primitive object={material('paper')} attach="material"/>
    </mesh>
    <mesh position={[.078,-.006,.008]} rotation={[0,0,Math.PI/2]}>
      <cylinderGeometry args={[.016,.016,.106,24,1,true]}/>
      <primitive object={material('core')} attach="material"/>
    </mesh>
    {[-1,1].map(side=><mesh key={side} position={[.078+side*.0525,-.006,.008]} rotation={[0,side*Math.PI/2,0]} castShadow>
      <ringGeometry args={[.016,.049,40]}/><primitive object={material('paper')} attach="material"/>
    </mesh>)}
    <mesh geometry={tail} material={material('paper')} castShadow receiveShadow dispose={null}/>
    {[.041,-.040].map(y=><Block key={y} position={[0,y,-.068]} size={[.03,.027,.007]} finish="black-iron"/>)}
  </group>;
}
function FramedPrint({width,height,kind='arches'}:{width:number;height:number;kind?:'pampas'|'arches'}){
  const frame=.018;return <group>
    <Block size={[width,height,.018]} position={[0,0,-.005]} finish="wood"/>
    <mesh position={[0,0,.005]}><planeGeometry args={[width-2*frame,height-2*frame]}/><primitive object={material('paper')} attach="material"/></mesh>
    <mesh position={[0,0,.006]}><planeGeometry args={[width-2*frame-.02,height-2*frame-.02]}/><primitive object={material(kind)} attach="material"/></mesh>
    {[-1,1].map(side=><Block key={`side-${side}`} position={[side*(width-frame)/2,0,.008]} size={[frame,height,.018]} finish="wood"/>)}
    {[-1,1].map(side=><Block key={`end-${side}`} position={[0,side*(height-frame)/2,.008]} size={[width-2*frame,frame,.018]} finish="wood"/>)}
  </group>;
}
function WallPlate({diameter,finish}:{diameter:number;finish:string}){
  const r=diameter/2,profile=useMemo(()=>[new Vector2(0,-.003),new Vector2(r*.72,-.002),new Vector2(r*.92,.002),new Vector2(r,.006),new Vector2(r*.99,.009)],[r]);
  return <group><mesh rotation={[Math.PI/2,0,0]} castShadow receiveShadow><latheGeometry args={[profile,48]}/><primitive object={material(finish)} attach="material"/></mesh>{Array.from({length:12},(_,i)=><mesh key={i} position={[0,0,.006+i*.00013]}><torusGeometry args={[r*(.13+i*.073),.0008,4,48]}/><primitive object={material(finish)} attach="material"/></mesh>)}</group>;
}
function HallArtPlates(){return <group name="hall-art-and-three-plates">
  <group position={[0,.25,-.005]}><FramedPrint {...HALL_REFERENCE.tejoPrint} kind="pampas"/></group>
  <group position={[-.06,-.30,0]}><WallPlate diameter={.18} finish="basket-sand"/></group>
  <group position={[.03,-.12,0]}><WallPlate diameter={.14} finish="basket-light"/></group>
  <group position={[-.11,-.475,0]}><WallPlate diameter={.11} finish="basket-brown"/></group>
</group>;}
function WallPlanter(){
  const leaf=useMemo(()=>{const s=new Shape();s.moveTo(0,-.5);s.bezierCurveTo(-.42,-.18,-.35,.28,0,.5);s.bezierCurveTo(.35,.28,.42,-.18,0,-.5);return s;},[]);
  const rim=useMemo(()=>[new Vector2(.102,-.055),new Vector2(.116,-.045),new Vector2(.125,-.026),new Vector2(.125,.01),new Vector2(.118,.017),new Vector2(.110,.006)],[]);
  return <group name="wall-planter-diameter-25cm">
    <mesh rotation={[Math.PI/2,0,0]} castShadow receiveShadow><latheGeometry args={[rim,48]}/><primitive object={material('ceramic')} attach="material"/></mesh>
    <mesh position={[0,0,-.035]}><circleGeometry args={[.112,40]}/><primitive object={material('ceramic')} attach="material"/></mesh>
    <mesh position={[0,-.046,-.004]} scale={[1,.55,1]} castShadow><circleGeometry args={[.108,40]}/><primitive object={material('soil')} attach="material"/></mesh>
    {Array.from({length:20},(_,i)=>{const x=Math.sin(i*2.399)*(.025+(i%5)*.016),y=-.065+Math.cos(i*2.399)*.024;return <mesh key={`pebble-${i}`} position={[x,y,.009+(i%3)*.004]} scale={[.011+(i%3)*.002,.008,.007]} castShadow><sphereGeometry args={[1,8,6]}/><primitive object={material(i%2?'ceramic':'basket-light')} attach="material"/></mesh>;})}
    {[-.07,-.034,0,.039,.07].map((base,index)=><group key={index} position={[base,-.022,0]} rotation={[.08,(index-2)*.18,(index-2)*-.16]}>
      <mesh position={[0,.09,0]} castShadow><cylinderGeometry args={[.0009,.0014,.21,8]}/><primitive object={material('stem')} attach="material"/></mesh>
      {Array.from({length:7},(_,j)=>[-1,1].map(side=><mesh key={`${j}-${side}`} position={[side*(.012+j*.001),.015+j*.024,.005+index*.002]} rotation={[-.14,side*.25,side*-.85]} scale={[.025-j*.001,.052-j*.003,1]} castShadow><shapeGeometry args={[leaf]}/><primitive object={material(j%2?'leaf':'leaf-light')} attach="material"/></mesh>))}
    </group>)}
  </group>;
}
function HallBetweenDoors(){return <group name="hall-frame-and-25cm-planter"><group position={[0,.235,-.06]}><FramedPrint {...HALL_REFERENCE.betweenDoorsPrint}/></group><group position={[0,-.315,-.005]}><WallPlanter/></group></group>;}
function KitchenTiles({item}:{item:Item}){
  const [w,,d]=item.size,[x,,z]=item.position,data=useMemo(()=>createKitchenTiles(w,d,x,z,KITCHEN_REFERENCE.tilePitch,KITCHEN_REFERENCE.tileGrout),[w,d,x,z]),geometry=useBufferGeometry(data);
  return <group name={`kitchen-continuous-grid-${item.id}`}><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.001,0]} receiveShadow><planeGeometry args={[w,d]}/><primitive object={material('grout')} attach="material"/></mesh><mesh geometry={geometry} material={material('tile')} receiveShadow dispose={null}/></group>;
}
function KitchenWorktop({item}:{item:Item}){
  const [w,h,d]=item.size,hole=item.id==='builtin-kitchen-worktop-north'?{x:-.2845,z:-.0015,width:.49,depth:.39}:undefined;
  return <group name={`40mm-worktop-${item.id}`}>{worktopSlabs(w,d,hole).map((slab,i)=><Block key={i} size={[slab.width,h,slab.depth]} position={[slab.x,0,slab.z]} finish="worktop" radius={.0015}/>)}</group>;
}
function BaseShell({width,height,depth,lid=true}:{width:number;height:number;depth:number;lid?:boolean}){
  return <group><Block size={[width-.015,.12,depth-.08]} position={[0,-height/2+.06,-.035]} finish="plinth"/>{baseShellPanels(width,height,depth,lid).map(panel=><Block key={panel.id} size={panel.size} position={panel.position}/>)}</group>;
}
function Front({x,width,height,depth,drawers=false,vertical=false}:{x:number;width:number;height:number;depth:number;drawers?:boolean;vertical?:boolean}){
  const top=height/2-.004,bottom=-height/2+.124;
  if(!drawers)return <group><Block size={[width-.004,top-bottom,.019]} position={[x,(top+bottom)/2,depth/2-.0095]} finish="white-front"/><Handle position={[x,vertical?(top+bottom)/2:top-.05,depth/2+.014]} vertical={vertical}/></group>;
  const heights=[.145,.285,top-bottom-.145-.285-.008];
  return <group>{heights.map((h,i)=>{const y=top-heights.slice(0,i).reduce((sum,v)=>sum+v+.004,0)-h/2;return <group key={i}><Block size={[width-.004,h,.019]} position={[x,y,depth/2-.0095]} finish="white-front"/><Handle position={[x,y+h/2-.045,depth/2+.014]}/></group>;})}</group>;
}
function KitchenBase({item}:{item:Item}){
  const [w,h,d]=item.size,north=item.id==='builtin-kitchen-base-north',widths=north?[.6,.016]:[.45,.15,.6,.6,.112];
  return <group name={`measured-kitchen-base-${item.id}`}><BaseShell width={w} height={h} depth={d}/>{widths.map((width,i)=>{const x=-w/2+widths.slice(0,i).reduce((a,b)=>a+b,0)+width/2;
    if(!north&&i===2)return <group key={i}><Block size={[width-.008,.104,.019]} position={[x,-h/2+.172,d/2-.0095]} finish="white-front"/><Handle position={[x,-h/2+.18,d/2+.014]}/></group>;
    if(width<.12)return <Block key={i} size={[width-.003,h-.12,.019]} position={[x,.06,d/2-.0095]} finish="white-front"/>;
    return <Front key={i} x={x} width={width} height={h} depth={d} drawers={!north&&(i===0||i===3)} vertical={!north&&i===1}/>;
  })}</group>;
}
function KitchenCornerBase({item}:{item:Item}){
  const [w,h,d]=item.size;
  return <group name="blind-sink-corner-115x65">
    <group position={[0,0,-.0235]}><BaseShell width={w} height={h} depth={.603} lid={false}/></group>
    <Block size={[.603,h,.047]} position={[-w/2+.3015,0,d/2-.0235]} finish="carcass"/>
    <Block size={[.543,h-.12,.019]} position={[w/2-.2735,.06,d/2-.047-.0095]} finish="white-front"/>
    <Handle position={[w/2-.2735,h/2-.05,d/2-.047+.014]}/>
    <Block size={[.016,h-.12,.047]} position={[.028,.06,d/2-.0235]} finish="white-front"/>
  </group>;
}
function KitchenUpper({item}:{item:Item}){
  const [w,h,d]=item.size,north=item.id==='builtin-kitchen-upper-north',widths=north?[.3,.4,.6,.016]:[w];
  return <group name={`measured-wall-cabinet-${item.id}`}>
    <Block size={[w,.016,d]} position={[0,-h/2+.008,0]}/><Block size={[w,.016,d]} position={[0,h/2-.008,0]}/>
    {[-1,1].map(side=><Block key={side} size={[.016,h,d]} position={[side*(w-.016)/2,0,0]}/>)}<Block size={[w,h,.016]} position={[0,0,-d/2+.008]}/>
    {widths.map((width,i)=>{const x=-w/2+widths.slice(0,i).reduce((a,b)=>a+b,0)+width/2,microwave=north&&i===2,frontHeight=microwave?.365:h-.006,y=microwave?(h-.365)/2:0;return <group key={i}>
      <Block size={[width-.004,frontHeight,.019]} position={[x,y,d/2-.0095]} finish="white-front"/>
      {width>.1?<Handle position={[x,y-frontHeight/2+.045,d/2+.014]}/>:null}
      {microwave?<Block size={[width,.016,d]} position={[x,-.008,0]}/>:null}
    </group>;})}
  </group>;
}
function KitchenCornerUpper({item}:{item:Item}){
  const [,h]=item.size;return <group name="L-corner-wall-cabinet-no-overlap">
    <Block size={[.35,h,.9]} position={[-.05,0,0]} finish="carcass"/><Block size={[.10,h,.35]} position={[.175,0,-.275]} finish="carcass"/>
    <group position={[.135,0,.175]} rotation={[0,Math.PI/2,0]}><Block size={[.546,h-.006,.019]} finish="white-front"/><Handle position={[0,-h/2+.05,.022]}/></group>
    <Block size={[.096,h-.006,.019]} position={[.175,0,-.091]} finish="white-front"/>
  </group>;
}
function KitchenSink({item}:{item:Item}){
  const [w,h,d]=item.size,profile=sinkProfile(w,d,h),rim=.018,top=profile.rimY;
  return <group name="recessed-stainless-sink-with-real-cutout">
    {[-1,1].map(side=><group key={side}>
      <Block size={[w,.004,rim]} position={[0,top,side*(d-rim)/2]} finish="steel"/><Block size={[rim,.004,d-2*rim]} position={[side*(w-rim)/2,top,0]} finish="steel"/>
      <Block size={[.004,profile.wallHeight,profile.bowlDepth]} position={[side*profile.bowlWidth/2,0,0]} finish="steel"/><Block size={[profile.bowlWidth,profile.wallHeight,.004]} position={[0,0,side*profile.bowlDepth/2]} finish="steel"/>
    </group>)}
    <Block size={[profile.bowlWidth,.008,profile.bowlDepth]} position={[0,profile.bottomY,0]} finish="steel" radius={.003}/>
    <mesh position={[0,profile.bottomY+.005,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.013,.022,24]}/><primitive object={material('black-iron')} attach="material"/></mesh>
    <mesh position={[w*.33,top+.08,-d*.34]} castShadow><cylinderGeometry args={[.014,.017,.16,20]}/><primitive object={material('steel')} attach="material"/></mesh>
    <mesh position={[w*.33,top+.16,-d*.34+.055]} rotation={[0,Math.PI/2,0]} castShadow><torusGeometry args={[.055,.011,10,24,Math.PI]}/><primitive object={material('steel')} attach="material"/></mesh>
  </group>;
}
