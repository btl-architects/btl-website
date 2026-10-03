import sharp from 'sharp';

// Read only alpha: opaque white/black borders remain part of the artwork.
// Two sample pixels of breathing room preserve antialiased lettering edges.
export function alphaBounds(data,width,height,channels=4) {
  if (channels!==4) return undefined;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    if(data[(y*width+x)*channels+3]===0) continue;
    left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y);
  }
  if(right<0) return undefined;
  left=Math.max(0,left-2); top=Math.max(0,top-2);
  right=Math.min(width-1,right+2); bottom=Math.min(height-1,bottom+2);
  if(left===0 && top===0 && right===width-1 && bottom===height-1) return undefined;
  return {left:left/width,top:top/height,right:(width-right-1)/width,bottom:(height-bottom-1)/height};
}

const pending=new Map();
export function artworkBounds(url) {
  if(!pending.has(url)) pending.set(url,(async()=>{
    const source=new URL(url);
    if(source.origin!=='https://cdn.sanity.io' || !source.pathname.startsWith('/images/')) throw new Error('Artwork analysis requires a Sanity image.');
    const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error(`Cannot measure Press artwork (${response.status}).`);
    const {data,info}=await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    return alphaBounds(data,info.width,info.height,info.channels);
  })());
  return pending.get(url);
}
