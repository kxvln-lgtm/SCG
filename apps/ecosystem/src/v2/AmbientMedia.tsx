import {useState} from 'react';
import {imageUrl,SUPABASE_URL} from '../data';
// One bounded sample per image, never video-frame polling. CORS failures stay neutral.
export function AmbientImage({src,alt='',className=''}:{src:string;alt?:string;className?:string}){
 const [color,setColor]=useState('180,184,193'),[failed,setFailed]=useState(false);
 const url=imageUrl(src);const local=url&&new URL(url).origin===location.origin,storage=url&&new URL(url).origin===new URL(SUPABASE_URL).origin;
 function sample(image:HTMLImageElement){
  if(!local&&!storage)return;
  try{const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;ctx.drawImage(image,0,0,24,24);const pixels=ctx.getImageData(0,0,24,24).data;let red=0,green=0,blue=0,total=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];const light=(r+g+b)/3;if(light<35||light>235)continue;const weight=1+(Math.max(r,g,b)-Math.min(r,g,b))/64;red+=r*weight;green+=g*weight;blue+=b*weight;total+=weight;}if(total)setColor([red,green,blue].map(v=>Math.round(v/total)).join(','));}catch{setColor('180,184,193');}
 }
 if(!url||failed)return <div className={'ambient-empty '+className} aria-label={alt||'Изображение не опубликовано'}><span>SCG</span></div>;
 return <div className={'ambient-media '+className} style={{'--media-rgb':color} as React.CSSProperties}><img src={url} alt={alt} loading="lazy" crossOrigin={storage?'anonymous':undefined} onLoad={e=>sample(e.currentTarget)} onError={()=>setFailed(true)}/></div>;
}
