import {$,CONFIG,esc,errorText,result,toast,icon,empty,loading,initCommon,closeDialog} from './core.js';
import {auth,recoveryEntry,initAuth,onAuthChange,canAdmin,authCard,recoveryCard,submitAuth,submitRecovery,logout,togglePassword,mfaLoginCard,submitMfaLogin} from './auth.js';
import {publicNav,publicFooter,homeMarkup,aboutMarkup,directionsMarkup,loadHomeProjects,documentsPage,legalPage,supportPublic,documents} from './public.js';
import * as member from './member.js';
import * as admin from './admin.js';

const surface=location.hostname==='admin.stagecraft.kz'?'admin':document.body.dataset.surface||'public';
let generation=0,activePage='',recoveryScreenLocked=recoveryEntry;
const page=()=>{let value=location.hash.slice(1).split('?')[0]||'';try{value=decodeURIComponent(value);}catch{value='';}return value.replace(/[^a-z-]/g,'')||(surface==='admin'?'overview':'home');};
function showError(out,e){if(!out?.isConnected)return;out.innerHTML=empty('Не удалось загрузить раздел',errorText(e),'<button class="btn secondary" data-action="refresh">Повторить '+icon('arrow')+'</button>','support');}
async function route(){
 const version=++generation,app=$('#app'),current=page();
 if(auth.recovery)recoveryScreenLocked=true;
 if(auth.mfaRequired&&(surface!=='public'||recoveryScreenLocked||current==='login')){app.innerHTML=mfaLoginCard();return;}
 if(recoveryScreenLocked){app.innerHTML=recoveryCard();return;}
 activePage=current;document.body.dataset.page=current;closeDialog();
 if(surface==='public'){
  let markup='';
  if(['login','register','forgot'].includes(current))markup=authCard(current);
  else if(current==='about')markup=`<main class="public-page" id="main" tabindex="-1">${aboutMarkup()}<section class="public-section">${directionsMarkup()}</section><a class="btn primary" href="#register">Присоединиться ${icon('arrow')}</a></main>`;
  else if(current==='projects')markup=`<main class="public-page" id="main" tabindex="-1">${loading()}</main>`;
  else if(current==='documents'||current==='privacy'||current==='terms')markup=`<main id="main" tabindex="-1">${loading()}</main>`;
  else if(current==='support')markup=`<main id="main" tabindex="-1">${supportPublic()}</main>`;
  else markup=`<main id="main" tabindex="-1">${homeMarkup()}</main>`;
  app.innerHTML=publicNav()+markup+publicFooter();
  try{
    if(current==='projects'){const content=await member.projectsPage();if(version===generation)$('#main').innerHTML=content;}
    else if(current==='documents'){const content=await documentsPage();if(version===generation)$('#main').innerHTML=content;}
    else if(current==='privacy'||current==='terms'){const content=await legalPage(current);if(version===generation)$('#main').innerHTML=content;}
    else if(!['about','support','login','register','forgot'].includes(current))await loadHomeProjects();
  }catch(e){showError($('#main'),e);}
 }else{
  if(!auth.session){app.innerHTML=publicNav()+authCard(current==='forgot'?'forgot':current==='register'&&surface!=='admin'?'register':'login',surface==='admin');return;}
  if(!auth.profile){app.innerHTML=`<main class="public-page">${empty('Профиль пока недоступен','Попробуй обновить страницу. Если ситуация повторяется, обратись к команде SCG.','<button class="btn secondary" data-action="refresh">Обновить</button> <button class="btn secondary" data-action="logout">Выйти</button>','support')}</main>`;return;}
  if(surface==='admin'&&!canAdmin()){app.innerHTML=publicNav()+`<main class="public-page">${empty('Командный центр недоступен','Для аккаунта не назначена административная роль. Backstage доступен на основном сайте.',`<a class="btn primary" href="${CONFIG.website}/backstage/">Открыть Backstage ${icon('arrow')}</a>`,'shield')}</main>`;return;}
  const viewPage=['login','register','forgot'].includes(current)?surface==='admin'?'overview':'home':current;
  if(surface==='admin'&&!auth.adminMfaReady){app.innerHTML=`<main class="recovery-layout"><section class="recovery-card"><span class="eyebrow">COMMAND CENTER / БЕЗОПАСНОСТЬ</span><h1>Защитим доступ.</h1><p>Для командного центра нужен двухэтапный вход. Подключи приложение аутентификатора и подтверди код.</p><button class="btn primary" data-action="mfa">Подключить аутентификатор ${icon('shield')}</button><p><a class="text-link" href="${CONFIG.website}/backstage/">Открыть Backstage →</a></p><button class="text-link" data-action="logout">Выйти из аккаунта</button></section></main>`;return;}
  app.innerHTML=member.workspaceShell(viewPage,surface==='admin');
  const out=$('#view');
  try{const content=await (surface==='admin'?admin.adminView(viewPage):member.memberView(viewPage));if(version!==generation||!out.isConnected)return;out.innerHTML=content;if(!['активен','одобрено'].includes(auth.profile.status))out.insertAdjacentHTML('afterbegin','<div class="notice">'+icon('shield')+'<span>Профиль ожидает решения команды. Документы и поддержка доступны; заявки на проекты откроются после одобрения.</span></div>');await member.updateUnread();if(viewPage==='feed')member.loadCommunities().catch(e=>showError($('#communities-list'),e));if(viewPage==='bo'){member.boStatus();}if(viewPage==='security'&&surface==='admin')admin.serviceStatuses();}
  catch(e){showError(out,e);}
 }
 if(version===generation){window.scrollTo({top:0,behavior:'instant'});document.title=`${titles[current]||'Люди. Проекты. Культура.'} — SCG ${surface==='admin'?'Command Center':'Backstage'}`;}
}
const titles={home:'Backstage',about:'О SCG',projects:'Проекты',documents:'Документы',support:'Поддержка',login:'Вход',register:'Присоединиться',forgot:'Восстановление доступа',privacy:'Конфиденциальность',terms:'Условия использования',overview:'Командный центр',applications:'Заявки',members:'Участники',checkin:'Смены',content:'Контент-план',announcements:'Объявления',security:'Доступ и сервисы',activity:'Моё участие',hours:'Часы и сертификаты',notifications:'Уведомления',profile:'Профиль',settings:'Настройки',feed:'Сообщество',bo:'БО · помощник'};

document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=b.dataset.id;
 e.preventDefault();
 try{
  if(action==='public-menu'){const nav=$('#public-nav');nav.classList.toggle('open');b.setAttribute('aria-expanded',String(nav.classList.contains('open')));}
  else if(action==='workspace-menu'){const w=$('#workspace');w.classList.toggle('menu-open');b.setAttribute('aria-expanded',String(w.classList.contains('menu-open')));}
  else if(action==='refresh')await route();
  else if(action==='logout')await logout();
  else if(action==='toggle-password')togglePassword(b);
  else if(action==='theme'){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('scg-color-scheme',next);}
  else if(action==='project-filter')member.filterProjects(b.dataset.filter);
  else if(action==='project-detail')await member.projectDetail(id);
  else if(action==='apply-project')await member.applyProject(id,b);
  else if(action==='cancel-application')await member.cancelApplication(id,b);
  else if(action==='new-ticket')member.newTicket();
  else if(action==='ticket')await member.ticketDialog(id,surface==='admin');
  else if(action==='document-read')await member.readDocument(id);
  else if(action==='acknowledge-document')await member.acknowledgeDocument(id,b);
  else if(action==='read-all')await member.readNotifications();
  else if(action==='read-notification')await member.readNotifications(id);
  else if(action==='issue-certificate'){await result(auth.client.rpc('issue_own_certificate',{p_project_id:id}));toast('Сертификат выпущен.');await route();}
  else if(action==='certificate')await member.certificateDialog(id);
  else if(action==='print-certificate'){document.body.classList.add('printing-certificate');window.print();setTimeout(()=>document.body.classList.remove('printing-certificate'),1000);}
  else if(action==='request-password')await member.requestPassword(b);
  else if(action==='like')await member.likePost(id,b);
  else if(action==='person')await member.personDialog(id);
  else if(action==='follow')await member.followPerson(id,b);
  else if(action==='bo-new')member.boNew();
  else if(action==='bo-conversation')await member.boLoad(id);
  else if(action==='bo-prompt')member.boPrompt(b.dataset.prompt);
  else if(action==='mfa')await member.mfaDialog();
  else if(action==='mfa-enroll')await member.mfaEnroll(b);
  else if(action==='new-project')await admin.projectForm();
  else if(action==='edit-project')await admin.projectForm(id);
  else if(action==='project-assignments')await admin.projectAssignments(id);
  else if(action==='application-review')admin.reviewApplication(id);
  else if(action==='member-details')admin.memberDetails(id);
  else if(action==='member-access')admin.memberAccess(id);
  else if(action==='new-draft')admin.draftForm();
  else if(action==='edit-draft')admin.draftForm(id);
  else if(action==='publish-draft')await admin.publishDraft(id,b);
  else if(action==='new-announcement')admin.announcementForm();
  else if(action==='mail-process')await admin.processMail(b);
 }catch(error){toast(errorText(error),'error');}
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();
 try{
  if(form.id==='auth-form')await submitAuth(form,surface==='admin');
  else if(form.id==='recovery-form')await submitRecovery(form);
  else if(form.id==='mfa-login-form')await submitMfaLogin(form);
  else if(form.id==='ticket-form')await member.submitTicket(form);
  else if(form.id==='ticket-reply-form')await member.replyTicket(form);
  else if(form.id==='profile-form')await member.saveProfile(form);
  else if(form.id==='avatar-form')await member.uploadAvatar(form);
  else if(form.id==='identity-form')await member.uploadIdentity(form);
  else if(form.id==='settings-form')await member.saveSettings(form);
  else if(form.id==='post-form')await member.submitPost(form);
  else if(form.id==='bo-form')await member.submitBo(form);
  else if(form.id==='mfa-form')await member.verifyMfa(form);
  else if(form.id==='admin-project-form')await admin.saveProject(form);
  else if(form.id==='application-review-form')await admin.submitReview(form);
  else if(form.id==='member-access-form')await admin.saveAccess(form);
  else if(form.id==='admin-members-search-form')admin.searchMembers(String(new FormData(form).get('query')||''));
  else if(form.id==='checkin-form')await admin.submitCheckin(form);
  else if(form.id==='draft-form')await admin.submitDraft(form);
  else if(form.id==='announcement-form')await admin.submitAnnouncement(form);
 }catch(error){toast(errorText(error),'error');}
});
let documentTimer,peopleTimer;
document.addEventListener('input',e=>{
 if(e.target.id==='project-search')member.filterProjects(null,e.target.value);
 else if(e.target.id==='admin-project-search')admin.searchAdminProjects(e.target.value);
 else if(e.target.id==='document-search'){clearTimeout(documentTimer);documentTimer=setTimeout(()=>member.searchDocuments(e.target.value).catch(()=>toast('Поиск временно недоступен.','error')),180);}
 else if(e.target.id==='people-search'){clearTimeout(peopleTimer);peopleTimer=setTimeout(()=>member.searchPeople(e.target.value).catch(()=>toast('Поиск временно недоступен.','error')),300);}
});
window.addEventListener('hashchange',route);
window.addEventListener('scg:refresh',route);
window.addEventListener('keydown',e=>{if(e.key==='Escape')$('#workspace')?.classList.remove('menu-open');});
onAuthChange(event=>{
 if(auth.formBusy)return;
 if(recoveryScreenLocked){if(event==='PASSWORD_RECOVERY'||event==='MFA_VERIFIED')route();return;}
 route();
});
initCommon();
await initAuth();
if(auth.recovery)recoveryScreenLocked=true;
await route();
