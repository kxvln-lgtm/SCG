import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Pause,Play,ArrowUpRight} from 'lucide-react';
import {Row,safeUrl} from '../data';
export const regions=[{id:'NORTH',city:'Астана',legacy:'Север'},{id:'SOUTH',city:'Алматы',legacy:'Юг'},{id:'WEST',city:'Актобе',legacy:'Запад'},{id:'EAST',city:'Усть-Каменогорск',legacy:'Восток'},{id:'CENTRAL',city:'Караганда',legacy:'Центр'}];
export function RegionalSystem({initial,communities=[]}:{initial?:string;communities?:Row[]}){
 const [selected,setSelected]=useState(Math.max(0,regions.findIndex(r=>r.id===initial||r.legacy===initial))),[paused,setPaused]=useState(false),[ready,setReady]=useState(false);
 const container=useRef<HTMLDivElement>(null),controls=useRef({selected,paused});controls.current={selected,paused};
 useEffect(()=>{
  const element=container.current;if(!element)return;let disposed=false;let cleanup=()=>{};
  void Promise.all([import('three'),import('three/addons/environments/RoomEnvironment.js')]).then(([T,{RoomEnvironment}])=>{
   if(disposed)return;
   let renderer:InstanceType<typeof T.WebGLRenderer>;
   try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,50);camera.position.set(0,1,8);camera.lookAt(0,0,0);
   const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
   const group=new T.Group();group.rotation.set(-.2,0,-.16);scene.add(group);
   function ribbon(radius:number,width:number,offset:number){
    const positions=[],indices=[];const n=180;
    for(let i=0;i<=n;i++){const angle=i/n*Math.PI*2;for(const side of [-1,1]){const t=side*width/2;const r=radius+t*Math.cos(angle*2+offset)*.32;positions.push(r*Math.cos(angle),Math.sin(angle*2+offset)*.24+t,r*Math.sin(angle)*.52);}}
    for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
   }
   const silver=new T.MeshPhysicalMaterial({color:0xd9dce3,metalness:.92,roughness:.24,clearcoat:1,side:T.DoubleSide});
   const dark=new T.MeshPhysicalMaterial({color:0x30333c,metalness:.75,roughness:.32,side:T.DoubleSide});
   const front=new T.Mesh(ribbon(2.2,.74,0),silver),back=new T.Mesh(ribbon(1.9,.32,2),dark);back.position.y=-.55;group.add(front,back);
   const soft=new T.HemisphereLight(0xffffff,0x8b8f99,2);scene.add(soft);
   element.appendChild(renderer.domElement);setReady(true);
   const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=true,last=0,angle=0,dragStart:number|null=null;
   const draw=()=>renderer.render(scene,camera);
   const resize=new ResizeObserver(()=>{const rect=element.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(1,rect.height);camera.position.z=Math.max(4.8,8/camera.aspect);camera.updateProjectionMatrix();draw();});resize.observe(element);
   const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.05});observer.observe(element);
   function frame(time:number){if(time-last<32)return;const delta=Math.min((time-last)/1000,.05);last=time;const target=(controls.current.selected-2)*.08;angle+=(target-angle)*.045;group.rotation.y=angle;if(!controls.current.paused&&!reduced.matches&&dragStart===null)group.rotation.z=-.16+Math.sin(time*.00018)*.035;draw();if(controls.current.paused||reduced.matches){if(Math.abs(target-angle)<.005)renderer.setAnimationLoop(null);}}
   function sync(){if(visible&&!document.hidden){if(reduced.matches){group.rotation.y=(controls.current.selected-2)*.08;draw();}else renderer.setAnimationLoop(frame);}else renderer.setAnimationLoop(null);}
   const down=(e:PointerEvent)=>{dragStart=e.clientX;};const up=(e:PointerEvent)=>{if(dragStart!==null&&Math.abs(e.clientX-dragStart)>25){const direction=e.clientX>dragStart?-1:1;setSelected(s=>(s+direction+5)%5);}dragStart=null;sync();};
   const change=()=>{group.rotation.y=(controls.current.selected-2)*.08;angle=group.rotation.y;sync();};
   element.addEventListener('pointerdown',down);element.addEventListener('pointerup',up);const cancel=()=>{dragStart=null;};element.addEventListener('pointercancel',cancel);element.addEventListener('regionchange',change);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);sync();
   const lost=(e:Event)=>{e.preventDefault();renderer.setAnimationLoop(null);setReady(false);};renderer.domElement.addEventListener('webglcontextlost',lost);
   cleanup=()=>{resize.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);element.removeEventListener('pointerdown',down);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('regionchange',change);renderer.setAnimationLoop(null);front.geometry.dispose();back.geometry.dispose();silver.dispose();dark.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>setReady(false));
  return()=>{disposed=true;cleanup();};
 },[]);
 useEffect(()=>{container.current?.dispatchEvent(new Event('regionchange'));},[selected,paused]);
 const r=regions[selected],community=communities.find(c=>c.active&&[r.id,r.legacy].includes(c.region));
 return <section className="regional-system" aria-label="Региональная сеть The Backstage Union"><div className="regional-stage" ref={container} aria-hidden="true">{!ready&&<div className="ribbon-fallback"><i/><i/></div>}<div className="regional-inscription"><small>THE BACKSTAGE UNION</small><strong>REGIONAL SYSTEM</strong></div></div><div className="region-controls" aria-label="Выбор региона">{regions.map((region,i)=><button key={region.id} aria-pressed={selected===i} onClick={()=>setSelected(i)}>{region.id}</button>)}</div><div className="region-info"><span>{r.city} <small>· {r.id}</small></span>{community&&safeUrl(community.url)?<a href={safeUrl(community.url)} target="_blank" rel="noreferrer">Сообщество <ArrowUpRight size={15}/></a>:<Link to="/one/communities">Региональные сообщества <ArrowUpRight size={15}/></Link>}<button className="platform-icon" onClick={()=>setPaused(!paused)} aria-label={paused?'Включить движение':'Приостановить движение'}>{paused?<Play size={15}/>:<Pause size={15}/>}</button></div></section>;
}
