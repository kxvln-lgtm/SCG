// Shared display helpers. The database remains authoritative for access decisions.
export const personnelPattern = /^(FH|UL|RE|ST|PR|SY|QR|CS|VL)-[0-9]{3,10}$/;
export const badgeTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function normalizeBadgeCode(input) {
  let value = String(input ?? '').trim();
  if (!value || value.length > 256) return '';
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== 'https://stagecraft.kz' || url.username || url.password || url.hash) return '';
      if(url.pathname === '/badge.html') {
        if(Array.from(url.searchParams.keys()).join(',') !== 'code')return '';
        const token=url.searchParams.get('code')||'';
        return badgeTokenPattern.test(token) ? 'BADGE:'+token.toLowerCase() : '';
      }
      if(url.pathname !== '/profile.html' || Array.from(url.searchParams.keys()).join(',') !== 'id')return '';
      value = url.searchParams.get('id') || '';
      if (!personnelPattern.test(value.toUpperCase())) return '';
    } catch { return ''; }
  }
  value = value.replace(/^SCG-CHECKIN:/i, '').trim().toUpperCase();
  if (personnelPattern.test(value) || /^VB-[0-9]{3,10}$/.test(value) || /^(SCD|SCG)[A-Z0-9-]{3,96}$/.test(value)) return value;
  return '';
}
export const badgeRole = role => ({FOUNDER:'FOUNDER & HEAD',UNION_LEAD:'UNION LEAD',REGIONAL_EXECUTIVE:'REGIONAL EXECUTIVE',STAFF:'STAFF',PR:'PR',SYSTEMS:'SYSTEMS',QUORUM:'QUORUM',CAST:'CAST',VOLUNTEER:'VOLUNTEER'}[role] || 'Участник SCG');
export const badgeState = status => ({active:{title:'Участник активен',valid:true},revoked:{title:'Бейдж отозван',valid:false},inactive:{title:'Членство неактивно',valid:false},unassigned:{title:'Бейдж свободен',valid:false},unknown:{title:'Бейдж не найден',valid:false},invalid:{title:'Недействительный код',valid:false}}[status] || {title:'Статус не подтверждён',valid:false});
export function publicAvatar(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.protocol !== 'https:' || url.search || url.hash) return '';
    if ((url.origin === 'https://snmcoapfubdnvaoowjjk.supabase.co' && url.pathname.startsWith('/storage/v1/object/public/avatars/')) ||
        (url.origin === 'https://stagecraft.kz' && url.pathname.startsWith('/assets/'))) return url.href;
  } catch {}
  return '';
}
