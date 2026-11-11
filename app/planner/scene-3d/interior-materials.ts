import {DataTexture,DoubleSide,MeshPhysicalMaterial,MeshStandardMaterial,NoColorSpace,RGBAFormat,RepeatWrapping,SRGBColorSpace,LinearFilter,LinearMipmapLinearFilter,UnsignedByteType} from 'three';
import {createWafflePixels,createArtworkPixels} from './interior-geometry.ts';
const cache=new Map<string,MeshStandardMaterial>();
function pixels(data:Uint8Array,width:number,height:number,color:boolean,name:string){
  const texture=new DataTexture(data,width,height,RGBAFormat,UnsignedByteType);
  texture.name=name;texture.colorSpace=color?SRGBColorSpace:NoColorSpace;texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;texture.needsUpdate=true;return texture;
}
function woodTexture(){
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const grain=Math.sin(x*.11+Math.sin(y*.023)*2.8)*10+Math.sin(x*.72+Math.sin(y*.037))*2.6,pore=((x*13+y*31+x*y)%19-9)*.3;
    data.set([213+grain+pore,180+grain*.86+pore,132+grain*.7+pore,255],(y*size+x)*4);
  }return pixels(data,size,size,true,'interior-natural-wood');
}
export function getInteriorMaterial(kind:string):MeshStandardMaterial{
  const cached=cache.get(kind);if(cached)return cached;let material:MeshStandardMaterial;
  switch(kind){
    case 'cotton':{const generated=createWafflePixels(512);material=new MeshPhysicalMaterial({color:'#ffffff',roughness:.97,metalness:0,sheen:.6,sheenColor:'#e2d4bd',sheenRoughness:.9,map:pixels(generated.color,generated.size,generated.size,true,'interior-waffle-albedo'),bumpMap:pixels(generated.height,generated.size,generated.size,false,'interior-cotton-linear-microheight'),bumpScale:.00055});break;}
    case 'cotton-edge':material=new MeshStandardMaterial({color:'#c9b18d',roughness:1});break;
    case 'wood':material=new MeshPhysicalMaterial({color:'#ffffff',roughness:.72,clearcoat:.06,map:woodTexture()});break;
    case 'white-front':material=new MeshPhysicalMaterial({color:'#f5f4ef',roughness:.28,clearcoat:.3,clearcoatRoughness:.35});break;
    case 'carcass':material=new MeshStandardMaterial({color:'#e8e5df',roughness:.72});break;
    case 'black-iron':material=new MeshStandardMaterial({color:'#191a19',roughness:.52,metalness:.5});break;
    case 'worktop':material=new MeshPhysicalMaterial({color:'#181b1b',roughness:.34,clearcoat:.12});break;
    case 'grout':material=new MeshStandardMaterial({color:'#aaa9a1',roughness:1});break;
    case 'tile':material=new MeshStandardMaterial({color:'#ffffff',roughness:.64,vertexColors:true});break;
    case 'plinth':material=new MeshStandardMaterial({color:'#aaa9a4',roughness:.58,metalness:.1});break;
    case 'steel':material=new MeshStandardMaterial({color:'#bcbfbd',roughness:.3,metalness:.85});break;
    case 'paper':material=new MeshStandardMaterial({color:'#f6f3ec',roughness:1,side:DoubleSide});break;
    case 'core':material=new MeshStandardMaterial({color:'#a48b6d',roughness:1});break;
    case 'ceramic':material=new MeshPhysicalMaterial({color:'#e6ddcb',roughness:.65,clearcoat:.08});break;
    case 'soil':material=new MeshStandardMaterial({color:'#4c3a24',roughness:1});break;
    case 'leaf':material=new MeshStandardMaterial({color:'#6d8245',roughness:.9,side:DoubleSide});break;
    case 'leaf-light':material=new MeshStandardMaterial({color:'#92a163',roughness:.91,side:DoubleSide});break;
    case 'stem':material=new MeshStandardMaterial({color:'#6b7340',roughness:.96});break;
    case 'basket-light':material=new MeshStandardMaterial({color:'#e5d9c4',roughness:.95});break;
    case 'basket-sand':material=new MeshStandardMaterial({color:'#c0a071',roughness:.95});break;
    case 'basket-brown':material=new MeshStandardMaterial({color:'#9d6d3b',roughness:.95});break;
    case 'arches':case 'pampas':{const artwork=createArtworkPixels(kind),map=pixels(artwork.data,artwork.width,artwork.height,true,`interior-original-${kind}`);map.flipY=true;material=new MeshStandardMaterial({color:'#ffffff',roughness:.96,map});break;}
    default:throw new Error(`Unknown interior material: ${kind}`);
  }material.name=`interior-${kind}`;cache.set(kind,material);return material;
}
