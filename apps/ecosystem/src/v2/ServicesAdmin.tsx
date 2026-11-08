import {useEffect,useState} from 'react';
import {db,Row} from '../data';
import {labels,command,errorMessage,useServices} from './service-data';
import {RequestDetail} from './ServiceRequest';
import './services.css';

type Gate='loading'|'denied'|'mfa'|'ready'|'error';
export function ServicesAdmin(){
 const [gate,setGate]=useState<Gate>('loading'),[factor,setFactor]=useState(''),[qr,setQr]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function inspect(){
  setGate('loading');setError('');
  try{
   const {data:s,error:se}=await db.auth.getUser();if(se||!s.user){setGate('denied');return;}
   const p=await db.from('profiles').select('role,status').eq('id',s.user.id).single();if(p.error)throw p.error;
   if(p.data.role!=='FOUNDER'||!['активен','одобрено'].includes(p.data.status)){setGate('denied');return;}
   const a=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(a.error)throw a.error;
   if(a.data.currentLevel==='aal2'){setGate('ready');return;}
   const f=await db.auth.mfa.listFactors();if(f.error)throw f.error;
   setFactor(f.data.totp.find(x=>x.status==='verified')?.id||'');setGate('mfa');
  }catch{setGate('error');}
 }
 useEffect(()=>{void inspect();},[]);
 async function enroll(){
  setBusy(true);setError('');
  try{const r=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'SCG HQ '+new Date().toISOString().slice(0,16),issuer:'Stage Craft Group'});if(r.error)throw r.error;setFactor(r.data.id);setQr(r.data.totp.qr_code);}
  catch{setError('Не удалось подключить аутентификатор. Повторите попытку.');}finally{setBusy(false);}
 }
 async function verify(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await db.auth.mfa.challengeAndVerify({factorId:factor,code});if(r.error)throw r.error;setQr('');setCode('');await inspect();}
  catch{setError('Код не принят. Проверьте время на телефоне и введите новый код.');}finally{setBusy(false);}
 }
 return <div className="services-app services-admin">
  {gate==='loading'?<p role="status">Проверяем доступ…</p>:gate==='denied'?<><h1>Доступ ограничен</h1><p>Центральное согласование SCG Services доступно основателю с активным профилем.</p></>:gate==='error'?<><p role="alert">Не удалось проверить доступ.</p><button onClick={()=>void inspect()}>Повторить</button></>:gate==='mfa'?<section className="service-glass service-mfa"><h1>Защита центрального доступа</h1><p>Для решений по организациям и заказам подтвердите вход кодом из аутентификатора.</p>
   {!factor?<button disabled={busy} onClick={()=>void enroll()}>Подключить аутентификатор</button>:<form onSubmit={verify}>{qr&&<><p>Добавьте QR-код в приложение аутентификатора и введите код. QR содержит секрет доступа; сохраните его только в своём защищённом приложении.</p><img className="service-mfa-qr" src={qr} alt="QR-код подключения аутентификатора"/></>}<label>Код аутентификатора<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><button disabled={busy} type="submit">Подтвердить доступ</button></form>}{error&&<p role="alert">{error}</p>}</section>:<ServicesQueue/>}
 </div>;
}
function ServicesQueue(){
 const api=useServices(true),[tab,setTab]=useState('orders'),[selected,setSelected]=useState<Row|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function review(e:React.FormEvent<HTMLFormElement>,id:string){
  e.preventDefault();if(busy)return;setBusy(true);setError('');const data=Object.fromEntries(new FormData(e.currentTarget));
  try{await command('review_organization',{id,...data});await api.reload();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 return <>
  <header className="services-heading"><span className="services-eyebrow">SCG ADMIN / SERVICES</span><h1>Согласование.</h1><nav aria-label="Очередь Services"><button aria-pressed={tab==='orders'} onClick={()=>{setTab('orders');setSelected(null);}}>Заказы</button><button aria-pressed={tab==='organizations'} onClick={()=>setTab('organizations')}>Организации</button></nav></header>
  {api.loading?<p role="status">Загружаем очередь…</p>:api.error?<p role="alert">{api.error}<button onClick={()=>void api.reload()}>Повторить</button></p>:tab==='orders'?(selected?<RequestDetail request={selected} admin refresh={api.reload} close={()=>setSelected(null)}/>:<section className="service-glass"><h2>Заказы на согласовании</h2>{api.requests.filter(r=>r.status!=='draft').length?api.requests.filter(r=>r.status!=='draft').map(r=><button className="service-row" key={r.id} onClick={()=>setSelected(r)}><strong>{r.title}</strong><span>{api.organizations.find(o=>o.id===r.organization_id)?.legal_name}</span><span>{labels[r.status]}</span></button>):<p>Отправленных заказов пока нет.</p>}</section>):<><p>Проверьте регистрацию и полномочия представителя. Решение и основание записываются в журнал.</p>{api.organizations.length?api.organizations.map(o=><form className="service-glass" key={o.id} onSubmit={e=>void review(e,o.id)}><h2>{o.legal_name}</h2><p>{o.legal_form==='legal_entity'?'Юридическое лицо':'ИП'} · {o.registration_id} · {o.city}</p><p>{labels[o.status]}</p>{o.review_reason&&<p>Последнее решение: {o.review_reason}</p>}<label>Решение<select name="status"><option value="needs_information">Запросить сведения</option><option value="verified">Подтвердить</option><option value="rejected">Отклонить</option><option value="suspended">Приостановить</option></select></label><label>Основание и ссылка на проверку<textarea name="reason" required minLength={5} maxLength={5000}/></label><label className="service-consent"><input type="checkbox" required/>Проверены регистрационные сведения и полномочия представителя.</label><button type="submit" disabled={busy}>Сохранить решение</button></form>):<p>Организаций на проверке нет.</p>}</>}
  {error&&<p role="alert">{error}</p>}
 </>;
}
