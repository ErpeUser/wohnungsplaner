'use client';

import { getInteriorMaterial } from './interior-materials.ts';

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

function DriedStems({height,brown}:{height:number;brown:boolean}){
  const grain=getInteriorMaterial(brown?'hall-vase-oat':'hall-vase-wheat');
  const lengths=[.152,.172,.139,.162,.146];
  return <group name={brown?'cream-dried-oats':'natural-wheat'} position={[0,height/2-.012,0]}>
    {lengths.map((length,i)=><group key={i} position={[(i-2)*.006,0,((i%2)*2-1)*.005]} rotation={[.04*(i%2),0,(2-i)*.09]}>
      <mesh position={[0,length/2,0]} material={grain} castShadow><cylinderGeometry args={[.0007,.0009,length,5]}/></mesh>
      {brown ? Array.from({length:4},(_,j)=>{
        const side=j%2===0?-1:1;
        const y=length-.008-j*.014;
        return <group key={j} position={[0,y,0]}>
          <mesh position={[side*.006,.002,0]} rotation={[0,0,-side*1.05]} material={grain}><cylinderGeometry args={[.00045,.00045,.014,4]}/></mesh>
          <mesh position={[side*.012,.0005,0]} rotation={[0,0,side*.4]} scale={[.003,.007,.002]} material={grain}><sphereGeometry args={[1,6,5]}/></mesh>
        </group>;
      }) : Array.from({length:6},(_,j)=>[-1,1].map(side=>
        <mesh key={j+':'+side} position={[side*.0028,length-.028+j*.0045,0]} rotation={[0,0,-side*.42]} scale={[.0026,.0048,.0022]} material={grain} castShadow><sphereGeometry args={[1,6,5]}/></mesh>
      ))}
    </group>)}
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
