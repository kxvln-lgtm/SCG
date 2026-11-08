import {CONFIG, esc} from './core.js';
import {personnelPattern, badgeTokenPattern, badgeRole, badgeState, publicAvatar} from './badge.js';

import {badgeArtwork,mountBadgeModel} from './badge-model.js';

const card = document.querySelector('#badge-card');
const theme = document.querySelector('#theme-toggle');
let requestGeneration=0;
try {
  const saved = localStorage.getItem('scg-color-scheme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch {}
theme.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  try {localStorage.setItem('scg-color-scheme', dark ? 'light' : 'dark');} catch {}
});
function message(title, text, retry = false, action = '') {
  document.querySelector('#profile-model')?.remove();
  card.innerHTML = `<div class="badge-error"><span class="error-symbol" aria-hidden="true">!</span><h1>${esc(title)}</h1><p>${esc(text)}</p>${action || (retry ? '<button class="retry-button" id="retry" type="button">Повторить проверку</button>' : '<a class="retry-button" href="/">На сайт SCG</a>')}</div>`;
  card.setAttribute('aria-busy','false');
  document.querySelector('#retry')?.addEventListener('click', load);
}
async function load() {
  const generation=++requestGeneration;
  const params = new URL(location.href).searchParams;
  const physical = location.pathname === '/badge.html';
  const token = params.get('code') || '';
  const id = (params.get('id') || '').trim().toUpperCase();
  if (physical ? params.getAll('code').length !== 1 || !badgeTokenPattern.test(token) : params.getAll('id').length !== 1 || !personnelPattern.test(id)) {message('Недействительный ID', 'Проверьте ссылку на бейдже или отсканируйте QR-код снова.'); return;}
  card.setAttribute('aria-busy','true');
  card.innerHTML = '<div class="loading-state" role="status"><span class="spinner"></span>Проверяем профиль…</div>';
  try {
    // No auth client, session or private table access is needed on this page.
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/rpc/${physical ? 'scg_physical_badge_public' : 'scg_badge_public'}`, {
      method:'POST', headers:{apikey:CONFIG.publishableKey,'Content-Type':'application/json'},
      body:JSON.stringify(physical ? {p_token:token} : {p_personnel_id:id}), cache:'no-store', credentials:'omit',
      referrerPolicy:'no-referrer', signal:AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('lookup_failed');
    const rows = await response.json();
    if(generation!==requestGeneration)return;
    if(physical && rows.state==='unassigned') {
      message('Бейдж свободен',`${rows.badge_label} ещё не привязан к волонтёру. Координатор SCG может выбрать участника после входа в Command Center.`,false,`<a class="retry-button" href="https://admin.stagecraft.kz/#checkin?badge=${encodeURIComponent(token)}">Привязать волонтёра</a><br><a class="model-hint" href="/badge-3d.html?id=${encodeURIComponent(rows.badge_label)}">Посмотреть 3D-бейдж ↗</a>`);return;
    }
    if(physical && rows.state==='revoked' && !rows.profile) {message('Бейдж отозван','Этот физический бейдж отключён и не подтверждает членство.');return;}
    const person = physical ? rows.profile : Array.isArray(rows) ? rows[0] : null;
    if (!person) {message('Профиль не найден', 'Этот ID отсутствует в реестре SCG. Не используйте бейдж для подтверждения членства.'); return;}
    if (!physical && person.personnel_id !== id) throw new Error('mismatched_id');
    if (physical && rows.state==='revoked')person.status='revoked';
    const state = badgeState(person.status), photo = publicAvatar(person.avatar_url);
    document.title = `${person.display_name} · ${physical ? rows.badge_label : id} — SCG`;
    card.innerHTML = `<div class="card-top"><span>STAGE CRAFT GROUP</span><span>${physical ? esc(rows.badge_label) : 'Digital badge'}</span></div>
      <div class="portrait-wrap">${photo ? `<img class="portrait" src="${esc(photo)}" alt="${esc(person.display_name)}" referrerpolicy="no-referrer">` : '<div class="portrait portrait-empty"><span aria-hidden="true">◎</span><small>Фотография не добавлена</small></div>'}</div>
      <div class="identity"><p class="person-role">${esc(badgeRole(person.role))}</p><h1>${esc(person.display_name || 'Имя не заполнено')}</h1><p class="personnel-id">${esc(person.personnel_id)}</p></div>
      <div class="verification ${state.valid ? 'is-active' : 'is-inactive'}"><span class="status-dot"></span><div><strong>${esc(state.title)}</strong><p>${state.valid ? 'Профиль найден в официальном реестре SCG' : 'Бейдж не подтверждает действующее членство'}</p></div></div>
      <div class="verified-time">Проверено сейчас · ${esc(new Intl.DateTimeFormat('ru-KZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Almaty'}).format(new Date()))} (UTC+5)</div>`;
    card.setAttribute('aria-busy','false');
    document.querySelector('#profile-model')?.remove();
    const artworkId=physical?rows.badge_label:id;
    try {
      const art=(await badgeArtwork()).find(item=>item.id===artworkId);
      if(art&&generation===requestGeneration){
        const detail=document.createElement('details');detail.className='profile-model';detail.id='profile-model';
        const summary=document.createElement('summary');summary.textContent='Посмотреть 3D-бейдж';detail.append(summary);
        const viewer=document.createElement('div');detail.append(viewer);card.after(detail);
        detail.addEventListener('toggle',()=>{if(detail.open&&!viewer.childElementCount)mountBadgeModel(viewer,art);});
      }
    }catch{/* Live verification remains available if artwork cannot load. */}
    const image = card.querySelector('img.portrait');
    image?.addEventListener('error', () => {image.replaceWith(Object.assign(document.createElement('p'),{className:'photo-error',textContent:'Фотография временно недоступна'}));});
  } catch {if(generation!==requestGeneration)return;message('Не удалось проверить профиль', 'Актуальный статус не подтверждён. Проверьте соединение и повторите запрос.', true);}
}
document.addEventListener('visibilitychange', () => {if (document.visibilityState === 'visible') load();});
await load();
