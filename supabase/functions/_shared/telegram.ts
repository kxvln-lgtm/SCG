import {sameSecret} from './security.ts';
let setup;
async function webhookSecret(token,url){const v=Deno.env.get('TELEGRAM_WEBHOOK_SECRET');if(v)return v;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token+'|SCG-webhook-v2|'+url));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function webhookGate(req,token,base,slug){
 const url=base+'/functions/v1/'+slug,secret=await webhookSecret(token,url);
 if(req.method==='GET'){
  if(!setup)setup=(async()=>{const r=await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`,{signal:AbortSignal.timeout(10000)});const data=await r.json();if(!r.ok||!data.ok||data.result?.url!==url)return false;const q=await fetch(`https://api.telegram.org/bot${token}/setWebhook`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,secret_token:secret,allowed_updates:['message','callback_query'],drop_pending_updates:false,max_connections:data.result.max_connections||40}),signal:AbortSignal.timeout(10000)});const out=await q.json();return q.ok&&out.ok===true;})().catch(()=>false);
  return new Response(JSON.stringify({ok:true,webhook_protected:await setup}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 if(!await sameSecret(req.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',secret))return new Response('Unauthorized',{status:401});
 if(Number(req.headers.get('content-length')||0)>1048576)return new Response('Too large',{status:413});
 return null;
}
export async function telegramIdentity(initData,botToken){
 if(typeof initData!=='string'||initData.length>8192)throw Error('UNAUTHORIZED');
 const params=new URLSearchParams(initData),hash=params.get('hash'),time=Number(params.get('auth_date'));
 if(!hash||!/^\w{64}$/.test(hash)||!Number.isFinite(time)||Math.abs(Date.now()/1000-time)>600)throw Error('UNAUTHORIZED');
 if(new Set([...params.keys()]).size!==[...params.keys()].length)throw Error('UNAUTHORIZED');
 params.delete('hash');const data=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n'),e=new TextEncoder();
 const k=await crypto.subtle.importKey('raw',e.encode('WebAppData'),{name:'HMAC',hash:'SHA-256'},false,['sign']);const secret=await crypto.subtle.sign('HMAC',k,e.encode(botToken));
 const signing=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signature=Uint8Array.from(hash.match(/../g).map(v=>parseInt(v,16)));if(!await crypto.subtle.verify('HMAC',signing,signature,e.encode(data)))throw Error('UNAUTHORIZED');
 const user=JSON.parse(params.get('user')||'null');if(!Number.isSafeInteger(user?.id)||user.id<1)throw Error('UNAUTHORIZED');return user;
}
