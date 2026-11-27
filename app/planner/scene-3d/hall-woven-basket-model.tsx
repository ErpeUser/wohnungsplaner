'use client';
import {useEffect,useMemo} from 'react';
import {DataTexture,ExtrudeGeometry,LinearFilter,LinearMipmapLinearFilter,MeshStandardMaterial,NoColorSpace,Path,RGBAFormat,Shape,SRGBColorSpace} from 'three';

const materials=new Map<string,MeshStandardMaterial>();
const natural=[183,151,105],cream=[233,225,207],brown=[147,104,66];
function basketMaterial(style:string){
  const key=style.startsWith('small-braid')?'small-braid':style;
  const old=materials.get(key);if(old)return old;
  const n=256,rgba=new Uint8Array(n*n*4),relief=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=2*(x+.5)/n-1,v=2*(y+.5)/n-1,r=Math.hypot(u,v),a=Math.atan2(v,u);
    const ring=r*38,band=Math.floor(ring);
    const fiber=Math.sin(ring*Math.PI*2);
    const stitches=Math.cos(a*(18+band*5)+band*Math.PI*.72);
    const leaf=key.startsWith('leaf-');
    const axis=key==='leaf-vertical'?v:u,cross=key==='leaf-vertical'?u:v;
    const woven=leaf?Math.cos((axis*34+Math.abs(cross)*10)*Math.PI*2)*Math.cos(cross*53):fiber*.62+stitches*.38;
    let base=natural;
    if(key==='flower')base=cream;
    if(key==='ring-white'&&r>.27&&r<.72)base=cream;
    if(key==='spiral-white'&&Math.floor(r*13+a/(2*Math.PI))%2===0)base=cream;
    if(key==='ring-brown'){if(r>.79||r<.13)base=cream;else if(Math.floor(r*9)%3!==0)base=brown;}
    if(key==='small-spiral'&&r>.66)base=cream;
    const strand=woven*10+Math.sin(x*12.9898+y*78.233)*2.5+(leaf&&Math.abs(cross)<.035?-20:0);
    const at=(y*n+x)*4;
    for(let c=0;c<3;c++)rgba[at+c]=Math.max(0,Math.min(255,base[c]+strand));
    rgba[at+3]=255;
    const bump=Math.round(128+42*woven);
    relief.set([bump,bump,bump,255],at);
  }
  const map=new DataTexture(rgba,n,n,RGBAFormat);
  map.colorSpace=SRGBColorSpace;map.generateMipmaps=true;map.minFilter=LinearMipmapLinearFilter;map.magFilter=LinearFilter;map.needsUpdate=true;
  const bumpMap=new DataTexture(relief,n,n,RGBAFormat);
  bumpMap.colorSpace=NoColorSpace;bumpMap.generateMipmaps=true;bumpMap.minFilter=LinearMipmapLinearFilter;bumpMap.magFilter=LinearFilter;bumpMap.needsUpdate=true;
  const mat=new MeshStandardMaterial({color:'#ffffff',map,bumpMap,bumpScale:.0009,roughness:.97});
  mat.name='temu-woven-basket-'+key;
  materials.set(key,mat);return mat;
}
function basketGeometry(style:string,w:number,h:number,d:number){
  const shape=new Shape(),petal=style==='flower',horizontal=style==='leaf-horizontal',vertical=style==='leaf-vertical';
  for(let i=0;i<=128;i++){
    const a=i/128*Math.PI*2,co=Math.cos(a),si=Math.sin(a);
    const scale=petal ? .9+.1*Math.cos(16*a) : 1;
    const x=co*(w-.002)/2*scale*(vertical?Math.pow(Math.max(0,1-Math.abs(si)),.24):1);
    const y=si*(h-.002)/2*scale*(horizontal?Math.pow(Math.max(0,1-Math.abs(co)),.24):1);
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();
  if(petal){
    const centre=new Path();centre.absarc(0,0,w*.145,0,Math.PI*2,true);shape.holes.push(centre);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,hole=new Path();
      hole.absellipse(Math.cos(a)*w*.28,Math.sin(a)*h*.28,w*.074,h*.035,0,Math.PI*2,true,a);shape.holes.push(hole);
    }
  }
  const g=new ExtrudeGeometry(shape,{depth:d-.003,bevelEnabled:true,bevelThickness:.0015,bevelSize:.001,bevelSegments:2,steps:1,curveSegments:12});
  g.translate(0,0,-d/2+.0015);
  const pos=g.getAttribute('position'),uv=g.getAttribute('uv');
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/w+.5,pos.getY(i)/h+.5);
  uv.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function HallWovenBasket({catalogId,size}:{catalogId:string;size:readonly [number,number,number]}){
  const style=catalogId.replace('hall-woven-basket-',''),[w,h,d]=size;
  const geometry=useMemo(()=>basketGeometry(style,w,h,d),[style,w,h,d]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name={'temu-hall-'+style} geometry={geometry} material={basketMaterial(style)} castShadow receiveShadow dispose={null}/>;
}
