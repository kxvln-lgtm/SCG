// UI-only contract test. All HTTP calls to Supabase are intercepted. No live data writes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {preview} from './preview.mjs';
const stop=await preview();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const owner='11111111-1111-4111-8111-111111111111',hq='33333333-3333-4333-8333-333333333333';
const catalog=[['volunteers','BSU','Волонтёрское сопровождение'],['event_staff','BSS','Персонал мероприятия'],['photographers','CB','Фотосъёмка'],['dancers','SCN','Танцевальная команда']].map(([id,division,title])=>({id,division,title,pricing_mode:id==='volunteers'?'volunteer_review':'custom_quote',max_quantity:500}));
const organizations=[{id:'org-one',legal_name:'UI Test Organization',legal_form:'legal_entity',registration_id:'123456789012',city:'Астана',status:'verified'}];
let requests=[],items=[],proposals=[],streams=[],audit=[];const calls=[],errors=[];
async function pageFor(id,aal='aal1',width=1440){
 const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 const user={id,email:'test@example.invalid',role:'authenticated',aud:'authenticated',app_metadata:{provider:'email'},user_metadata:{},factors:[]};
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const token=encode({alg:'HS256'})+'.'+encode({sub:id,role:'authenticated',aud:'authenticated',aal,exp:Math.floor(Date.now()/1000)+3600})+'.test';
 await page.addInitScript(({user,token})=>{localStorage.setItem('scg-essentials-beta-auth',JSON.stringify({access_token:token,refresh_token:'ui-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));localStorage.setItem('scg-theme','light');},{user,token});
 await page.route('https://snmcoapfubdnvaoowjjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];const name=url.pathname.split('/').pop();
  if(url.pathname==='/auth/v1/user')data=user;
  else if(name==='profiles')data={id,role:id===hq?'FOUNDER':'VOLUNTEER',status:'активен',first_name:'Тест',last_name:'Пользователь',department:'UNION'};
  else if(name==='scg_services_command'){
   const {p_action:action,p_data:d}=req.postDataJSON();calls.push({action,data:d});
   if(action==='save_request'){
    const existing=requests.find(r=>r.idempotency_key===d.idempotency_key);
    const r={...d,id:existing?.id||'request-one',status:'draft',version:(existing?.version||0)+1};
    requests=[r];items=d.items.map(i=>({...i,request_id:r.id}));data={id:r.id,version:r.version,status:r.status};
   }else if(action==='submit_request'){requests[0].status='submitted';data={id:requests[0].id,status:'submitted'};}
   else if(action==='issue_proposal'){
    for(const p of proposals)p.superseded_at=new Date().toISOString();
    proposals.unshift({...d,id:'proposal-'+(proposals.length+1),version:proposals.length+1,request_id:d.id,accepted_at:null,superseded_at:null});
    requests[0].status='awaiting_acceptance';data={id:d.id,status:'awaiting_acceptance'};
   }else if(action==='accept_proposal'){proposals.find(p=>p.id===d.proposal_id).accepted_at=new Date().toISOString();data={id:d.id,status:'awaiting_acceptance'};}
   else if(action==='confirm_request'){requests[0].status='confirmed';streams=items.map(i=>({id:i.service_id,division:catalog.find(c=>c.id===i.service_id).division,target_count:i.quantity,status:'approved_to_staff'}));data={id:d.id,status:'confirmed'};}
   else throw Error('Unexpected action '+action);
   audit.unshift({id:audit.length+1,request_id:data.id,action,created_at:new Date().toISOString()});
  }else if(name==='service_organizations')data=organizations;
  else if(name==='service_catalog')data=catalog;
  else if(name==='service_requests')data=req.headers().accept?.includes('object')?requests[0]:requests;
  else if(name==='service_request_items')data=items;
  else if(name==='service_proposals')data=proposals;
  else if(name==='service_workstreams')data=streams;
  else if(name==='service_audit_log')data=audit;
  else if(name==='scg_cc_context')data={can_enter:id===hq};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });return page;
}
try{
 const client=await pageFor(owner,'aal1',390);
 await client.goto('http://127.0.0.1:4173/#/services');
 await client.getByRole('button',{name:'Создать заказ',exact:true}).click();
 await client.getByLabel('Название события').fill('UI проверка события');await client.getByLabel('Город',{exact:true}).fill('Астана');await client.getByLabel('Площадка',{exact:true}).fill('Тестовая площадка');
 await client.getByLabel('Начало, время Казахстана').fill('2030-11-20T10:00');await client.getByLabel('Окончание, время Казахстана').fill('2030-11-20T20:00');
 await client.getByRole('button',{name:'Продолжить →'}).click();
 for(const [label,n] of [['Волонтёры',18],['Персонал мероприятия',3],['Фотографы',3],['Танцоры',10]])await client.getByLabel('Количество: '+label,{exact:true}).fill(String(n));
 await client.getByLabel('Задачи, смены и условия').fill('Тестовый сценарий. Данные только внутри браузерного теста.');
 assert.equal(await client.locator('.service-total b').innerText(),'34');
 await client.getByRole('button',{name:'Продолжить →'}).click();await client.getByRole('button',{name:'Сохранить черновик'}).click();
 await client.getByRole('button',{name:'Изменить черновик'}).click();
 await client.getByLabel('Площадка',{exact:true}).fill('Уточнённая площадка');
 await client.getByRole('button',{name:'Продолжить →'}).click();assert.equal(await client.getByLabel('Количество: Волонтёры',{exact:true}).inputValue(),'18');
 await client.getByRole('button',{name:'Продолжить →'}).click();await client.getByRole('button',{name:'Сохранить черновик'}).click();
 await client.getByRole('checkbox').check();await client.getByRole('button',{name:'Отправить запрос SCG'}).click();await client.getByText('Отправлен',{exact:true}).waitFor();
 const saved=calls.filter(c=>c.action==='save_request');assert.equal(saved[1].data.version,1);assert.equal(saved[1].data.starts_at,'2030-11-20T10:00:00+05:00');assert.equal(saved[1].data.idempotency_key,saved[0].data.idempotency_key);
 const admin=await pageFor(hq,'aal2');await admin.goto('http://127.0.0.1:4173/#/essentials/admin/services');
 await admin.getByRole('button').filter({hasText:'UI проверка события'}).click();await admin.getByRole('button',{name:'Подготовить предложение',exact:true}).click();
 await admin.getByLabel('Оплачиваемые услуги, ₸').fill('120000');await admin.getByLabel('Состав работ и коммерческие условия').fill('Состав и условия тестового коммерческого предложения.');await admin.getByLabel('Условия добровольного участия',{exact:true}).fill('Добровольное участие. Тест условий сопровождения и питания.');
 await admin.getByRole('button',{name:'Отправить клиенту',exact:true}).click();await admin.getByRole('heading',{name:'Предложение · версия 1',exact:true}).waitFor();
 await client.getByRole('button',{name:'Обновить',exact:true}).click();await client.getByRole('heading',{name:'Предложение · версия 1',exact:true}).waitFor();
 await client.getByRole('checkbox').check();await client.getByRole('button',{name:'Принять предложение',exact:true}).click();await client.getByText('Принято клиентом. Ожидается окончательное подтверждение HQ.').waitFor();
 await admin.getByRole('button',{name:'Обновить',exact:true}).click();await admin.getByRole('button',{name:'Подтвердить заказ и направления'}).click();await admin.getByRole('heading',{name:'Направления заказа'}).waitFor();
 assert.equal(streams.length,4);assert.equal(streams.reduce((n,s)=>n+s.target_count,0),34);
 assert.equal(calls.find(c=>c.action==='confirm_request').data.proposal_id,proposals[0].id);
 for(const page of [client,admin])assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const mfa=await pageFor(hq,'aal1');await mfa.goto('http://127.0.0.1:4173/#/essentials/admin/services');await mfa.getByRole('heading',{name:'Защита центрального доступа'}).waitFor();
 assert.equal(await mfa.getByRole('heading',{name:'Заказы на согласовании'}).count(),0);
 assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await admin.screenshot({path:'test-results/services-hq.png',fullPage:true});await client.screenshot({path:'test-results/services-client-mobile.png',fullPage:true});
 console.log(JSON.stringify({flow:'draft → edit → submit → proposal → client acceptance → HQ approval',participants:34,workstreams:4,mfaGate:true,errors},null,2));
}finally{await browser.close();await stop();}
