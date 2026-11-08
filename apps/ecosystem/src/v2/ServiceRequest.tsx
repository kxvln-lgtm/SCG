import {useCallback,useEffect,useState} from 'react';
import {db,Row,dateOf} from '../data';
import {labels,names,command,errorMessage} from './service-data';

const divisionNames:Record<string,string>={BSU:'The Backstage Union',BSS:'Backstage Staff',CB:'Creative Bureau',SCN:'Scenique'};
const streamStates:Record<string,string>={approved_to_staff:'Согласовано к комплектованию',recruiting:'Набор команды',partially_staffed:'Частично укомплектовано',staffed:'Команда собрана',active:'В работе',completed:'Завершено',blocked:'Приостановлено',cancelled:'Отменено'};
export function RequestDetail({request,refresh,close,admin=false,edit}:{request:Row;refresh:()=>Promise<void>;close:()=>void;admin?:boolean;edit?:(r:Row,items:Row[])=>void}){
 const [record,setRecord]=useState(request),[items,setItems]=useState<Row[]>([]),[proposals,setProposals]=useState<Row[]>([]),[streams,setStreams]=useState<Row[]>([]),[audit,setAudit]=useState<Row[]>([]);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[consent,setConsent]=useState(false),[revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  const rs=await Promise.all([
   db.from('service_requests').select('*').eq('id',request.id).single(),
   db.from('service_request_items').select('service_id,quantity,requirements').eq('request_id',request.id),
   db.from('service_proposals').select('id,version,total_kzt,terms,volunteer_terms,accepted_at,superseded_at').eq('request_id',request.id).order('version',{ascending:false}),
   db.from('service_workstreams').select('id,project_id,division,target_count,status').eq('request_id',request.id),
   db.from('service_audit_log').select('id,action,created_at,detail').eq('request_id',request.id).order('created_at',{ascending:false}).limit(25)
  ]);
  if(rs.some(r=>r.error)){setError('Не удалось загрузить заказ. Возможно, доступ изменился.');setLoading(false);return;}
  setRecord(rs[0].data as Row);setItems(rs[1].data as Row[]);setProposals(rs[2].data as Row[]);setStreams(rs[3].data as Row[]);setAudit(rs[4].data as Row[]);setConsent(false);setLoading(false);
 },[request.id]);
 useEffect(()=>{void load();},[load,revision]);
 async function act(action:string,data:Row={}){
  if(busy)return;setBusy(true);setError('');
  try{await command(action,{id:record.id,terms_accepted:consent,...data});setRevision(v=>v+1);await refresh();}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 const current=proposals.find(p=>!p.superseded_at);
 const canQuote=admin&&['submitted','under_review','awaiting_acceptance'].includes(record.status);
 return <section className="service-glass service-detail" aria-busy={busy||loading}>
  <div className="service-actions service-detail-top"><button onClick={close}>← Все заказы</button><button disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}>Обновить</button></div>
  <h2>{record.title}</h2><p className="service-status">{labels[record.status]}</p>
  {loading?<p role="status">Загружаем заказ…</p>:!error||items.length?<>
   <p>{record.city} · {record.venue}</p><p>{dateOf(record.starts_at,'ru',{hour:'2-digit',minute:'2-digit'})} — {dateOf(record.ends_at,'ru',{hour:'2-digit',minute:'2-digit'})} · UTC+5</p>
   {record.brief&&<p className="service-preline">{record.brief}</p>}
   <h3>Состав команды</h3>{items.map(i=><div key={i.service_id}><p className="service-row"><span>{names[i.service_id]||i.service_id}</span><b>{i.quantity}</b></p>{i.requirements&&<p>{i.requirements}</p>}</div>)}
   <p className="service-total">Всего участников: <b>{items.reduce((n,i)=>n+i.quantity,0)}</b></p>
   {!admin&&record.status==='draft'&&edit&&<button onClick={()=>edit(record,items)}>Изменить черновик</button>}
   {proposals.map(p=><article className="service-proposal" key={p.id}>
    <h3>Предложение · версия {p.version}</h3><p>{Number(p.total_kzt).toLocaleString('ru-KZ')} ₸ · оплачиваемые услуги</p>
    <p className="service-preline">{p.terms}</p>{p.volunteer_terms&&<><h4>Условия добровольного участия</h4><p className="service-preline">{p.volunteer_terms}</p></>}
    {p.superseded_at?<small>Заменено новой версией</small>:p.accepted_at?<p>{record.status==='confirmed'?'Принято клиентом и подтверждено HQ.':'Принято клиентом. Ожидается окончательное подтверждение HQ.'}</p>:!admin&&record.status==='awaiting_acceptance'&&<button disabled={busy||!consent} onClick={()=>void act('accept_proposal',{proposal_id:p.id})}>Принять предложение</button>}
   </article>)}
   {!admin&&(record.status==='draft'||(record.status==='awaiting_acceptance'&&!current?.accepted_at))&&<label className="service-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Подтверждаю требования и принимаю условия {record.status==='draft'?'подачи запроса':`предложения версии ${current?.version}`}. Это не электронная цифровая подпись.</label>}
   {!admin&&record.status==='draft'&&<button disabled={busy||!consent} onClick={()=>void act('submit_request')}>Отправить запрос SCG</button>}
   {canQuote&&<ProposalForm key={current?.id||'initial'} version={current?.version||0} hasVolunteers={items.some(i=>i.service_id==='volunteers')} onlyVolunteers={items.every(i=>i.service_id==='volunteers')} busy={busy} issue={d=>act('issue_proposal',d)}/>}
   {admin&&record.status==='awaiting_acceptance'&&current?.accepted_at&&<div className="service-proposal"><h3>Центральное согласование</h3><p>Клиент принял версию {current.version}. Подтверждение создаст направления для комплектования команды. Будут созданы черновики проектов; участники ещё не назначены.</p><button disabled={busy} onClick={()=>void act('confirm_request',{proposal_id:current.id})}>Подтвердить заказ и направления</button></div>}
   {streams.length>0&&<><h3>Направления заказа</h3>{streams.map(s=><p key={s.id}>{divisionNames[s.division]} · {s.target_count} участников · {streamStates[s.status]}</p>)}</>}
   {audit.length>0&&<details className="service-history"><summary>История заказа</summary><ol>{audit.map(a=><li key={a.id}>{dateOf(a.created_at,'ru',{hour:'2-digit',minute:'2-digit'})} — {({save_request:'Черновик сохранён',submit_request:'Запрос отправлен',issue_proposal:'Выпущено предложение',accept_proposal:'Предложение принято',confirm_request:'Заказ подтверждён',cancel_request:'Запрос отменён'} as Record<string,string>)[a.action]||'Действие с заказом'}</li>)}</ol></details>}
  </>:null}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
function ProposalForm({version,hasVolunteers,onlyVolunteers,busy,issue}:{version:number;hasVolunteers:boolean;onlyVolunteers:boolean;busy:boolean;issue:(d:Row)=>Promise<void>}){
 const [open,setOpen]=useState(false);
 if(!open)return <button onClick={()=>setOpen(true)}>{version?'Подготовить новую версию':'Подготовить предложение'}</button>;
 return <form className="service-proposal" onSubmit={e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget));void issue({...fields,expected_proposal_version:version});}}>
  <h3>Предложение · версия {version+1}</h3>{version>0&&<p>Новая версия потребует повторного согласия клиента.</p>}
  <label>Оплачиваемые услуги, ₸<input name="total_kzt" type="number" min="0" max="999999999999" step="0.01" required readOnly={onlyVolunteers} defaultValue="0"/></label>
  <label>Состав работ и коммерческие условия<textarea name="terms" rows={6} minLength={10} maxLength={20000} required placeholder="Объём, смены, сроки, условия оплаты и отмены"/></label>
  {hasVolunteers&&<label>Условия добровольного участия<textarea name="volunteer_terms" rows={5} minLength={10} maxLength={10000} required placeholder="Добровольность, задачи, сопровождение, питание, транспорт, возрастные ограничения"/></label>}
  <div className="service-actions"><button type="button" disabled={busy} onClick={()=>setOpen(false)}>Закрыть</button><button type="submit" disabled={busy}>Отправить клиенту</button></div>
 </form>;
}
