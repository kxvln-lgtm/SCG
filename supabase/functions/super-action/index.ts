import {clients,identity,reply,body,unwrap,originAllowed,failure} from '../_shared/security.ts';
import {telegramIdentity} from '../_shared/telegram.ts';
const fields='id,first_name,last_name,city,region,department,avatar_url,role,status,scd_id,telegram_username,username';
Deno.serve(async req=>{
 if(!originAllowed(req))return reply(req,{error:'Origin forbidden'},403);
 if(req.method==='OPTIONS')return reply(req,{ok:true});if(req.method!=='POST')return reply(req,{error:'POST required'},405);
 try{
  const input=await body(req,16384),action=input.action||'register',{admin}=clients(req);
  if(action==='public_home'){const {db}=clients(req);const projects=unwrap(await db.rpc('scg_public_projects'));return reply(req,{success:true,projects,communities:[],stats:{projects:projects.length}});}
  const bot=Deno.env.get('TELEGRAM_BOT_TOKEN');if(!bot)throw Error('SERVER_CONFIG');
  const telegram=await telegramIdentity(input.initData,bot);
  if(action==='list_members'){const {db}=await identity(req);const members=unwrap(await db.rpc('command_center_members',{p_query:String(input.search||'').slice(0,100)}));return reply(req,{success:true,action,members,count:members.length});}
  if(!['register','link','profile'].includes(action))return reply(req,{error:'Unsupported action'},400);
  let profile=unwrap(await admin.from('profiles').select(fields+',telegram_id').eq('telegram_id',telegram.id).maybeSingle());
  if(input.scd_id||action==='link'){
   const {db,user}=await identity(req);const own=unwrap(await db.from('profiles').select('id,scd_id,telegram_id').eq('id',user.id).maybeSingle());if(!own)throw Error('MFA_REQUIRED');
   if(input.scd_id&&own.scd_id!==String(input.scd_id).trim())throw Error('FORBIDDEN');
   if((profile&&profile.id!==user.id)||(own.telegram_id&&Number(own.telegram_id)!==telegram.id))return reply(req,{error:'Эта привязка уже занята. Обратись в поддержку.'},409);
   profile=unwrap(await admin.from('profiles').update({telegram_id:telegram.id,telegram_username:telegram.username||null}).eq('id',user.id).select(fields).single());
   return reply(req,{success:true,action:'linked',profile});
  }
  if(profile)return reply(req,{success:true,action:'profile',profile});
  if(action==='profile')return reply(req,{error:'Профиль пока не зарегистрирован.'},404);
  const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):null;
  profile=unwrap(await admin.from('profiles').insert({id:crypto.randomUUID(),first_name:clean(input.first_name||telegram.first_name,80)||'',last_name:clean(input.last_name||telegram.last_name,80)||'',city:clean(input.city,100),telegram_id:telegram.id,telegram_username:telegram.username||null,role:'VOLUNTEER',status:'ожидание',language:'ru',theme:'light'}).select(fields).single());
  return reply(req,{success:true,action:'register',profile});
 }catch(error){return failure(req,error);}
});
