import {initPreferences} from './preferences.js?v=20261025-auth3';
import {$,CONFIG,esc,errorText,result,toast,icon,empty,loading,initCommon,closeDialog} from './core.js?v=20261025-auth3';
import {auth,recoveryEntry,initAuth,onAuthChange,canAdmin,legacyAdmin,authCard,recoveryCard,submitAuth,submitRecovery,logout,togglePassword,mfaLoginCard,submitMfaLogin,signInGoogle,resendEmailOtp,resetEmailOtp} from './auth.js?v=20261025-auth3';
import {publicNav,publicFooter,homeMarkup,aboutMarkup,directionsMarkup,loadHomeProjects,documentsPage,legalPage,supportPublic,documents} from './public-ecosystem-20261028.js';
import * as member from './member-ecosystem-20261028.js';
import * as admin from './admin-ecosystem-20261028.js';
import * as badges from './badge-admin.js?v=20261025-auth3';
import {mountExperience,clearExperience} from './experience.js?v=20261025-auth3';


const surface='admin';let refresh=async()=>{},initialized=false;export async function connect(update,client,session,profile){refresh=update;auth.client=client;auth.session=session;auth.profile=profile;auth.ready=true;const r=await client.rpc('scg_cc_context');auth.org=r.data;if(!initialized){initCommon();initialized=true;}}export {admin,auth};
document.addEventListener('click',async e=>{
 if(!e.target.closest('.legacy-admin'))return;const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,id=b.dataset.id;
 e.preventDefault();
 try{
  if(action==='public-menu'){const nav=$('#public-nav');nav.classList.toggle('open');b.setAttribute('aria-expanded',String(nav.classList.contains('open')));}
  else if(action==='workspace-menu'){const w=$('#workspace');w.classList.toggle('menu-open');w.querySelectorAll('[data-action=workspace-menu]').forEach(control=>control.setAttribute('aria-expanded',String(w.classList.contains('menu-open'))));}
  else if(action==='refresh')await refresh();
  else if(action==='logout')await logout();
  else if(action==='toggle-password')togglePassword(b);
  else if(action==='otp-resend')await resendEmailOtp(b);
  else if(action==='otp-reset')resetEmailOtp();
  else if(action==='google-login')await signInGoogle(b,surface==='admin');
  else if(action==='theme'){const preference=localStorage.getItem('scg-color-scheme')||'system';const next=preference==='system'?'light':preference==='light'?'dark':'system';document.documentElement.dataset.theme=next==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):next;localStorage.setItem('scg-color-scheme',next);}
  else if(action==='project-filter')member.filterProjects(b.dataset.filter);
  else if(action==='project-detail')await member.projectDetail(id);
  else if(action==='apply-project')await member.applyProject(id,b);
  else if(action==='cancel-application')await member.cancelApplication(id,b);
  else if(action==='preview-draft')admin.previewDraft();
  else if(action==='new-ticket')member.newTicket();
  else if(action==='ticket')await member.ticketDialog(id,surface==='admin');
  else if(action==='document-read')await member.readDocument(id);
  else if(action==='acknowledge-document')await member.acknowledgeDocument(id,b);
  else if(action==='read-all')await member.readNotifications();
  else if(action==='read-notification')await member.readNotifications(id);
  else if(action==='issue-certificate'){await result(auth.client.rpc('issue_own_certificate',{p_project_id:id}));toast('Сертификат выпущен.');await refresh();}
  else if(action==='certificate')await member.certificateDialog(id);
  else if(action==='print-certificate'){document.body.classList.add('printing-certificate');window.print();setTimeout(()=>document.body.classList.remove('printing-certificate'),1000);}
  else if(action==='delete-identity')await member.deleteIdentity(b);
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
  else if(action==='badge-camera')await badges.startBadgeCamera();
  else if(action==='badge-camera-stop')badges.stopBadgeCamera();
  else if(action==='badge-revoke')await badges.changeBadgeRevocation(b);
  else if(action==='new-draft')admin.draftForm();
  else if(action==='edit-draft')admin.draftForm(id);
  else if(action==='publish-draft')await admin.publishDraft(id,b);
  else if(action==='new-announcement')admin.announcementForm();
  else if(action==='mail-process')await admin.processMail(b);
 }catch(error){toast(errorText(error),'error');}
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement)||!form.closest('.legacy-admin'))return;e.preventDefault();
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
  else if(form.id==='physical-badge-form')await badges.managePhysicalBadge(form);
  else if(form.id==='badge-verify-form')await badges.verifyBadge(form);
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

window.addEventListener('scg:refresh',()=>refresh());
document.addEventListener('change',e=>{if(e.target.id==='badge-image'&&e.target.files?.[0]){badges.scanBadgeImage(e.target.files[0]);e.target.value='';}else if(e.target.id==='badge-project'){$('#badge-verification').innerHTML='';}});
