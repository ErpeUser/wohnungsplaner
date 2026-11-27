'use client';

import { getInteriorMaterial } from './interior-materials.ts';
import { HALL_VASE_SPECS, HALL_WHEAT_PRINT_REFERENCE } from '../domain/room-refinement.ts';

type Size=[number,number,number];

/** Physical wooden pocket; dried decoration is separate from the product dimensions. */
export function hallVasePanels(size:Size) {
  const [w,h,d]=size;
  const t=.007;
  return [
    {id:'back',size:[w,h,t] as Size,position:[0,0,-(d-t)/2] as Size},
    {id:'front',size:[w,h,t] as Size,position:[0,0,(d-t)/2] as Size},
    {id:'left',size:[t,h,d-2*t] as Size,position:[-(w-t)/2,0,0] as Size},
    {id:'right',size:[t,h,d-2*t] as Size,position:[(w-t)/2,0,0] as Size},
    {id:'base',size:[w-2*t,t,d-2*t] as Size,position:[0,-(h-t)/2,0] as Size},
  ];
}

/** Each actual product is a loose bundle of artificial wheat ears, not oats.
 * The visible height is a styling target; actual stems can be inserted or cut. */
function DriedStems({height,brown}:{height:number;brown:boolean}){
  const variant=HALL_VASE_SPECS.find(spec=>spec.id===(brown?'brown':'light'))!;
  const finish=brown?'hall-wheat-cream':'hall-wheat-gold';
  const grain=getInteriorMaterial(finish),stem=getInteriorMaterial(finish+'-stem');
  const offsets=[.012,.025,.006,.034,0,.026,.013,.037,.019];
  return <group name={brown?'cream-artificial-wheat':'gold-artificial-wheat'} position={[0,height/2-.012,0]}>
    {offsets.map((offset,i)=>{
      const length=variant.visibleWheatHeight+.012-.021-offset;
      const ears=Array.from({length:7},(_,j)=>({y:length-.041+j*.0058,angle:j%2===0?0:Math.PI/2}));
      const awns=new Float32Array(ears.flatMap(({y,angle})=>[-1,1].flatMap(side=>{
        const x=side*.0025*Math.cos(angle),z=side*.0025*Math.sin(angle);
        return [x,y+.003,z,x*2.7,y+.021,z*2.7];
      })));
      return <group key={i} position={[(i%3-1)*.008,0,(Math.floor(i/3)-1)*.006]}
        rotation={[(Math.floor(i/3)-1)*.07,0,(1-i%3)*.14]}>
        <mesh position={[0,length/2,0]} material={stem} castShadow><cylinderGeometry args={[.0008,.001,length,6]}/></mesh>
        {ears.map(({y,angle},j)=><group key={j} position={[0,y,0]} rotation={[0,angle,0]}>
          {[-1,1].map(side=><mesh key={side} position={[side*.0024,0,0]} rotation={[0,0,-side*.36]} scale={[.0026,.0048,.0022]} material={grain} castShadow><sphereGeometry args={[1,7,5]}/></mesh>)}
        </group>)}
        <lineSegments name="wheat-awns"><bufferGeometry><bufferAttribute attach="attributes-position" args={[awns,3]}/></bufferGeometry><lineBasicMaterial color={brown?'#e1d4b5':'#c59646'}/></lineSegments>
      </group>;
    })}
  </group>;
}

/** Open-sided poster hanger: the image is not a framed panel or textile. */
export function HallWheatPrint({size}:{size:Size}){
  const [width,height,depth]=size;
  const a=HALL_WHEAT_PRINT_REFERENCE;
  const bottom=-height/2,lower=bottom+a.railHeight/2,upper=lower+a.paperHeight;
  const cordBase=upper+a.railHeight/2;
  const cordLength=Math.hypot(a.cordHalfSpan,a.cordRise);
  return <group name="custom-wheat-print-with-wooden-poster-hanger">
    <mesh name="poster-paper-30x45" position={[0,lower+a.paperHeight/2,0]} material={getInteriorMaterial('hall-wheat-print')} receiveShadow><planeGeometry args={[a.paperWidth,a.paperHeight]}/></mesh>
    {([lower,upper]).map((y,i)=><mesh key={i} name={i===0?'lower-wooden-strip':'upper-wooden-strip'} position={[0,y,0]} material={getInteriorMaterial('hall-poster-rail')} castShadow receiveShadow><boxGeometry args={[width,a.railHeight,depth]}/></mesh>)}
    {[-1,1].map(side=><mesh key={side} name="hanging-cord" position={[side*a.cordHalfSpan/2,cordBase+a.cordRise/2,-depth/4]} rotation={[0,0,side*Math.atan2(a.cordHalfSpan,a.cordRise)]} material={getInteriorMaterial('hall-poster-cord')} castShadow><cylinderGeometry args={[.0009,.0009,cordLength,8]}/></mesh>)}
  </group>;
}

export function HallWallVase({catalogId,size}:{catalogId:string;size:Size}){
  const brown=catalogId==='hall-wall-vase-brown';
  const material=getInteriorMaterial(brown?'hall-vase-brown':'hall-vase-light');
  return <group name={catalogId}>
    <group name="measured-open-top-wooden-vase">
      {hallVasePanels(size).map(panel=><mesh key={panel.id} name={panel.id} position={panel.position} material={material} castShadow receiveShadow><boxGeometry args={panel.size}/></mesh>)}
    </group>
    <DriedStems height={size[1]} brown={brown}/>
  </group>;
}
