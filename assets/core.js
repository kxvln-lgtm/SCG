export const CONFIG = Object.freeze({
  supabaseUrl: 'https://snmcoapfubdnvaoowjjk.supabase.co',
  publishableKey: 'sb_publishable_xUhRuWKpfJ58JEiHu4ygHw_44etd9SJ',
  website: 'https://stagecraft.kz',
  admin: 'https://admin.stagecraft.kz',
  version: '2.0.0',
});

export const $ = (selector, root = document) => root.querySelector(selector);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const nameOf = person => [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Участник SCG';
export const initials = person => [person?.first_name?.[0], person?.last_name?.[0]].filter(Boolean).join('') || 'SC';
export const roleName = role => ({FOUNDER:'Основатель',UNION_LEAD:'Union Lead',REGIONAL_EXECUTIVE:'Региональный руководитель',STAFF:'Команда',PR:'PR и коммуникации',SYSTEMS:'Системы',QUORUM:'Quorum',CAST:'Cast',VOLUNTEER:'Волонтёр'}[role] || 'Участник');
export const statusName = status => ({open:'Набор открыт',closed:'Набор закрыт',completed:'Завершён',draft:'Черновик',pending:'На рассмотрении',approved:'Одобрена',rejected:'Отклонена',cancelled:'Отменена',assigned:'Назначен',checked_in:'На смене',new:'Новое',in_progress:'В работе',resolved:'Решено'}[status] || status || '—');
export function safeUrl(value, options = {}) {
  try { const u = new URL(String(value), location.origin); return u.protocol === 'https:' || (options.local && u.origin === location.origin) ? u.href : ''; } catch { return ''; }
}
export function date(value, options = {}) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Дата уточняется';
  return new Intl.DateTimeFormat('ru-KZ', {day:'numeric',month:'long',timeZone:'Asia/Almaty',...options}).format(new Date(value));
}
export function shortDate(value) { return date(value,{month:'short',year:'numeric'}); }
export function localDateTime(value) {
  if (!value) return '';
  const d = new Date(value); if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d).replace(' ','T');
}
export function kazakhTimestamp(value) { return value ? new Date(`${value}:00+05:00`).toISOString() : null; }
export function errorText(error) {
  const message = String(error?.message || error || '');
  if (/Invalid login credentials/i.test(message)) return 'Email или пароль не совпадают.';
  if (/Email not confirmed/i.test(message)) return 'Сначала подтверди email по ссылке в письме.';
  if (/already registered|already been registered/i.test(message)) return 'Аккаунт с этим email уже существует. Войди или восстанови пароль.';
  if (/rate|too many|429|REQUEST_LIMIT/i.test(message)) return 'Слишком много запросов. Попробуй немного позже.';
  if (/password.*(?:least|minimum)|weak.*password/i.test(message)) return 'Используй пароль длиной не менее 10 символов.';
  if (/expired|invalid.*token|otp|session.*missing/i.test(message)) return 'Ссылка устарела или уже использована. Запроси новую.';
  if (/42501|permission|FORBIDDEN|PROTECTED|not authorized|row-level security/i.test(message)) return 'Для этого действия недостаточно прав.';
  if (/duplicate|23505/i.test(message)) return 'Такая запись уже существует.';
  if (/fetch|network|timeout/i.test(message)) return 'Не удалось соединиться. Проверь интернет и повтори.';
  return 'Не удалось выполнить действие. Попробуй ещё раз или обратись в поддержку.';
}
export async function result(promise) { const r = await promise; if (r.error) throw r.error; return r.data; }
export async function busy(button, task) {
  if (button?.disabled) return;
  const text = button?.innerHTML;
  if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); button.textContent = 'Подожди…'; }
  try { return await task(); } finally { if (button?.isConnected) { button.disabled = false; button.removeAttribute('aria-busy'); button.innerHTML = text; } }
}
export function toast(message, kind = 'success') {
  const stack = $('#toasts'); if (!stack) return;
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = message; el.setAttribute('role',kind==='error'?'alert':'status'); stack.append(el);
  setTimeout(() => el.remove(),6500);
}
export function icon(name, cls = '') {
  const paths = {
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',arrowUp:'<path d="M6 18 18 6M6 6h12v12"/>',home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',projects:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M8 5V3h8v2M3 11h18"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a4 4 0 0 1 3 4v2"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',document:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',support:'<circle cx="12" cy="12" r="9"/><path d="M7 8a5 5 0 0 1 10 0M7 8v6H4M17 8v6h3M16 16a4 4 0 0 1-4 4"/>',bo:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',settings:'<path d="m12 3 2 3 4-1 1 4 3 3-3 3-1 4-4-1-2 3-2-3-4 1-1-4-3-3 3-3 1-4 4 1z"/><circle cx="12" cy="12" r="3"/>',logout:'<path d="M9 4H4v16h5M10 12h11M17 8l4 4-4 4"/>',search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m4 12 5 5L20 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',shield:'<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6zM8 12l3 3 5-6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0"/><circle cx="12" cy="10" r="2"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',heart:'<path d="M12 20 3 11a5 5 0 0 1 9-5 5 5 0 0 1 9 5z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 5 9 8 9-8"/>',chart:'<path d="M4 3v18h18M8 16v-4M13 16V7M18 16V4"/>',content:'<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4"/>',chevron:'<path d="m9 5 7 7-7 7"/>',link:'<path d="m9 15 6-6M8 7 6 5a4 4 0 0 0-5 6l3 3a4 4 0 0 0 6 0M14 10a4 4 0 0 1 6 0l3 3a4 4 0 0 1-6 5l-2-2"/>',id:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4 16a4 4 0 0 1 8 0M14 10h5M14 14h4"/>',edit:'<path d="m14 4 6 6M3 21l5-1L21 7l-5-5L3 15z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7"/><circle cx="12" cy="12" r="3"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',send:'<path d="m2 3 20 9-20 9 4-9zM6 12h16"/>',archive:'<path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6"/>'
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
}
export function empty(title, description, action = '', symbol = 'projects') { return `<div class="empty-state"><span class="empty-symbol">${icon(symbol)}</span><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`; }
export function loading() { return '<div class="loading-state" role="status"><span class="spinner"></span> Загружаем…</div>'; }
export function avatar(person, cls = '') { const u = safeUrl(person?.avatar_url); return `<span class="avatar ${cls}">${u?`<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:esc(initials(person))}</span>`; }
export function badge(status) { return `<span class="badge badge-${esc(status)}">${esc(statusName(status))}</span>`; }
export function pageHeader(eyebrow, title, description = '', actions = '') { return `<div class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`; }
let previousFocus;
export function openDialog(title, markup) { const d = $('#dialog'); previousFocus = document.activeElement; $('#dialog-title').textContent = title; $('#dialog-content').innerHTML = markup; d.showModal(); }
export function closeDialog() { $('#dialog')?.close(); previousFocus?.focus?.(); }
export function initCommon() {
  document.addEventListener('click', e => { if (e.target.closest('[data-close-dialog]')) closeDialog(); });
  $('#dialog')?.addEventListener('click',e=>{if(e.target===$('#dialog'))closeDialog();});
  window.addEventListener('offline',()=>toast('Соединение пропало. Несохранённые поля остаются на странице.','error'));
  const saved = localStorage.getItem('scg-color-scheme'); if (['light','dark'].includes(saved)) document.documentElement.dataset.theme = saved;
}
