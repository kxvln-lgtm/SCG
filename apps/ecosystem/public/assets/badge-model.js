import {esc} from './core.js';
let inventory;
export async function badgeArtwork(){
  if(!inventory) inventory=fetch('/assets/badge-art/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('ART_UNAVAILABLE');return r.json();}).catch(e=>{inventory=null;throw e;});
  return inventory;
}
export function mountBadgeModel(host,item){
  host.innerHTML=`<div class="badge-stage" tabindex="0" role="group" aria-label="3D-бейдж ${esc(item.id)}. Перетаскивайте или используйте стрелки для вращения."><div class="badge-solid"><div class="badge-slice slice-a"></div><div class="badge-slice slice-b"></div><div class="badge-slice slice-c"></div><img class="badge-face face-front" draggable="false" src="${esc(item.front)}" alt="Лицевая сторона ${esc(item.id)}"><img class="badge-face face-back" draggable="false" src="${esc(item.back)}" alt="Оборотная сторона SCG"></div></div><div class="model-controls"><button type="button" data-model="flip">Перевернуть</button><button type="button" data-model="flat">Показать QR</button><button type="button" data-model="reset">Сбросить вид</button></div><p class="model-hint">Потяните бейдж, чтобы повернуть. Для сканирования нажмите «Показать QR».</p>`;
  const stage=host.querySelector('.badge-stage'),solid=host.querySelector('.badge-solid');let x=-7,y=-15,pointer;
  function draw(){solid.style.transform=`rotateX(${x}deg) rotateY(${y}deg)`;}
  draw();
  stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,rx:x,ry:y};stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');});
  stage.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;x=Math.max(-55,Math.min(55,pointer.rx-(e.clientY-pointer.y)*.3));y=pointer.ry+(e.clientX-pointer.x)*.6;draw();});
  function end(e){if(pointer?.id===e.pointerId){pointer=null;stage.classList.remove('is-dragging');}}
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
  stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){x=-7;y=-15;}else if(e.key==='ArrowLeft')y-=15;else if(e.key==='ArrowRight')y+=15;else x=Math.max(-55,Math.min(55,x+(e.key==='ArrowUp'?-10:10)));draw();});
  host.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.model;if(a==='flip'){x=0;y=Math.round(y/180)*180+180;}if(a==='flat'){x=0;y=0;}if(a==='reset'){x=-7;y=-15;}draw();}));
}
async function gallery(){
 const select=document.querySelector('#model-select'),host=document.querySelector('#model-view');if(!select||!host)return;
 try{
  const items=await badgeArtwork();select.innerHTML=items.map(i=>`<option value="${esc(i.id)}">${esc(i.id)} · ${esc(i.name)}</option>`).join('');
  const requested=new URL(location.href).searchParams.get('id');if(items.some(i=>i.id===requested))select.value=requested;
  function show(){const item=items.find(i=>i.id===select.value);if(!item)return;mountBadgeModel(host,item);document.querySelector('#model-name').textContent=item.name;document.querySelector('#model-profile').href=item.url;const u=new URL(location.href);u.searchParams.set('id',item.id);history.replaceState(null,'',u);}
  select.addEventListener('change',show);show();
 }catch{host.textContent='Не удалось загрузить макет. Обновите страницу.';}
}
await gallery();
