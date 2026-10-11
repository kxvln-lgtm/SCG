import nodemailer from 'npm:nodemailer@10.1.0';
import {reply,originAllowed,identity,clients,body,unwrap,failure} from '../_shared/security.ts';
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
Deno.serve(async req=>{
 if(!originAllowed(req))return reply(req,{error:'Origin forbidden'},403);
 if(req.method==='OPTIONS')return reply(req,{ok:true});
 if(!['GET','POST'].includes(req.method))return reply(req,{error:'Method not allowed'},405);
 try{
  const serviceToken=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  let internal=!!serviceToken&&serviceToken===Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!internal&&req.method==='POST'){const input=await body(req);if(input.cron_token){const {admin}=clients(req);internal=unwrap(await admin.rpc('scg_consume_mail_invocation',{p_token:String(input.cron_token)}))===true;if(!internal)throw Error('UNAUTHORIZED');}}
  const {admin,db,user}=internal?{...clients(req),user:null}:await identity(req);
  if(!internal&&!unwrap(await db.rpc('is_system_admin',{uid:user.id})))return reply(req,{error:'Недостаточно прав.'},403);
  const host=Deno.env.get('SMTP_HOSTNAME'),port=Number(Deno.env.get('SMTP_PORT')||465),username=Deno.env.get('SMTP_USERNAME'),password=Deno.env.get('SMTP_PASSWORD'),from=Deno.env.get('SMTP_FROM')||'noreply@stagecraft.kz';
  const configured=!!(host&&username&&password&&/^[^\s<>]+@stagecraft\.kz$/i.test(from)&&[465,587,2587].includes(port));
  if(req.method==='GET'){const r=await admin.from('scg_email_outbox').select('id',{count:'exact',head:true}).eq('status','queued');return reply(req,{configured,queued:r.count||0,from:'noreply@stagecraft.kz'});}
  if(!configured)return reply(req,{code:'SMTP_NOT_CONFIGURED',error:'SMTP домена ещё не настроен. Уведомления сохраняются в очереди.'},503);
  const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:true,auth:{user:username,pass:password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:12000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
  const batch=unwrap(await admin.rpc('scg_claim_email_batch',{p_limit:5}));let sent=0,failed=0,skipped=0;
  for(const job of batch||[]){
   try{
    const profile=unwrap(await admin.from('profiles').select('email_projects_enabled,email_announcements_enabled,email_posts_enabled,email_support_enabled,status').eq('id',job.user_id).maybeSingle());
    const field={project:'email_projects_enabled',application:'email_projects_enabled',announcement:'email_announcements_enabled',post:'email_posts_enabled',support:'email_support_enabled'}[job.kind];
    const account=await admin.auth.admin.getUserById(job.user_id),email=account.data.user?.email;
    if(!profile||!field||!profile[field]||!email||!account.data.user?.email_confirmed_at||account.error){unwrap(await admin.from('scg_email_outbox').update({status:'skipped',last_error:null}).eq('id',job.id));skipped++;continue;}
    const destination=new URL(job.payload?.url||'https://stagecraft.kz/backstage/');if(destination.protocol!=='https:'||destination.hostname!=='stagecraft.kz')throw Error('UNSAFE_URL');
    const title=String(job.payload?.title||'SCG Backstage').slice(0,300),text=String(job.payload?.body||'Новое уведомление в Backstage.').slice(0,6000),subject=String(job.subject||title).replace(/[\r\n]/g,' ').slice(0,200);
    await transport.sendMail({from:{name:'SCG · Backstage',address:from},to:email,subject,messageId:`<scg-${job.id}@stagecraft.kz>`,text:`${title}\n\n${text}\n\n${destination.href}\n\nНастройки email: https://stagecraft.kz/backstage/#settings`,html:`<div style="font:16px Arial,sans-serif;max-width:600px;margin:auto;color:#1d2028"><p style="font-weight:bold;color:#d72732">SCG / BACKSTAGE</p><h1 style="font-size:26px">${escape(title)}</h1><p style="white-space:pre-line">${escape(text)}</p><p><a href="${escape(destination.href)}">Открыть Backstage →</a></p><hr><p style="font-size:12px">Ты получаешь это письмо по настройкам уведомлений SCG. <a href="https://stagecraft.kz/backstage/#settings">Изменить настройки</a></p></div>`});
    unwrap(await admin.from('scg_email_outbox').update({status:'sent',sent_at:new Date().toISOString(),last_error:null}).eq('id',job.id));sent++;
   }catch{failed++;unwrap(await admin.from('scg_email_outbox').update({status:job.attempts>=5?'failed':'queued',available_at:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString(),last_error:'SMTP_DELIVERY_FAILED'}).eq('id',job.id));}
  }
  transport.close();return reply(req,{sent,failed,skipped});
 }catch(error){return failure(req,error);}
});
