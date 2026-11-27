import { BufferGeometry, CylinderGeometry, DataTexture, DoubleSide, Float32BufferAttribute, LatheGeometry, MeshStandardMaterial, Quaternion, RepeatWrapping, RGBAFormat, Vector2, Vector3 } from "three";
import { ZIMMER1_FICUS as ref } from "../../domain/zimmer1-ficus.ts";

type XYZ = [number, number, number];

// The two lathed profiles reconstruct the photographed bowl and its pedestal.
// Values are radii and elevations in metres, not normalized catalog units.
export const FICUS_PLANTER_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, .095], [.064, .095], [.085, .098], [.103, .106], [.117, .123],
  [.125, .145], [.129, .178], [.131, .235], [.1325, .325], [.1325, .349],
  [.131, .353], [.128, .355], [.120, .355], [.1175, .352], [.1175, .344],
  [.116, .230], [.113, .180], [.105, .144], [.088, .122], [.060, .115], [0, .115],
];
export const FICUS_PEDESTAL_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [.098, 0], [.103, .002], [.105, .007], [.104, .022],
  [.101, .053], [.096, .085], [.093, .111], [0, .111],
];

const lathe = (profile: ReadonlyArray<readonly [number, number]>) => new LatheGeometry(profile.map(([r,y])=>new Vector2(r,y)), 72);
const bowl = lathe(FICUS_PLANTER_PROFILE);
const foot = lathe(FICUS_PEDESTAL_PROFILE);
const nursery = lathe([[0,0],[.071,0],[.093,.155],[.095,.158],[.095,.165],[.088,.165],[.087,.151],[.066,.008],[0,.008]]);
const stemGeometry = new CylinderGeometry(1,1,1,9);
const soilGeometry = new CylinderGeometry(1,1,1,48);

// Fine stippled, matte resin (not a glossy ceramic glaze). Procedural texture
// keeps the product photo private and gives a repeatable, scale-aware surface.
const grit = new Uint8Array(128*128*4);
for(let i=0;i<128*128;i++){
  const n=118+((Math.imul(i+17,2654435761)>>>17)%53);
  grit.set([n,n,n,255],i*4);
}
const bump = new DataTexture(grit,128,128,RGBAFormat);
bump.wrapS=bump.wrapT=RepeatWrapping;
bump.repeat.set(10,4);
bump.needsUpdate=true;
const resin = new MeshStandardMaterial({name:"ficus-planter-matte-beige-resin",color:"#ded8ca",roughness:.93,bumpMap:bump,bumpScale:.0011});
const nurseryMaterial = new MeshStandardMaterial({color:"#303733",roughness:.86});
const soilMaterial = new MeshStandardMaterial({color:"#5c4630",roughness:1});
const branchMaterial = new MeshStandardMaterial({color:"#73694a",roughness:.88});
const twigMaterial = new MeshStandardMaterial({color:"#53623c",roughness:.81});
const leafMaterials = ["#294925","#365c2b","#466f35","#22432a","#527b39"].map(color=>new MeshStandardMaterial({color,roughness:.47,side:DoubleSide,vertexColors:true}));

// A gently cupped, broad oval leaf blade with a central crease and tapered tip.
function makeLeafGeometry(){
  const p:number[]=[],c:number[]=[],indices:number[]=[];
  const rows=12,cols=6;
  for(let i=0;i<=rows;i++){
    const t=i/rows,shape=Math.pow(Math.sin(Math.PI*t),.78);
    for(let j=0;j<=cols;j++){
      const v=2*j/cols-1;
      p.push(.5*v*shape,t,.11*Math.sin(Math.PI*t)+.12*v*v*shape);
      const vein=Math.abs(v)<.01?.96:1;
      const brightness=(.90+.10*Math.sin(Math.PI*t))*vein;
      c.push(brightness,brightness,brightness);
      if(i<rows&&j<cols){
        const a=i*(cols+1)+j,b=a+cols+1;
        indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
  }
  const geo=new BufferGeometry();
  geo.setAttribute("position",new Float32BufferAttribute(p,3));
  geo.setAttribute("color",new Float32BufferAttribute(c,3));
  geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
const leafGeometry=makeLeafGeometry();
const up=new Vector3(0,1,0);

type Stem={from:XYZ;to:XYZ;radius:number;woody:boolean};
type Leaf={at:XYZ;direction:XYZ;length:number;width:number;roll:number;shade:number};
const stems:Stem[]=[], leaves:Leaf[]=[];
const soilY=ref.nurseryRimHeight-.012;
const noise=(i:number)=>((Math.imul(i+31,1597334677)>>>9)%1009)/1009;
const branch=(from:XYZ,to:XYZ,radius:number,woody=false)=>stems.push({from,to,radius,woody});
function addLeaf(at:XYZ,angle:number,tilt:number,length:number,width:number,seed:number){
  const direction:XYZ=[Math.cos(angle)*Math.cos(tilt),Math.sin(tilt),Math.sin(angle)*Math.cos(tilt)];
  const petiole:XYZ=[at[0]+direction[0]*.009,at[1]+direction[1]*.009,at[2]+direction[2]*.009];
  branch(at,petiole,.0009);
  leaves.push({at:petiole,direction,length,width,roll:(noise(seed+7)-.5)*1.5,shade:Math.floor(noise(seed+13)*leafMaterials.length)});
}

// Closely spaced upright shoots, with lower and upper foliage clusters, as on
// IKEA's actual slender microcarpa reference (not a spherical bonsai crown).
for(let s=0;s<4;s++){
  const phase=s*1.9,offset=.011+s*.004;
  const root:XYZ=[Math.cos(phase)*offset,soilY,Math.sin(phase)*offset];
  const tipY=s===0?1.065:.90+s*.043;
  const middle:XYZ=[root[0]*1.3,soilY+(tipY-soilY)*.45,root[2]*1.3];
  const tip:XYZ=[Math.cos(phase)*.034,tipY,Math.sin(phase)*.034];
  branch(root,middle,.0052-s*.0007,true);
  branch(middle,tip,.0032-s*.0004,true);
  for(let k=0;k<8;k++){
    const t=.14+k*.102;
    const at:XYZ=[root[0]+(tip[0]-root[0])*t,soilY+(tipY-soilY)*t,root[2]+(tip[2]-root[2])*t];
    const a=phase+k*2.399;
    const spread=.052+.068*Math.sin(Math.PI*t)*(.68+.32*noise(s*100+k));
    const end:XYZ=[at[0]+Math.cos(a)*spread,at[1]+.045+.018*noise(k+s*9),at[2]+Math.sin(a)*spread];
    branch(at,end,.0019);
    for(let j=0;j<3;j++){
      const f=.28+j*.34;
      const leafAt:XYZ=[at[0]+(end[0]-at[0])*f,at[1]+(end[1]-at[1])*f,at[2]+(end[2]-at[2])*f];
      const seed=s*200+k*19+j;
      const leafLength=.047+.033*noise(seed);
      addLeaf(leafAt,a+(j%2?-.68:.68),.20+.65*noise(seed+2),leafLength,leafLength*(.49+.15*noise(seed+4)),seed);
    }
    addLeaf(at,a+Math.PI*.78,.54,.055,.028,s*100+k+731);
  }
  addLeaf(tip,phase,.9,.047,.026,s+901);
}
leaves.push({at:[.007,1.066,0],direction:[.04,1,0],length:.054,width:.026,roll:.25,shade:2});

export function Zimmer1FicusPlant(){
  // FurnitureObject applies the catalog envelope externally; all physical
  // meshes here are converted from metres to that normalized coordinate space.
  const potBottom=ref.nurseryRimHeight-ref.nurseryHeight;
  return <group name="ikea-ficus-90623179-temu-beige-planter-107283317021641" scale={[1/ref.width,1/ref.height,1/ref.depth]}>
    <mesh name="temu-kelch-bowl" geometry={bowl} material={resin} castShadow receiveShadow />
    <mesh name="temu-kelch-pedestal" geometry={foot} material={resin} castShadow receiveShadow />
    <mesh name="ikea-19cm-nursery-pot" position={[0,potBottom,0]} geometry={nursery} material={nurseryMaterial} castShadow />
    <mesh name="ficus-soil" position={[0,soilY-.003,0]} scale={[.085,.006,.085]} geometry={soilGeometry} material={soilMaterial} receiveShadow />
    {stems.map(({from,to,radius,woody},i)=>{
      const start=new Vector3(...from),delta=new Vector3(...to).sub(start),length=delta.length();
      const midpoint=start.addScaledVector(delta,.5);
      const quaternion=new Quaternion().setFromUnitVectors(up,delta.normalize());
      return <mesh key={i} position={midpoint} quaternion={quaternion} scale={[radius,length,radius]} geometry={stemGeometry} material={woody?branchMaterial:twigMaterial} castShadow />;
    })}
    {leaves.map(({at,direction,length,width,roll,shade},i)=>{
      const quaternion=new Quaternion().setFromUnitVectors(up,new Vector3(...direction).normalize());
      quaternion.multiply(new Quaternion().setFromAxisAngle(up,roll));
      return <mesh key={i} name="ficus-oval-leaf" position={at} quaternion={quaternion} scale={[width,length,width]} geometry={leafGeometry} material={leafMaterials[shade]} castShadow receiveShadow />;
    })}
  </group>;
}
