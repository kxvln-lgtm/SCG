import {CONFIG,$,esc,roleName,errorText,result,busy,toast,icon} from './core.js';

const url = new URL(location.href);
const hash = new URLSearchParams(location.hash.slice(1));
export const recoveryEntry = location.pathname.includes('reset-password') || hash.get('type') === 'recovery' || url.searchParams.get('type') === 'recovery';
export const auth = {client:null,session:null,profile:null,recovery:recoveryEntry,ready:false,error:null,mfaRequired:false,factors:[],formBusy:false};
let observer = () => {}, profileFlight, recoveryVerified = false;
export function onAuthChange(fn) { observer = fn; }
export async function loadProfile() {
  if (!auth.session) { auth.profile = null; return null; }
  const id=auth.session.user.id;
  if (profileFlight?.id===id) return profileFlight.promise;
  const promise=(async()=>{const p=await result(auth.client.from('profiles').select('*').eq('id',id).maybeSingle());if(auth.session?.user.id===id)auth.profile=p;return p;})();
  profileFlight={id,promise};
  try{return await promise;}finally{if(profileFlight?.promise===promise)profileFlight=null;}
}
export async function checkMfa(){
  if(!auth.session){auth.mfaRequired=false;auth.factors=[];return;}
  // Command Center uses the server-assigned role, without mandatory enrollment.
  if(canAdmin()&&!auth.recovery){auth.mfaRequired=false;auth.factors=[];return;}
  const r=await auth.client.auth.mfa.getAuthenticatorAssuranceLevel();if(r.error)throw r.error;
  auth.mfaRequired=r.data.nextLevel==='aal2'&&r.data.currentLevel!=='aal2';
  if(auth.mfaRequired){const f=await auth.client.auth.mfa.listFactors();if(f.error)throw f.error;auth.factors=(f.data.totp||[]).filter(f=>f.status==='verified');}
}
export async function initAuth() {
  if (!window.supabase?.createClient) { auth.error=new Error('SDK unavailable');auth.ready=true;return; }
  auth.client=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
  // Keep PASSWORD_RECOVERY latched until the password has been changed.
  auth.client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){auth.recovery=true;recoveryVerified=true;}
    if(auth.session?.user.id!==session?.user.id)auth.profile=null;
    auth.session=session;
    if(event==='SIGNED_OUT')auth.profile=null;
    setTimeout(async()=>{
      try{if(session){if(!auth.recovery)await loadProfile();await checkMfa();}}catch(e){auth.error=e;}
      if(auth.ready)observer(event);
    },0);
  });
  try {
    if(url.searchParams.get('error')||hash.get('error')||url.searchParams.get('error_description')||hash.get('error_description')) {
      history.replaceState(null,'',location.pathname);
      throw new Error(recoveryEntry?'Recovery token expired':'OAUTH_CANCELLED');
    }
    const tokenHash=url.searchParams.get('token_hash');
    if(tokenHash&&url.searchParams.get('type')==='recovery') {
      auth.recovery=true;
      const r=await auth.client.auth.verifyOtp({token_hash:tokenHash,type:'recovery'});
      if(r.error)throw r.error;
      auth.session=r.data.session;recoveryVerified=!!auth.session;
      history.replaceState(null,'',location.pathname);
    } else {
      const r=await auth.client.auth.getSession();if(r.error)throw r.error;auth.session=r.data.session;
      if(hash.get('type')==='recovery'&&auth.session)recoveryVerified=true;
    }
    if(auth.session){if(!auth.recovery)await loadProfile();await checkMfa();}
  }catch(e){auth.error=e;}
  auth.ready=true;
}
export function canAdmin() { return !!auth.profile && ['FOUNDER','UNION_LEAD','REGIONAL_EXECUTIVE','STAFF','PR','SYSTEMS'].includes(auth.profile.role) && ['активен','одобрено'].includes(auth.profile.status); }
export function canManage() { return canAdmin() && auth.profile.role !== 'PR'; }
export function authCard(mode = 'login', admin = false) {
  const recover = mode === 'forgot';
  const register = mode === 'register';
  return `<div class="auth-layout"><div class="auth-intro"><span class="eyebrow">${admin?'SCG / COMMAND CENTER':'SCG / BACKSTAGE'}</span><h1>${recover?'Вернём<br>тебе доступ.':register?'Твоё место<br>в команде.':'За каждой сценой —<br>свои люди.'}</h1><p>${admin?'Вход для команды управления. Доступ определяется твоей ролью в SCG.':'Проекты, команда и твоя история участия — в одном пространстве.'}</p><span class="intro-mark">SCG.</span></div><div class="auth-panel"><a class="text-link" href="${CONFIG.website}/">← ${admin?'На публичный сайт':'На главную'}</a><div class="auth-form-wrap"><span class="eyebrow">${recover?'ВОССТАНОВЛЕНИЕ':register?'ПРИСОЕДИНИТЬСЯ':'ДОБРО ПОЖАЛОВАТЬ'}</span><h2>${recover?'Забыл пароль?':register?'Создать аккаунт':admin?'Войти в командный центр':'Войти в Backstage'}</h2><p class="muted">${recover?'Отправим ссылку для установки нового пароля.':register?'Укажи основные данные. Профиль и документы можно заполнить после входа.':'Используй email, с которым зарегистрирован в SCG.'}</p><form id="auth-form" data-mode="${esc(mode)}" data-admin="${admin}">
    ${register?'<div class="form-grid"><label>Имя<input name="first_name" autocomplete="given-name" required maxlength="80"></label><label>Фамилия<input name="last_name" autocomplete="family-name" required maxlength="80"></label></div><label>Город<input name="city" autocomplete="address-level2" required maxlength="100" placeholder="Например, Астана"></label>':''}
    <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label>
    ${!recover?`<label>Пароль<div class="password-field"><input name="password" type="password" autocomplete="${register?'new-password':'current-password'}" required ${register?'minlength="10"':''} maxlength="200"><button type="button" data-action="toggle-password" aria-label="Показать пароль">${icon('eye')}</button></div></label>`:''}
    ${register?'<label class="check-label"><input name="consent" type="checkbox" required><span>Принимаю <a href="/#terms" target="_blank" rel="noopener">условия использования</a> и <a href="/#privacy" target="_blank" rel="noopener">политику конфиденциальности</a>.</span></label>':''}
    <p class="form-error" id="auth-error" role="alert">${auth.error?esc(errorText(auth.error)):""}</p><button class="btn primary full" type="submit">${recover?'Отправить ссылку':register?'Создать аккаунт':'Войти'} ${icon('arrow')}</button>
    </form>${!recover&&CONFIG.googleOAuthEnabled?`<div class="auth-oauth"><p class="form-hint">или</p><button type="button" class="btn secondary full" data-action="google-login">Войти через Google</button><p class="form-hint">Google передаст SCG имя и email. Для командного центра по-прежнему нужна назначенная роль.</p></div>`:""}<div class="auth-links">${recover?'<a href="#login">Вернуться ко входу</a>':register?'<span>Уже в SCG? <a href="#login">Войти</a></span>':`<a href="#forgot">Забыл пароль</a>${admin?'':'<a href="#register">Создать аккаунт</a>'}`}</div><div class="auth-security">${icon('lock')} Защищённое соединение · Supabase Auth</div></div></div></div>`;
}
export async function submitAuth(form, admin = false) {
  const data=new FormData(form), mode=form.dataset.mode, out=$('#auth-error');out.textContent='';
  auth.formBusy=true;auth.error=null;
  try {
  await busy($('button[type=submit]',form),async()=>{
    try{
      if(!auth.client)throw new Error('network');
      const email=String(data.get('email')||'').trim();
      if(mode==='forgot'){
        const r=await auth.client.auth.resetPasswordForEmail(email,{redirectTo:`${CONFIG.website}/reset-password.html`});if(r.error)throw r.error;
        form.innerHTML=`<div class="success-panel">${icon('mail')}<h3>Проверь почту</h3><p>Если аккаунт с этим email существует, придёт письмо со ссылкой. Проверь также папку «Спам».</p><a class="btn secondary" href="#login">Вернуться ко входу</a></div>`;
        return;
      }
      const password=String(data.get('password')||'');
      if(mode==='register'){
        if(!data.get('consent')||password.length<10)throw new Error('weak password');
        const r=await auth.client.auth.signUp({email,password,options:{emailRedirectTo:`${CONFIG.website}/backstage/`,data:{first_name:String(data.get('first_name')).trim(),last_name:String(data.get('last_name')).trim(),city:String(data.get('city')).trim(),language:'ru',theme:'light',consent_accepted_at:new Date().toISOString()}}});
        if(r.error)throw r.error;
        if(!r.data.session){form.innerHTML='<div class="success-panel"><h3>Подтверди email</h3><p>Открой ссылку из письма, затем войди в Backstage.</p><a class="btn primary" href="#login">Войти</a></div>';return;}
        auth.session=r.data.session;
      }else{
        const r=await auth.client.auth.signInWithPassword({email,password});if(r.error)throw r.error;auth.session=r.data.session;
      }
      await loadProfile();
      await checkMfa();
      if(auth.mfaRequired){auth.formBusy=false;observer('MFA_REQUIRED');return;}
      if(admin){if(!canAdmin()){out.textContent='Аккаунт не имеет доступа к командному центру. Backstage доступен на основном сайте.';return;}observer('SIGNED_IN');}
      else location.assign(`${CONFIG.website}/backstage/`);
    }catch(e){out.textContent=errorText(e);}
  });
  } finally {auth.formBusy=false;}
}
export async function signInGoogle(button, admin=false) {
  const out=$('#auth-error');if(out)out.textContent='';auth.formBusy=true;auth.error=null;
  try {
    await busy(button,async()=>{
      if(!auth.client)throw new Error('network');
      const r=await auth.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:admin?`${CONFIG.admin}/`:`${CONFIG.website}/backstage/`,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
      if(r.error)throw r.error;
    });
  }catch(e){if(out)out.textContent=errorText(e);}finally{auth.formBusy=false;}
}
export function mfaLoginCard(){return `<div class="recovery-layout"><a class="brand" href="/"><span>SCG</span><small>BACKSTAGE</small></a><section class="recovery-card"><span class="eyebrow">ДВУХЭТАПНЫЙ ВХОД</span><h1>Подтверди, что это ты.</h1><p>Введи код из приложения аутентификатора. Пароль уже проверен.</p><form id="mfa-login-form"><label>Аутентификатор<select name="factor">${auth.factors.map(f=>`<option value="${esc(f.id)}">${esc(f.friendly_name||'Аутентификатор')}</option>`).join('')}</select></label><label>Одноразовый код<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code"></label><p class="form-error" id="mfa-login-error" role="alert"></p><button class="btn primary full" type="submit">Подтвердить ${icon('shield')}</button></form><button class="text-link" data-action="logout">Выйти из аккаунта</button></section></div>`;}
export async function submitMfaLogin(form){await busy($('button[type=submit]',form),async()=>{try{const d=new FormData(form),r=await auth.client.auth.mfa.challengeAndVerify({factorId:String(d.get('factor')),code:String(d.get('code'))});if(r.error)throw r.error;const s=await auth.client.auth.getSession();auth.session=s.data.session;await checkMfa();if(auth.mfaRequired)throw new Error('MFA incomplete');if(!auth.recovery)await loadProfile();observer('MFA_VERIFIED');}catch{$('#mfa-login-error').textContent='Код не совпадает. Используй текущий код из приложения.';}});}
export function recoveryCard() {
  const valid=auth.session&&recoveryVerified&&!auth.error;
  return `<div class="recovery-layout"><a class="brand" href="/"><span>SCG</span><small>BACKSTAGE</small></a><div class="recovery-card"><span class="eyebrow">БЕЗОПАСНОСТЬ АККАУНТА</span><h1>${valid?'Новый пароль.':'Восстановление доступа.'}</h1>${valid?`<p>Установи новый пароль. Эта страница останется открытой до завершения.</p><form id="recovery-form"><label>Новый пароль<input type="password" name="password" minlength="10" maxlength="200" autocomplete="new-password" required></label><label>Повтори пароль<input type="password" name="repeat" minlength="10" maxlength="200" autocomplete="new-password" required></label><p class="form-error" id="recovery-error" role="alert"></p><button type="submit" class="btn primary full">Сохранить пароль ${icon('check')}</button></form>`:`<p>${auth.error?'Ссылка устарела или не подтверждена. Запроси новое письмо.':'Для смены пароля открой новую ссылку из письма.'}</p><a class="btn primary" href="/backstage/#forgot">Запросить ссылку ${icon('arrow')}</a>`}<p class="small muted">Пароль должен содержать не менее 10 символов.</p></div></div>`;
}
export async function submitRecovery(form) {
  const d=new FormData(form),out=$('#recovery-error');out.textContent='';
  if(d.get('password')!==d.get('repeat')){out.textContent='Пароли не совпадают.';return;}
  if(!recoveryVerified||!auth.session){out.textContent='Запроси новую ссылку для восстановления.';return;}
  await busy($('button[type=submit]',form),async()=>{
    try {
      await result(auth.client.auth.updateUser({password:String(d.get('password'))}));
      history.replaceState(null,'',location.pathname);
      // Finish on a visible success state; never let an auth event route to the homepage.
      auth.recovery=false;recoveryVerified=false;
      form.innerHTML='<div class="success-panel"><h3>Пароль обновлён</h3><p>Теперь можно войти с новым паролем.</p><a class="btn primary full" href="/backstage/#login">Перейти ко входу</a></div>';
      await auth.client.auth.signOut({scope:'local'});
    }catch(e){out.textContent=errorText(e);}
  });
}
export async function logout() { if(auth.client){const r=await auth.client.auth.signOut({scope:'local'});if(r.error)throw r.error;}auth.session=null;auth.profile=null;location.assign(location.hostname==='admin.stagecraft.kz'?'/':'/backstage/#login'); }
export function togglePassword(button) { const input=button.closest('.password-field').querySelector('input');input.type=input.type==='password'?'text':'password';button.setAttribute('aria-label',input.type==='password'?'Показать пароль':'Скрыть пароль'); }
