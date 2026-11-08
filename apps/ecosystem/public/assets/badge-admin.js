import {$,esc,nameOf,result,errorText,busy,icon,empty,safeUrl} from './core.js?v=20261025-auth3';
import {auth} from './auth.js?v=20261025-auth3';
import {badgeRole,badgeState,publicAvatar,badgeTokenPattern} from './badge.js?v=20261025-auth3';

const reasons={PROJECT_REQUIRED:'Выберите проект для проверки назначения.',BADGE_NOT_ACTIVE:'Бейдж недействителен для допуска.',PROJECT_NOT_ACTIVE:'Проект закрыт для отметок.',ASSIGNMENT_REQUIRED:'Назначение на этот проект отсутствует или завершено.',ASSIGNMENT_CONFIRMED:'Назначение на выбранный проект подтверждено.'};
const failures={BADGE_UNASSIGNED:'Бейдж ещё не привязан к волонтёру.',STALE_BADGE_STATE:'Владелец бейджа изменился. Повторите проверку.',MEMBER_HAS_ACTIVE_BADGE:'У волонтёра уже есть действующий физический бейдж. Сначала освободите или отзовите его.',VOLUNTEER_REQUIRED:'Для этого бейджа нужен участник с ролью VOLUNTEER.',BADGE_NOT_FOUND:'Физический бейдж не найден.',PHYSICAL_BADGE_REQUIRED:'Отсканируйте QR физического бейджа VB.',ASSIGNMENT_REQUIRED:reasons.ASSIGNMENT_REQUIRED,MEMBER_NOT_FOUND:'Бейдж не найден.',CHECKIN_REQUIRED:'Сначала нужно выполнить check-in.',ALREADY_CHECKED_IN:'Участник уже отмечен.',PROJECT_NOT_ACTIVE:reasons.PROJECT_NOT_ACTIVE,INVALID_BADGE:'Недействительный QR-код или ID.',BADGE_REVOKED:'Бейдж отозван. Отметка запрещена.',MEMBER_INACTIVE:'Членство неактивно. Отметка запрещена.',CHECKIN_FORBIDDEN:'Нет прав для проверки участника на этом проекте.',COMMAND_CENTER_FORBIDDEN:'Проверка недоступна для вашей роли или региона.'};
let stream,frame,scanGeneration=0,decoderPromise,verifyGeneration=0;
export async function badgeCheckinPage() {
  const projects=await result(auth.client.from('projects').select('id,title,status').in('status',['open','closed']).order('event_date'));
  const token=new URLSearchParams(location.hash.split('?')[1]||'').get('badge');
  const incoming=badgeTokenPattern.test(token||'') ? `https://stagecraft.kz/badge.html?code=${token}` : '';
  return `<div class="page-heading"><div><span class="eyebrow">SCG / DIGITAL ID</span><h1>Проверка бейджа.</h1><p>Проверьте профиль, затем назначение на проект. Отметка смены требует отдельного действия.</p></div></div>
    <div class="two-cols"><section class="card"><h2>QR или персональный ID</h2><form id="badge-verify-form">
      <label>Бейдж<input name="code" id="badge-code" maxlength="256" required value="${esc(incoming)}" placeholder="VB-001, FH-001 или ссылка QR" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
      <label>Проект<select name="project" id="badge-project"><option value="">Только проверка членства</option>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label>
      <div class="toolbar"><button class="btn primary" type="submit">Проверить ${icon('shield')}</button><button class="btn secondary" type="button" data-action="badge-camera">Камера</button><label class="btn secondary qr-file-label">QR из фото<input type="file" id="badge-image" accept="image/png,image/jpeg,image/webp" aria-label="Выбрать фото QR-кода"></label></div>
      <p class="form-error" id="badge-error" role="alert"></p></form>
      <div id="badge-camera-panel" class="qr-camera-panel" hidden><video id="badge-video" playsinline muted autoplay aria-label="Камера QR-сканера"></video><p>Наведите камеру на QR-код.</p><button class="btn secondary small" type="button" data-action="badge-camera-stop">Остановить камеру</button></div>
      <div id="badge-verification" aria-live="polite"></div>
    </section><section class="card"><h2>Отметка смены</h2><p class="small muted">Проверка бейджа не создаёт назначение и не отмечает вход автоматически.</p>
      ${projects.length ? `<form id="checkin-form"><label>Проект<select name="project" required><option value="">Выберите проект</option>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label><label>QR / ID<input name="scd" maxlength="256" required placeholder="Персональный ID или ссылка профиля" autocomplete="off"></label><label>Действие<select name="mode"><option value="in">Check-in — начало смены</option><option value="out">Check-out — завершение смены</option></select></label><p class="form-error" id="checkin-error" role="alert"></p><button class="btn primary" type="submit">Проверить назначение и отметить</button></form>` : empty('Нет активных проектов','Проверка членства доступна. Отметка смены появится после открытия проекта.','','calendar')}
      <div id="checkin-result" aria-live="polite"></div><p class="footer-note">Статус, права сотрудника, регион и назначение проверяются сервером повторно при каждой отметке.</p></section></div>`;
}
export async function verifyBadge(form) {
  const generation=++verifyGeneration, out=$('#badge-error'), target=$('#badge-verification');
  out.textContent='';target.innerHTML='';
  const attendance=$('#checkin-form');
  if(attendance)attendance.elements.scd.value='';
  const previousAttendance=$('#checkin-result');if(previousAttendance)previousAttendance.innerHTML='';
  await busy($('button[type=submit]',form), async()=>{
    try {
      const d=new FormData(form),r=await result(auth.client.rpc('scg_verify_badge',{p_code:String(d.get('code')||'').trim(),p_project:String(d.get('project')||'')||null}));
      if(generation!==verifyGeneration || !target.isConnected)return;
      const state=badgeState(r.result),person=r.member,photo=publicAvatar(person?.avatar_url);
      const profile=r.badge_url || (person?.personnel_id?`https://stagecraft.kz/profile.html?id=${encodeURIComponent(person.personnel_id)}`:'');
      target.innerHTML=`<section class="badge-check-result ${state.valid?'badge-check-active':'badge-check-invalid'}"><h3>${esc(state.title)}</h3>${person?`<div class="profile-header">${photo?`<img class="badge-check-photo" src="${esc(photo)}" alt="${esc(nameOf(person))}" referrerpolicy="no-referrer">`:'<span class="avatar" aria-label="Фото отсутствует">◎</span>'}<div><strong>${esc(nameOf(person))}</strong><p>${esc(badgeRole(person.role))}</p><p class="mono">${esc(person.personnel_id||person.scd_id)}</p></div></div><p class="small">Статус членства: ${esc(person.status)}</p><p class="small"><b>${r.admission?'Назначение подтверждено':'Допуск не подтверждён'}</b><br>${esc(reasons[r.reason]||'Повторите проверку.')}</p>${profile?`<a class="text-link" href="${esc(safeUrl(profile))}" target="_blank" rel="noopener noreferrer">Открыть публичный профиль ↗</a>`:''}${auth.profile.role==='FOUNDER'&&!r.badge_label?`<div class="toolbar"><button type="button" class="btn secondary small" data-action="badge-revoke" data-id="${esc(person.id)}" data-revoked="${r.result==='revoked'?'false':'true'}">${r.result==='revoked'?'Восстановить бейдж':'Отозвать бейдж'}</button></div>`:''}`:`<p class="small">${r.result==='unassigned'?'Этот бейдж можно привязать к существующему волонтёру ниже.':'Такой бейдж не подтверждает членство.'}</p>`}</section>`;
      if(r.badge_label)target.innerHTML+=physicalManagementMarkup(r);
      const checkin=$('#checkin-form');
      if(checkin && person){checkin.elements.scd.value=r.badge_url||person.personnel_id||person.scd_id;checkin.elements.project.value=String(d.get('project')||'');}
    } catch(e) {if(generation===verifyGeneration && out.isConnected)out.textContent=failures[e.message]||errorText(e);}
  });
}
function physicalManagementMarkup(data) {
  return `<section class="badge-check-result"><h3>Физический бейдж ${esc(data.badge_label)}</h3><p class="small muted">QR остаётся прежним. Привяжите бейдж к персональному ID волонтёра или освободите его для следующего участника.</p><form id="physical-badge-form" data-code="${esc(data.badge_label)}" data-holder="${esc(data.member?.id||'')}"><label>Действие<select name="action"><option value="bind">Привязать / сменить волонтёра</option><option value="unbind">Освободить бейдж</option><option value="revoke">Отозвать физический бейдж</option><option value="restore">Восстановить физический бейдж</option></select></label><label>Персональный ID волонтёра<input name="personnel" maxlength="20" placeholder="Например, VL-025" autocomplete="off" autocapitalize="characters"></label><p class="form-hint">ID требуется только для привязки. Регистрация нового участника выполняется через Backstage; дубликат профиля не создаётся.</p><p id="physical-badge-error" class="form-error" role="alert"></p><button class="btn primary" type="submit">Сохранить привязку</button></form></section>`;
}
export async function managePhysicalBadge(form) {
  const out=$('#physical-badge-error'),d=new FormData(form),action=String(d.get('action')),personnel=String(d.get('personnel')||'').trim().toUpperCase();
  out.textContent='';if(action==='bind'&&!personnel){out.textContent='Введите персональный ID волонтёра.';return;}
  await busy($('button[type=submit]',form),async()=>{
    try{
      await result(auth.client.rpc('scg_manage_physical_badge',{p_code:form.dataset.code,p_action:action,p_personnel_id:personnel||null,p_expected_user:form.dataset.holder||null}));
      const verify=$('#badge-verify-form');if(verify)await verifyBadge(verify);
    }catch(e){out.textContent=failures[e.message]||errorText(e);}
  });
}
export async function submitBadgeCheckin(form) {
  await busy($('button[type=submit]',form),async()=>{
    const out=$('#checkin-error');out.textContent='';$('#checkin-result').innerHTML='';
    try {
      const d=new FormData(form),r=await result(auth.client.rpc('scg_checkin',{p_project:String(d.get('project')),p_scd:String(d.get('scd')).trim(),p_mode:String(d.get('mode'))}));
      $('#checkin-result').innerHTML=`<div class="success-panel">${icon('check')}<h3>${r.mode==='in'?'Смена началась':'Смена завершена'}</h3><p>${esc(r.name)} · ${esc(r.personnel_id||r.scd_id)}${r.hours!=null?'<br>'+esc(r.hours)+' ч. записано в историю':''}</p></div>`;
      form.elements.scd.value='';
    } catch(e) {out.textContent=failures[e.message]||errorText(e);}
  });
}
function loadDecoder() {
  if(window.jsQR)return Promise.resolve(window.jsQR);
  if(!decoderPromise)decoderPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/assets/jsqr-1.4.0.js';
    script.onload=()=>window.jsQR?resolve(window.jsQR):reject(new Error('QR_DECODER_UNAVAILABLE'));
    script.onerror=()=>{script.remove();decoderPromise=null;reject(new Error('QR_DECODER_UNAVAILABLE'));};
    document.head.append(script);
  });
  return decoderPromise;
}
export function stopBadgeCamera() {
  scanGeneration++;cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());stream=null;
  const video=$('#badge-video');if(video){video.pause();video.srcObject=null;}
  const panel=$('#badge-camera-panel');if(panel)panel.hidden=true;
}
async function foundCode(code) {
  stopBadgeCamera();const form=$('#badge-verify-form');if(!form)return;
  form.elements.code.value=code;await verifyBadge(form);
}
export async function startBadgeCamera() {
  stopBadgeCamera();const generation=scanGeneration,out=$('#badge-error');out.textContent='';
  const panel=$('#badge-camera-panel'),video=$('#badge-video');
  try {
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('CAMERA_UNAVAILABLE');
    const decode=await loadDecoder();
    const opened=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
    if(generation!==scanGeneration||!panel.isConnected){opened.getTracks().forEach(t=>t.stop());return;}
    stream=opened;panel.hidden=false;video.srcObject=stream;await video.play();
    if(generation!==scanGeneration)return;
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});let last=0;
    function scan(time){
      if(generation!==scanGeneration || !video.isConnected){if(generation===scanGeneration)stopBadgeCamera();return;}
      if(time-last>180 && video.readyState>=2 && video.videoWidth){
        last=time;const scale=Math.min(1,720/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
        context.drawImage(video,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height);
        const code=decode(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'});
        if(code){foundCode(code.data);return;}
      }
      frame=requestAnimationFrame(scan);
    }
    frame=requestAnimationFrame(scan);
  } catch(e) {
    if(generation!==scanGeneration)return;stopBadgeCamera();
    out.textContent=e.name==='NotAllowedError'?'Доступ к камере не разрешён. Разрешите камеру в настройках браузера или выберите QR из фото.':'Камера недоступна. Выберите QR из фото или введите ID вручную.';
  }
}
export async function scanBadgeImage(file) {
  const out=$('#badge-error');out.textContent='';stopBadgeCamera();
  if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>10*1024*1024){out.textContent='Выберите PNG, JPEG или WebP до 10 МБ.';return;}
  const url=URL.createObjectURL(file);
  try {
    const decode=await loadDecoder(),image=new Image();image.src=url;await image.decode();
    const scale=Math.min(1,1600/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height),code=decode(pixels.data,pixels.width,pixels.height);
    if(!code){out.textContent='QR-код не распознан. Выберите чёткое изображение без обрезанных краёв.';return;}
    await foundCode(code.data);
  } catch {out.textContent='Не удалось прочитать QR-код из изображения.';} finally {URL.revokeObjectURL(url);}
}
export async function changeBadgeRevocation(button) {
  await busy(button,async()=>{
    await result(auth.client.rpc('scg_set_badge_revoked',{p_user:button.dataset.id,p_revoked:button.dataset.revoked==='true'}));
    const form=$('#badge-verify-form');if(form)await verifyBadge(form);
  });
}
window.addEventListener('hashchange',()=>{verifyGeneration++;stopBadgeCamera();});
window.addEventListener('pagehide',stopBadgeCamera);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopBadgeCamera();});
