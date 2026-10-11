import {webhookGate} from '../_shared/telegram.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
const H={"Content-Type":"application/json"};const R=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const TG=(t,m,b)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
const UI={ru:{welcome:"Добро пожаловать в Backstage ",profile:" Мой профиль",projects:" Мои проекты",available:" Доступные проекты",stats:" Моя статистика",hours:" Мои часы",certs:" Сертификаты",settings:" Настройки",back:" Назад",apply:" Подать заявку",applied:" Заявка уже подана",assigned:"Ты уже назначен",checkin:" Я на месте",checkout:" Завершить смену",none:"Пока ничего нет.",on:"Включены",off:"Выключены",confirm:"Проверь данные:",confirmYes:"Подтвердить",restart:"Начать заново",registered:"Профиль создан!",askIdFront:"Отправь фото удостоверения личности (лицевая сторона)",askIdBack:"Теперь отправь обратную сторону удостоверения",notAPhoto:"Пожалуйста, отправь именно фото.",askConsent:"Согласен(на) на обработку персональных данных SCG в соответствии с политикой конфиденциальности?",consentYes:" Согласен(на)",consentNo:"Отмена",consentDeclined:"Без согласия на обработку данных регистрацию завершить нельзя.",uploadFailed:"Не удалось сохранить фото, попробуй ещё раз.",docsSaved:"Документы сохранены"},kz:{welcome:"Backstage-ке қош келдің",profile:" Менің профилім",projects:" Менің жобаларым",available:" Қолжетімді жобалар",stats:" Статистикам",hours:" Сағаттарым",certs:" Сертификаттар",settings:" Баптаулар",back:" Артқа",apply:" Өтінім беру",applied:" Өтінім берілген",assigned:"Сен тағайындалдың",checkin:" Мен орнындамын",checkout:" Ауысымды аяқтау",none:"Әзірге ештеңе жоқ.",on:"Қосулы",off:"Өшірулі",confirm:"Деректерді тексер:",confirmYes:"Растау",restart:"Қайта бастау",registered:"Профиль құрылды!",askIdFront:"Жеке куәліктің суретін жібер (алдыңғы беті)",askIdBack:"Енді артқы бетін жібер",notAPhoto:"Өтінемін, нақты фото жібер.",askConsent:"SCG құпиялылық саясатына сәйкес дербес деректерді өңдеуге келісесіз бе?",consentYes:" Келісемін",consentNo:"Бас тарту",consentDeclined:"Деректерді өңдеуге келісімсіз тіркеуді аяқтау мүмкін емес.",uploadFailed:"Фотоны сақтау мүмкін болмады, қайта көріңіз.",docsSaved:"Құжаттар сақталды"},en:{welcome:"Welcome to Backstage",profile:" My profile",projects:" My projects",available:" Available projects",stats:" My statistics",hours:" My hours",certs:" Certificates",settings:" Settings",back:" Back",apply:" Apply",applied:" Already applied",assigned:"Already assigned",checkin:" I'm here",checkout:" Finish shift",none:"Nothing here yet.",on:"On",off:"Off",confirm:"Review your details:",confirmYes:"Confirm",restart:"Start over",registered:"Profile created!",askIdFront:"Send a photo of your ID document (front side)",askIdBack:"Now send the back side",notAPhoto:"Please send an actual photo.",askConsent:"Do you consent to SCG processing your personal data per the privacy policy?",consentYes:" I consent",consentNo:"Cancel",consentDeclined:"Registration can't finish without consent to data processing.",uploadFailed:"Couldn't save the photo, please try again.",docsSaved:"Documents saved"}};
const F=["first_name","last_name","birth_date","phone","email","city","region","department","direction","about","education","experience"];
const L={ru:["Имя","Фамилия","Дата рождения (ДД.ММ.ГГГГ)","Номер телефона","Email","Город","Регион","Подразделение","Направление","О себе","Образование / место учёбы","Навыки и опыт в проектах"],kz:["Аты","Тегі","Туған күні (КК.АА.ЖЖЖЖ)","Телефон","Email","Қала","Өңір","Бөлім","Бағыт","Өзің туралы","Білім / оқу орны","Жобалардағы дағды мен тәжірибе"],en:["First name","Last name","Date of birth (DD.MM.YYYY)","Phone","Email","City","Region","Department","Direction","About you","Education / school","Skills & project experience"]};
const langPicker=(t,c)=>TG(t,"sendMessage",{chat_id:c,text:"Выбери язык / Тілді таңда / Choose language",reply_markup:{inline_keyboard:[[{text:"Русский",callback_data:"lang:ru"},{text:"Қазақша",callback_data:"lang:kz"},{text:"English",callback_data:"lang:en"}]]}});
const langOf=async(s,id)=>{const {data}=await s.from("profiles").select("language").eq("telegram_id",id).maybeSingle();return (data&&data.language)||"ru"};
function menuKb(l){const u=UI[l];return {inline_keyboard:[[{text:u.profile,callback_data:"m:profile"},{text:u.projects,callback_data:"m:projects"}],[{text:u.available,callback_data:"m:available"}],[{text:u.stats,callback_data:"m:stats"},{text:u.hours,callback_data:"m:hours"}],[{text:u.certs,callback_data:"m:certs"},{text:u.settings,callback_data:"m:settings"}]]}}
async function menu(s,t,c,id){const l=await langOf(s,id),u=UI[l];return TG(t,"sendMessage",{chat_id:c,text:"BACKSTAGE\n\n"+u.welcome,reply_markup:menuKb(l)})}
async function start(s,t,c,tid,u,l){await s.from("telegram_registration_sessions").upsert({telegram_id:tid,chat_id:c,step:"first_name",data:{telegram_username:u,language:l},updated_at:new Date().toISOString()},{onConflict:"telegram_id"});return ask(t,c,"first_name",l)}
async function ask(t,c,step,l){let k;const i=F.indexOf(step);if(step==="phone")k={keyboard:[[{text:"Send phone",request_contact:true}]],resize_keyboard:true,one_time_keyboard:true};if(step==="region")k={inline_keyboard:["Север","Юг","Центр","Запад","Восток"].map(x=>[{text:x,callback_data:"v:"+x}])};if(step==="department")k={inline_keyboard:["Union","Cast","PR","Quorum","Staff","Systems"].map(x=>[{text:x,callback_data:"v:"+x}])};if(step==="direction")k={inline_keyboard:["Volunteer","Media","HR","Projects","Creative","Operations"].map(x=>[{text:x,callback_data:"v:"+x}])};return TG(t,"sendMessage",{chat_id:c,text:(i+1)+"/"+F.length+" — "+L[l][i],reply_markup:k})}
function dateParse(v){const m=v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);if(!m)return null;const d=+m[1],mo=+m[2],y=+m[3],x=new Date(Date.UTC(y,mo-1,d));return x.getUTCFullYear()==y&&x.getUTCMonth()==mo-1&&x.getUTCDate()==d?y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0"):null}
function isEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
async function certs(s,t,c,id,l){const {data:p}=await s.from("profiles").select("id").eq("telegram_id",id).maybeSingle();if(!p)return;const {data:cs,error}=await s.from("certificates").select("certificate_number,hours,role,issued_at").eq("user_id",p.id).order("issued_at",{ascending:false}).limit(10);if(error)throw error;const text=(cs&&cs.length)?cs.map(x=>""+(x.certificate_number||"Certificate")+"\n"+(x.issued_at||"")+(x.hours?" · "+x.hours+" ч.":"")+(x.role?" · "+x.role:"")).join("\n\n"):UI[l].none;return TG(t,"sendMessage",{chat_id:c,text:UI[l].certs+"\n\n"+text,reply_markup:{inline_keyboard:[[{text:UI[l].back,callback_data:"m:back"}]]}})}
async function finishRegistration(s,t,c,tid,l){
  const q=await s.from("telegram_registration_sessions").select("data").eq("telegram_id",tid).maybeSingle();if(!q.data)return;
  const d=q.data.data||{},uid=crypto.randomUUID();
  const r=await s.rpc("make_scd_id",{p_birth_date:d.birth_date||null,p_user_id:uid});if(r.error)throw r.error;
  const p={id:uid,first_name:d.first_name||"",last_name:d.last_name||"",birth_date:d.birth_date||null,phone:d.phone||null,contact:d.phone||null,
    city:d.city||null,region:d.region||null,department:d.department||null,direction:d.direction||null,about:d.about||null,
    education:d.education||null,experience:d.experience||null,
    scd_id:r.data,role:"VOLUNTEER",status:"активен",telegram_id:tid,telegram_username:d.telegram_username||null,language:l,theme:"light"};
  const ins=await s.from("profiles").insert(p);if(ins.error)throw ins.error;
  await s.from("telegram_registration_sessions").update({step:"await_id_front",data:Object.assign({},d,{profile_id:uid}),updated_at:new Date().toISOString()}).eq("telegram_id",tid);
  return TG(t,"sendMessage",{chat_id:c,text:UI[l].registered+"\n\nSCD ID: "+r.data+"\n\n"+UI[l].askIdFront})
}
async function saveTelegramPhoto(s,t,fileId,profileId,path){
  const fr=await (await fetch("https://api.telegram.org/bot"+t+"/getFile?file_id="+fileId)).json();
  const filePath=fr&&fr.result&&fr.result.file_path;if(!filePath)return null;
  const bin=await (await fetch("https://api.telegram.org/file/bot"+t+"/"+filePath)).arrayBuffer();
  const ext=(filePath.split(".").pop()||"jpg").toLowerCase();
  const fullPath=profileId+"/"+path+"."+ext;
  const up=await s.storage.from("identity-documents").upload(fullPath,new Uint8Array(bin),{contentType:"image/jpeg",upsert:true});
  if(up.error)return null;
  return fullPath;
}
async function askConsent(t,c,l){return TG(t,"sendMessage",{chat_id:c,text:UI[l].askConsent,reply_markup:{inline_keyboard:[[{text:UI[l].consentYes,callback_data:"consent:yes"}],[{text:UI[l].consentNo,callback_data:"consent:no"}]]}})}
async function deletePrompt(t,c,l){const text=l==="kz"?"Профильді жою керек пе? Бұл әрекетті қайтару мүмкін емес.":l==="en"?"Delete your profile? This cannot be undone.":"Удалить профиль? Это действие нельзя отменить.";return TG(t,"sendMessage",{chat_id:c,text:text,reply_markup:{inline_keyboard:[[{text:l==="kz"?"Иә, жою":l==="en"?"Yes, delete":"Да, удалить",callback_data:"delete:yes"}],[{text:UI[l].back,callback_data:"m:settings"}]]}})}
async function settings(s,t,c,id,l){const {data:p}=await s.from("profiles").select("language,telegram_notifications_enabled,project_notifications_enabled,announcement_notifications_enabled").eq("telegram_id",id).maybeSingle();if(!p)return;const u=UI[l];return TG(t,"sendMessage",{chat_id:c,text:u.settings,reply_markup:{inline_keyboard:[[{text:p.language,callback_data:"set:lang"}],[{text:(p.telegram_notifications_enabled?u.on:u.off),callback_data:"set:notif"}],[{text:(p.project_notifications_enabled?u.on:u.off),callback_data:"set:projects"}],[{text:(p.announcement_notifications_enabled?u.on:u.off),callback_data:"set:announcements"}],[{text:(l==="kz"?"Профильді жою":l==="en"?"Delete profile":"Удалить профиль"),callback_data:"delete:ask"}],[{text:u.back,callback_data:"m:back"}]]}})}
async function profile(s,t,c,id,l){const {data:p}=await s.from("profiles").select("first_name,last_name,status,scd_id,role,department,direction,city,region").eq("telegram_id",id).maybeSingle();if(!p)return;return TG(t,"sendMessage",{chat_id:c,text:p.first_name+" "+p.last_name+"\n\nSCD ID: "+(p.scd_id||"—")+"\nСтатус: "+(p.status||"—")+"\nРоль: "+(p.role||"—")+"\nПодразделение: "+(p.department||"—")+"\nНаправление: "+(p.direction||"—")+"\nГород: "+(p.city||"—")+"\nРегион: "+(p.region||"—"),reply_markup:{inline_keyboard:[[{text:UI[l].back,callback_data:"m:back"}]]}})}
async function projects(s,t,c,id,l,available){const u=UI[l];const {data:p}=await s.from("profiles").select("id").eq("telegram_id",id).maybeSingle();if(!p)return;if(available){const {data:ps,error}=await s.from("projects").select("id,title,location,event_date,start_time").eq("status","open").order("event_date",{ascending:true}).limit(12);if(error)throw error;if(!ps||!ps.length)return TG(t,"sendMessage",{chat_id:c,text:u.none,reply_markup:{inline_keyboard:[[{text:u.back,callback_data:"m:back"}]]}});const ids=ps.map(x=>x.id);const res=await Promise.all([s.from("project_applications").select("project_id,status").eq("user_id",p.id).in("project_id",ids),s.from("project_assignments").select("project_id,status").eq("user_id",p.id).in("project_id",ids)]);const apps=res[0].data,ass=res[1].data;const am=new Map((apps||[]).map(x=>[x.project_id,x])),sm=new Map((ass||[]).map(x=>[x.project_id,x]));for(const x of ps){const a=am.get(x.id),z=sm.get(x.id);const bt=z?u.assigned:a?u.applied:u.apply;await TG(t,"sendMessage",{chat_id:c,text:"<b>"+x.title+"</b>\n\n"+(x.event_date||"—")+(x.start_time?" · "+x.start_time:"")+"\n"+(x.location||"—"),parse_mode:"HTML",reply_markup:{inline_keyboard:[[{text:bt,callback_data:(z||a)?"noop":"apply:"+x.id}]]}})}return TG(t,"sendMessage",{chat_id:c,text:".",reply_markup:{inline_keyboard:[[{text:u.back,callback_data:"m:back"}]]}})}const {data:as,error}=await s.from("project_assignments").select("id,status,team_role,projects(title,location,event_date)").eq("user_id",p.id).order("created_at",{ascending:false}).limit(10);if(error)throw error;if(!as||!as.length)return TG(t,"sendMessage",{chat_id:c,text:u.none,reply_markup:{inline_keyboard:[[{text:u.back,callback_data:"m:back"}]]}});for(const a of as){const x=a.projects||{};const kb=a.status==="assigned"?[[{text:u.checkin,callback_data:"checkin:"+a.id}]]:a.status==="checked_in"?[[{text:u.checkout,callback_data:"checkout:"+a.id}]]:[];await TG(t,"sendMessage",{chat_id:c,text:"<b>"+(x.title||"Project")+"</b>\n"+(x.location||"—")+"\n"+(a.team_role||"—")+"\n"+a.status,parse_mode:"HTML",reply_markup:kb.length?{inline_keyboard:kb}:undefined})}return TG(t,"sendMessage",{chat_id:c,text:".",reply_markup:{inline_keyboard:[[{text:u.back,callback_data:"m:back"}]]}})}
async function stats(s,t,c,id,l){const {data:p}=await s.from("profiles").select("id").eq("telegram_id",id).maybeSingle();if(!p)return;const a=await s.from("project_assignments").select("*",{count:"exact",head:true}).eq("user_id",p.id);const h=await s.from("volunteer_hours").select("hours").eq("user_id",p.id);const ce=await s.from("certificates").select("*",{count:"exact",head:true}).eq("user_id",p.id);const total=(h.data||[]).reduce((n,x)=>n+Number(x.hours||0),0);return TG(t,"sendMessage",{chat_id:c,text:UI[l].stats+"\n\nПроектов: "+(a.count||0)+"\nЧасов: "+total+"\nСертификатов: "+(ce.count||0),reply_markup:{inline_keyboard:[[{text:UI[l].back,callback_data:"m:back"}]]}})}
Deno.serve(async req=>{try{
  const t=Deno.env.get("TELEGRAM_BOT_TOKEN"),u=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!t||!u||!key)return R({ok:false},500);const blocked=await webhookGate(req,t,u,'telegram-registration-v2');if(blocked)return blocked;
  const s=createClient(u,key,{auth:{persistSession:false,autoRefreshToken:false}});
  
  const z=await req.json(),m=z.message,b=z.callback_query,c=(m&&m.chat)||(b&&b.message&&b.message.chat),f=(m&&m.from)||(b&&b.from);
  if(!c||!c.id||!f||!f.id||c.type!=="private"||c.id!==f.id)return R({ok:true});
  const cid=+c.id,tid=+f.id,un=f.username||"";
  if(b){
    await TG(t,"answerCallbackQuery",{callback_query_id:b.id});
    const x=String(b.data||"");
    if(x.startsWith("lang:")){const l=x.slice(5);const {data:p}=await s.from("profiles").select("id").eq("telegram_id",tid).maybeSingle();if(p){await s.from("profiles").update({language:l}).eq("telegram_id",tid);return menu(s,t,cid,tid)}return start(s,t,cid,tid,un,l)}
    const l=await langOf(s,tid),u=UI[l];
    if(x==="m:back")return menu(s,t,cid,tid);
    if(x==="m:profile")return profile(s,t,cid,tid,l);
    if(x==="m:projects")return projects(s,t,cid,tid,l,false);
    if(x==="m:available")return projects(s,t,cid,tid,l,true);
    if(x==="m:stats"||x==="m:hours")return stats(s,t,cid,tid,l);
    if(x==="m:settings")return settings(s,t,cid,tid,l);
    if(x==="m:certs")return certs(s,t,cid,tid,l);
    if(x==="delete:ask")return deletePrompt(t,cid,l);
    if(x==="delete:yes"){const {data:p}=await s.from("profiles").select("id").eq("telegram_id",tid).maybeSingle();if(p){await s.from("communities").update({created_by:null}).eq("created_by",p.id);await s.from("profiles").delete().eq("id",p.id)}await s.from("telegram_registration_sessions").delete().eq("telegram_id",tid);return langPicker(t,cid)}
    if(x==="set:lang")return langPicker(t,cid);
    if(x==="set:notif"||x==="set:projects"||x==="set:announcements"){const col=x==="set:notif"?"telegram_notifications_enabled":x==="set:projects"?"project_notifications_enabled":"announcement_notifications_enabled";const {data:p}=await s.from("profiles").select(col).eq("telegram_id",tid).maybeSingle();if(p)await s.from("profiles").update({[col]:!p[col]}).eq("telegram_id",tid);return settings(s,t,cid,tid,l)}
    if(x==="reg:confirm")return finishRegistration(s,t,cid,tid,l);
    if(x==="reg:restart")return start(s,t,cid,tid,un,l);
    if(x.startsWith("regv:")){const q=await s.from("telegram_registration_sessions").select("step,data").eq("telegram_id",tid).maybeSingle();if(!q.data)return;const d=Object.assign({},q.data.data||{},{[q.data.step]:x.slice(5)}),i=F.indexOf(q.data.step),n=F[i+1];if(!n)return;await s.from("telegram_registration_sessions").update({step:n,data:d,updated_at:new Date().toISOString()}).eq("telegram_id",tid);return ask(t,cid,n,d.language||l)}
    if(x==="regskip"){const q=await s.from("telegram_registration_sessions").select("step,data").eq("telegram_id",tid).maybeSingle();if(!q.data)return;const d=Object.assign({},q.data.data||{},{[q.data.step]:""});await s.from("telegram_registration_sessions").update({step:"__confirm__",data:d,updated_at:new Date().toISOString()}).eq("telegram_id",tid);return TG(t,"sendMessage",{chat_id:cid,text:"<b>"+UI[l].confirm+"</b>\n\n"+F.map(k=>k+": "+(d[k]||"—")).join("\n"),parse_mode:"HTML",reply_markup:{inline_keyboard:[[{text:UI[l].confirmYes,callback_data:"reg:confirm"}],[{text:UI[l].restart,callback_data:"reg:restart"}]]}})}
    if(x==="consent:yes"){
      const q=await s.from("telegram_registration_sessions").select("data").eq("telegram_id",tid).maybeSingle();if(!q.data)return;
      const pid=q.data.data&&q.data.data.profile_id;if(!pid)return;
      await s.from("profiles").update({consent_accepted_at:new Date().toISOString()}).eq("id",pid);
      await s.from("telegram_registration_sessions").delete().eq("telegram_id",tid);
      await TG(t,"sendMessage",{chat_id:cid,text:UI[l].docsSaved});
      return menu(s,t,cid,tid);
    }
    if(x==="consent:no"){await TG(t,"sendMessage",{chat_id:cid,text:UI[l].consentDeclined});return askConsent(t,cid,l)}
    if(x.startsWith("apply:")){const pid=x.slice(6);const {data:p}=await s.from("profiles").select("id").eq("telegram_id",tid).maybeSingle();if(!p)return R({ok:true});const r=await s.rpc("scg_telegram_apply",{p_user:p.id,p_project:pid});return TG(t,"sendMessage",{chat_id:cid,text:r.error?"Приём заявок закрыт или профиль не активен.":"Заявка отправлена"});}
    if(x.startsWith("checkin:")||x.startsWith("checkout:")){const aid=x.split(":")[1],field=x.startsWith("checkin:")?"checked_in_at":"checked_out_at",status=field==="checked_in_at"?"checked_in":"completed";const {data:p}=await s.from("profiles").select("id").eq("telegram_id",tid).maybeSingle();if(!p)return R({ok:true});const r=await s.rpc("scg_telegram_attendance",{p_user:p.id,p_assignment:aid,p_mode:field==="checked_in_at"?"in":"out"});return TG(t,"sendMessage",{chat_id:cid,text:r.error?"Не удалось отметить смену. Обратись к координатору.":"Отметка сохранена"})}
    if(x==="reg:t"){const {data:p}=await s.from("profiles").select("id").eq("telegram_id",tid).maybeSingle();if(p)return menu(s,t,cid,tid);const {data:qq}=await s.from("telegram_registration_sessions").select("data").eq("telegram_id",tid).maybeSingle();return start(s,t,cid,tid,un,(qq&&qq.data&&qq.data.language)||l)}
    return R({ok:true})
  }
  const tx=(m&&m.text&&m.text.trim())||"";
  if(tx==="/start")return langPicker(t,cid);
  if(tx==="/register"){const l=await langOf(s,tid);return start(s,t,cid,tid,un,l)}
  const {data:q}=await s.from("telegram_registration_sessions").select("step,data").eq("telegram_id",tid).maybeSingle();
  if(!q)return menu(s,t,cid,tid);
  const l=(q.data&&q.data.language)||"ru";
  if(q.step==="await_id_front"||q.step==="await_id_back"){
    const photos=m&&m.photo;
    if(!photos||!photos.length){return TG(t,"sendMessage",{chat_id:cid,text:UI[l].notAPhoto})}
    const fileId=photos[photos.length-1].file_id;
    const pid=q.data&&q.data.profile_id;if(!pid)return menu(s,t,cid,tid);
    const path=q.step==="await_id_front"?"id_front":"id_back";
    const saved=await saveTelegramPhoto(s,t,fileId,pid,path);
    if(!saved)return TG(t,"sendMessage",{chat_id:cid,text:UI[l].uploadFailed});
    await s.from("profiles").update({[path+"_url"]:saved}).eq("id",pid);
    if(q.step==="await_id_front"){
      await s.from("telegram_registration_sessions").update({step:"await_id_back",updated_at:new Date().toISOString()}).eq("telegram_id",tid);
      return TG(t,"sendMessage",{chat_id:cid,text:UI[l].askIdBack});
    }
    await s.from("telegram_registration_sessions").update({step:"await_consent",updated_at:new Date().toISOString()}).eq("telegram_id",tid);
    return askConsent(t,cid,l);
  }
  if(q.step==="await_consent"){
    return askConsent(t,cid,l);
  }
  let v=(m&&m.text&&m.text.trim())||"";
  if(q.step==="phone"&&m&&m.contact&&m.contact.phone_number)v=m.contact.phone_number;
  if(q.step==="birth_date"){const dd=dateParse(v);if(!dd)return ask(t,cid,q.step,l);v=dd}
  if(q.step==="email"&&!isEmail(v))return ask(t,cid,q.step,l);
  const d=Object.assign({},q.data||{},{[q.step]:v}),i=F.indexOf(q.step),n=F[i+1];
  if(n){await s.from("telegram_registration_sessions").update({step:n,data:d,updated_at:new Date().toISOString()}).eq("telegram_id",tid);return ask(t,cid,n,d.language||"ru")}
  await s.from("telegram_registration_sessions").update({step:"__confirm__",data:d,updated_at:new Date().toISOString()}).eq("telegram_id",tid);
  return TG(t,"sendMessage",{chat_id:cid,text:"<b>"+UI[d.language||"ru"].confirm+"</b>\n\n"+F.map(k=>k+": "+(d[k]||"—")).join("\n"),parse_mode:"HTML",reply_markup:{inline_keyboard:[[{text:UI[d.language||"ru"].confirmYes,callback_data:"reg:confirm"}],[{text:UI[d.language||"ru"].restart,callback_data:"reg:restart"}]]}})
}catch(e){return R({ok:false,error:"INTERNAL_ERROR"},500)}});

