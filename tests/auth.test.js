import test from 'node:test';
import assert from 'node:assert/strict';
let n=0,callback;
const session={user:{id:'12345678-1234-4234-8234-123456789abc'}};
async function setup(url,{otpError=null,sessionValue=session,mfa=false,role="VOLUNTEER",status="активен"}={}){
 globalThis.location=new URL(url);globalThis.history={replaceState(){}};
 globalThis.document={querySelector(){return null;}};
 const client={auth:{onAuthStateChange(fn){callback=fn;},getSession:async()=>({data:{session:sessionValue},error:null}),verifyOtp:async()=>({data:{session:otpError?null:session},error:otpError}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:mfa?'aal2':'aal1'},error:null}),listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]},error:null})}},from(){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:mfa&&!['FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS'].includes(role)?null:{id:session.user.id,role,status},error:null})}}};
 globalThis.window={supabase:{createClient(){return client;}}};
 const module=await import('../assets/auth.js?scenario='+n++);await module.initAuth();return {module,client};
}
test('Verified recovery token opens a password form',async()=>{const {module}=await setup('https://stagecraft.kz/reset-password.html?token_hash=example&type=recovery');assert.equal(module.auth.recovery,true);assert.match(module.recoveryCard(),/id="recovery-form"/);});
test('Old recovery token stays on recovery screen and offers a new link',async()=>{const {module}=await setup('https://stagecraft.kz/reset-password.html?token_hash=old&type=recovery',{otpError:new Error('expired')});assert.equal(module.auth.recovery,true);assert.doesNotMatch(module.recoveryCard(),/id="recovery-form"/);assert.match(module.recoveryCard(),/Запросить ссылку/);});
test('A normal session cannot be mistaken for a recovery proof',async()=>{const {module}=await setup('https://stagecraft.kz/reset-password.html');assert.doesNotMatch(module.recoveryCard(),/id="recovery-form"/);});
test('Implicit recovery hash is recognized before SDK consumes it',async()=>{const {module}=await setup('https://stagecraft.kz/reset-password.html#access_token=test&type=recovery');assert.match(module.recoveryCard(),/id="recovery-form"/);callback('TOKEN_REFRESHED',session);assert.equal(module.auth.recovery,true);});
test('An enrolled factor blocks loading private profile at AAL1',async()=>{const {module}=await setup('https://admin.stagecraft.kz/',{mfa:true});assert.equal(module.auth.mfaRequired,true);assert.equal(module.auth.profile,null);assert.equal(module.canAdmin(),false);assert.match(module.mfaLoginCard(),/ДВУХЭТАПНЫЙ ВХОД/);});
test('Volunteer role cannot gain command center access',async()=>{const {module}=await setup('https://stagecraft.kz/backstage/');assert.equal(module.canAdmin(),false);module.auth.profile.role='FOUNDER';assert.equal(module.canAdmin(),true);module.auth.profile.status='ожидание';assert.equal(module.canAdmin(),false);});

for(const role of ['FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS']) {
 test(`${role} enters Command Center at AAL1 without mandatory MFA`,async()=>{
  const {module}=await setup('https://admin.stagecraft.kz/',{mfa:true,role});
  assert.equal(module.auth.mfaRequired,false);assert.equal(module.canAdmin(),true);assert.equal(module.auth.profile.role,role);
 });
}
test('An inactive administrative profile has no Command Center access',async()=>{
 const {module}=await setup('https://admin.stagecraft.kz/',{role:'FOUNDER',status:'ожидание'});assert.equal(module.canAdmin(),false);
});
test('Google sends members and admins back to their own workspace',async()=>{
 const {module,client}=await setup('https://stagecraft.kz/backstage/');
 const calls=[];client.auth.signInWithOAuth=async options=>{calls.push(options);return {error:null};};
 await module.signInGoogle(null,false);await module.signInGoogle(null,true);
 assert.equal(calls[0].provider,'google');assert.equal(calls[0].options.redirectTo,'https://stagecraft.kz/backstage/');
 assert.equal(calls[1].options.redirectTo,'https://admin.stagecraft.kz/');
 assert.equal(calls[0].options.scopes,'openid email profile');assert.equal(calls[0].options.queryParams.prompt,'select_account');
 assert.equal(module.auth.formBusy,false);
});
test('Cancelled Google consent offers email login without a recovery error',async()=>{
 const {module}=await setup('https://stagecraft.kz/backstage/?error=access_denied&error_description=cancelled');
 assert.equal(module.auth.recovery,false);assert.equal(module.auth.error.message,'OAUTH_CANCELLED');assert.match(module.authCard(),/Вход через Google не завершён/);
});
