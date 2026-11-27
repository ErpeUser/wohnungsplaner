/** Isolated textures for the chosen wall vases. */
export function createHallVaseWoodPixels(dark:boolean){
  const width=192,height=768,data=new Uint8Array(width*height*4);
  const base=dark?[161,104,57]:[213,176,112];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=(x+.5)/width,v=(y+.5)/height;
    // Long natural growth rings with an asymmetric cathedral near the centre.
    const axis=.48+.045*Math.sin(v*5)+.013*Math.sin(v*16);
    const radius=Math.hypot((u-axis)*1.22,.025+.31*v);
    const phase=2*Math.PI*(radius*27+.18*Math.sin(v*12+u*4));
    const fine=Math.sin(u*260+Math.sin(v*8)*3)*1.5;
    const ring=Math.sin(phase)*6.7+Math.pow(Math.max(0,Math.sin(phase+.35)),9)*10.8;
    const pore=((x*29+y*17+x*y)%17-8)*.21;
    const grain=ring+fine+pore+Math.sin(v*4+u*2)*2.5;
    data.set([base[0]+grain,base[1]+grain*.89,base[2]+grain*.75,255],(y*width+x)*4);
  }
  return {data,width,height};
}
