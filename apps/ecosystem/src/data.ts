import {createClient} from '@supabase/supabase-js';
export const SUPABASE_URL='https://snmcoapfubdnvaoowjjk.supabase.co';
export const PUBLIC_KEY='sb_publishable_xUhRuWKpfJ58JEiHu4ygHw_44etd9SJ';
export const db=createClient(SUPABASE_URL,PUBLIC_KEY,{auth:{storageKey:location.hostname.endsWith('stagecraft.kz')&&location.hostname!=='beta.stagecraft.kz'?'sb-snmcoapfubdnvaoowjjk-auth-token':'scg-essentials-beta-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export type Row=Record<string,any>;
export const PROFILE_FIELDS='id,first_name,last_name,city,role,status,department,department_id,region,phone,birth_date,bio,avatar_url,personnel_id,language,theme,created_at,source_hours,badge_revoked_at,photo_urls,experience,education';
export const directions=[
 {id:'BSU',legacy:'UNION',name:'The Backstage Union',copy:['Волонтёры и сообщества. Люди, с которых начинается событие.','Еріктілер мен қауымдастықтар. Оқиғаны бастайтын адамдар.','Volunteers and communities. The people who make events happen.']},
 {id:'BSS',legacy:'STAFF',name:'Backstage Staff',copy:['Команда площадки. Координация, логистика, рабочие процессы.','Алаң командасы. Үйлестіру, логистика және жұмыс барысы.','Event operations. Coordination, logistics and the crew behind it.']},
 {id:'CB',legacy:'PR',name:'Creative Bureau',copy:['Идеи обретают форму. Дизайн, контент и креатив.','Идеялар пішінге енеді. Дизайн, контент және шығармашылық.','Ideas take shape. Design, content and creative work.']},
 {id:'SCN',legacy:'CAST',name:'Scenique',copy:['Люди в кадре и на сцене. Кастинги, модели, движение.','Кадр мен сахнадағы адамдар. Кастинг, модельдер, қозғалыс.','Talent on camera and on stage. Casting, models and movement.']}
];
export function directionOf(p?:Row|null){return directions.find(d=>[d.id,d.legacy].includes(String(p?.department||p?.direction||'').toUpperCase()))||directions[0]}
export function safeUrl(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:'?u.href:''}catch{return ''}}
export function imageUrl(value:unknown){const s=safeUrl(value);return /\.(png|jpe?g|webp|avif)(?:\?|$)/i.test(s)||s.includes('/storage/v1/object/public/')?s:''}
export function nameOf(p:Row|null){return [p?.first_name,p?.last_name].filter(Boolean).join(' ')}
export function errText(e:unknown){return e instanceof Error?e.message:typeof e==='object'&&e&&'message'in e?String(e.message):String(e)}
export function dateOf(value:unknown,lang:string,opts:Intl.DateTimeFormatOptions={}){if(!value||!Number.isFinite(new Date(String(value)).getTime()))return '—';return new Intl.DateTimeFormat(lang==='kz'?'kk-KZ':lang==='en'?'en-GB':'ru-KZ',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Almaty',...opts}).format(new Date(String(value)))}
export function withProjects(assignments:Row[],projects:Row[]):(Row & {project:Row})[]{return assignments.flatMap(a=>{const project=projects.find(p=>p.id===a.project_id);return project?[{...a,project}]:[]})}
export function upcoming(assignments:Row[],projects:Row[],now=Date.now()){return withProjects(assignments,projects).filter(a=>['assigned','checked_in'].includes(a.status)&&a.project.status!=='completed'&&new Date(a.project.end_time||a.project.event_date||0).getTime()>=now).sort((a,b)=>new Date(a.project.start_time||a.project.event_date).getTime()-new Date(b.project.start_time||b.project.event_date).getTime())}
export function confirmedHours(rows:Row[]){return rows.reduce((n,r)=>n+(Number(r.hours)||0),0)}
