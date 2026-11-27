/** Metric geometry and a repeatable photo-derived textile surface. No merchant image planes. */
import { TILE_SIZE_METRES } from '../domain/tile-dimensions.ts';
import { sampleWaffleReference } from "./waffle-photo-reference.ts";
export type InteriorMesh={positions:Float32Array;normals:Float32Array;uvs:Float32Array;indices:Uint32Array;colors?:Float32Array};
export const WAFFLE_PITCH=.02;
export const FABRIC_TILE_METRES=.08;
export const WAFFLE_FRINGE=.025;
const TAU=Math.PI*2;
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
function positive(v:number,name:string){if(!Number.isFinite(v)||v<=0)throw new RangeError(`${name} must be positive.`);}
function rib(v:number){const f=((v/WAFFLE_PITCH)%1+1)%1;return Math.exp(-Math.pow(Math.min(f,1-f)/.135,2));}
function cottonHeight(x:number,z:number,width:number,depth:number,height:number){
  const border=Math.min(width/2-Math.abs(x),depth/2-Math.abs(z)),ridge=Math.max(rib(x+width/2),rib(z+depth/2));
  const body=.29+.54*ridge+.022*Math.sin(x*1210)*Math.sin(z*1370),hem=.87+.025*Math.sin((x+z)*700),mix=clamp((.017-border)/.008,0,1);
  return height*(body*(1-mix)+hem*mix-.5);
}
export function createWaffleSurface(width:number,depth:number,height=.01):InteriorMesh{
  positive(width,'width');positive(depth,'depth');positive(height,'height');
  if(width>5||depth>5||height>.05)throw new RangeError('Unsupported mat dimensions.');
  const nx=Math.ceil(width/(WAFFLE_PITCH/4)),nz=Math.ceil(depth/(WAFFLE_PITCH/4)),count=(nx+1)*(nz+1);
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),indices=new Uint32Array(nx*nz*6);
  const radius=Math.min(.012,depth/8,width/8),epsilon=.00015;
  for(let j=0;j<=nz;j++){
    const z=-depth/2+depth*j/nz,corner=Math.max(0,Math.abs(z)-(depth/2-radius)),halfWidth=width/2-radius+Math.sqrt(Math.max(0,radius*radius-corner*corner));
    for(let i=0;i<=nx;i++){
      const x=-halfWidth+2*halfWidth*i/nx,index=j*(nx+1)+i,y=cottonHeight(x,z,width,depth,height);
      const dx=(cottonHeight(x+epsilon,z,width,depth,height)-cottonHeight(x-epsilon,z,width,depth,height))/(2*epsilon);
      const dz=(cottonHeight(x,z+epsilon,width,depth,height)-cottonHeight(x,z-epsilon,width,depth,height))/(2*epsilon),length=Math.hypot(dx,1,dz);
      positions.set([x,y,z],index*3);normals.set([-dx/length,1/length,-dz/length],index*3);uvs.set([(x+width/2)/FABRIC_TILE_METRES,(z+depth/2)/FABRIC_TILE_METRES],index*2);
    }
  }
  let cursor=0;for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.set([a,c,b,b,c,d],cursor);cursor+=6;}
  return {positions,normals,uvs,indices};
}
export function createWafflePixels(size=256){
  if(!Number.isInteger(size)||size<32||size>1024)throw new RangeError('Texture size must be 32..1024.');
  const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size,v=y/size;
    const warp=Math.sin(TAU*u*112)*Math.cos(TAU*v*8),weft=Math.sin(TAU*v*120)*Math.cos(TAU*u*8),fuzz=((x*31+y*47+x*y*3)%17-8)*.36,offset=(y*size+x)*4;
    color.set([...sampleWaffleReference(u,v),255],offset);
    const bump=clamp(127+warp*33+weft*30+fuzz*2,0,255);height.set([bump,bump,bump,255],offset);
  }return {size,color,height};
}
/** Dense, curved yarn ribbons bounded by the confirmed outside dimensions. */
export function createWaffleFringe(width:number,depth:number,height=.01):InteriorMesh {
  const pos:number[]=[],normal:number[]=[],uv:number[]=[],indices:number[]=[],colors:number[]=[];
  const fringe=WAFFLE_FRINGE;
  for(const alongX of [true,false])for(const side of [-1,1]){
    const span=(alongX?width:depth)-2*fringe,outer=(alongX?depth:width)/2;
    const count=Math.ceil(span/.0021);
    for(let i=0;i<count;i++){
      const t=(i+.5)*span/count-span/2,half=.00065+(i%4)*.00007;
      const length=fringe-(i%7)*.00055,bend=Math.sin(i*2.71)*.0014;
      const start=outer-fringe-.002,base=pos.length/3,shade=.85+(i%9)*.018;
      for(let j=0;j<3;j++)for(const q of [-1,1]){
        const f=j/2,a=t+bend*f+q*half*(1-.45*f),b=side*Math.min(outer,start+(length+.002)*f);
        const y=-height*.4+Math.sin(f*Math.PI)*height*.16;
        pos.push(alongX?a:b,y,alongX?b:a);normal.push(0,1,0);uv.push(q===-1?0:1,f);
        colors.push(shade,shade,shade);
      }
      for(let j=0;j<2;j++){const k=base+j*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
  }
  return {positions:new Float32Array(pos),normals:new Float32Array(normal),uvs:new Float32Array(uv),indices:new Uint32Array(indices),colors:new Float32Array(colors)};
}
export type Slab={x:number;z:number;width:number;depth:number};
export function worktopSlabs(width:number,depth:number,hole?:Slab):Slab[]{
  positive(width,'width');positive(depth,'depth');if(!hole)return [{x:0,z:0,width,depth}];
  positive(hole.width,'hole width');positive(hole.depth,'hole depth');
  const left=hole.x-hole.width/2,right=hole.x+hole.width/2,back=hole.z-hole.depth/2,front=hole.z+hole.depth/2;
  if(!Number.isFinite(hole.x)||!Number.isFinite(hole.z)||left<=-width/2||right>=width/2||back<=-depth/2||front>=depth/2)throw new RangeError('Cutout must stay inside the worktop.');
  return [{x:(-width/2+left)/2,z:0,width:left+width/2,depth},{x:(right+width/2)/2,z:0,width:width/2-right,depth},{x:hole.x,z:(-depth/2+back)/2,width:hole.width,depth:back+depth/2},{x:hole.x,z:(front+depth/2)/2,width:hole.width,depth:depth/2-front}];
}
/** Both arms of the L use one world-coordinate grout grid. */
export function createKitchenTiles(width:number,depth:number,worldX:number,worldZ:number,pitch=TILE_SIZE_METRES,grout=.002):InteriorMesh{
  [width,depth,pitch,grout].forEach((v,i)=>positive(v,['width','depth','pitch','grout'][i]));
  if(!Number.isFinite(worldX)||!Number.isFinite(worldZ)||width>20||depth>20||pitch<.01||grout>=pitch)throw new RangeError('Invalid tile patch.');
  const pos:number[]=[],normal:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[];
  const ox=.06,oz=3.53,minX=worldX-width/2,maxX=worldX+width/2,minZ=worldZ-depth/2,maxZ=worldZ+depth/2;
  for(let iz=Math.floor((minZ-oz)/pitch);iz<Math.ceil((maxZ-oz)/pitch);iz++)for(let ix=Math.floor((minX-ox)/pitch);ix<Math.ceil((maxX-ox)/pitch);ix++){
    const x0=Math.max(minX,ox+ix*pitch+grout/2),x1=Math.min(maxX,ox+(ix+1)*pitch-grout/2),z0=Math.max(minZ,oz+iz*pitch+grout/2),z1=Math.min(maxZ,oz+(iz+1)*pitch-grout/2);
    if(x1<=x0||z1<=z0)continue;
    const n=pos.length/3,variation=(((ix*17+iz*29)%7+7)%7-3)*.008;
    for(const [x,z] of [[x0,z0],[x1,z0],[x0,z1],[x1,z1]]){pos.push(x-worldX,.001,z-worldZ);normal.push(0,1,0);uv.push(x,z);colors.push(.76+variation,.77+variation,.745+variation);}
    indices.push(n,n+2,n+1,n+1,n+2,n+3);
  }return {positions:new Float32Array(pos),normals:new Float32Array(normal),uvs:new Float32Array(uv),indices:new Uint32Array(indices),colors:new Float32Array(colors)};
}
export function sinkProfile(width:number,depth:number,height:number){
  [width,depth,height].forEach((v,i)=>positive(v,['width','depth','height'][i]));if(width<.2||depth<.2||height<.08)throw new RangeError('Sink too small.');
  return {rimY:height/2,bottomY:-height/2+.01,wallHeight:height-.01,bowlWidth:width-.05,bowlDepth:depth-.05};
}
export type Panel={id:string;size:[number,number,number];position:[number,number,number]};
export function baseShellPanels(w:number,h:number,d:number,lid=true):Panel[]{
  const panels:Panel[]=[{id:'bottom',size:[w,.016,d],position:[0,-h/2+.128,0]},{id:'back',size:[w,h-.12,.016],position:[0,.06,-d/2+.008]},
    ...[-1,1].map(side=>({id:`side-${side}`,size:[.016,h-.12,d] as [number,number,number],position:[side*(w-.016)/2,.06,0] as [number,number,number]}))];
  if(lid)panels.push({id:'top',size:[w,.016,d],position:[0,h/2-.008,0]});return panels;
}
export function createArtworkPixels(kind:'pampas'|'arches',width=256,height=384){
  const data=new Uint8Array(width*height*4);
  const pixel=(x:number,y:number,color:readonly number[])=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;data.set([color[0],color[1],color[2],255],(y*width+x)*4);};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const noise=((x*11+y*17)%7-3)*.45;pixel(x,y,[239+noise,231+noise,217+noise]);}
  const line=(x1:number,y1:number,x2:number,y2:number,color:readonly number[],thickness=1)=>{const count=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)*2));for(let i=0;i<=count;i++)for(let t=-thickness/2;t<=thickness/2;t+=.65)pixel(x1+(x2-x1)*i/count+t,y1+(y2-y1)*i/count,color);};
  if(kind==='arches')[[221,205,180],[203,174,137],[183,143,101],[153,107,65]].forEach((color,i)=>{const r=width*(.84-i*.16),cx=width*.85,cy=height*(.66+i*.055);for(let y=height*.12;y<height*.92;y++)for(let x=width*.08;x<width*.94;x++)if(Math.abs(x-cx)<r&&(y>=cy||(x-cx)**2+(y-cy)**2<=r*r))pixel(x,y,color);});
  else for(let stem=0;stem<3;stem++){const sx=width*(.42+stem*.11),sy=height*.92,tx=width*(.36+stem*.15),ty=height*(.13+stem*.10);line(sx,sy,tx,ty,[152,112,72],1.4);for(let i=0;i<50;i++){const t=.15+i*.014,x=sx+(tx-sx)*t,y=sy+(ty-sy)*t,length=width*(.17*Math.sin(t*Math.PI)+.025),direction=i%2?1:-1;line(x,y,x+direction*length,y-length*.72,[177+i%4*5,136+i%5*4,91+i%4*5],1.05);}}
  return {data,width,height};
}
