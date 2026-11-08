// Progressive enhancements: no tokens, personal data, or draft text persisted here.
const connection=document.createElement('div');connection.className='scg-connection';connection.setAttribute('role','status');connection.hidden=true;document.body.append(connection);
function online(){connection.hidden=navigator.onLine;connection.textContent='Нет соединения. Изменения можно отправить после подключения к интернету.'}addEventListener('online',online);addEventListener('offline',online);online();
let searchDialog;
function openSearch(){
 const nav=[...document.querySelectorAll('.sidebar-nav a,.sidebar-bottom a')].map(a=>({href:a.href,text:a.textContent.trim()}));if(!nav.length)return;
 searchDialog?.remove();searchDialog=document.createElement('dialog');searchDialog.className='scg-search-dialog';searchDialog.innerHTML='<header><h2 id="scg-search-title">Найти раздел</h2><button type="button" class="icon-btn" aria-label="Закрыть поиск">×</button></header><input type="search" placeholder="Проекты, заявки, поддержка…" aria-label="Поиск по разделам"><div class="scg-search-results"></div>';searchDialog.setAttribute('aria-labelledby','scg-search-title');document.body.append(searchDialog);
 const input=searchDialog.querySelector('input'),results=searchDialog.querySelector('.scg-search-results');
 function render(){const matches=nav.filter(n=>n.text.toLocaleLowerCase().includes(input.value.trim().toLocaleLowerCase()));results.replaceChildren();for(const item of matches){const a=document.createElement('a');a.href=item.href;a.textContent=item.text;a.addEventListener('click',()=>searchDialog.close());results.append(a)}if(!matches.length)results.textContent='Раздел не найден. Попробуй другое название.'}input.addEventListener('input',render);searchDialog.querySelector('button').addEventListener('click',()=>searchDialog.close());render();searchDialog.showModal();input.focus();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-scg-search]'))openSearch()});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.target.matches('input,textarea,[contenteditable]')){e.preventDefault();openSearch()}});
// History changes close a mobile overlay and expose the new page to assistive technology.
addEventListener('hashchange',()=>{searchDialog?.close();requestAnimationFrame(()=>{const main=document.querySelector('.workspace-content');if(main){main.setAttribute('tabindex','-1');main.focus({preventScroll:true})}})});

if(location.pathname.startsWith('/mini/')&&'serviceWorker' in navigator)navigator.serviceWorker.register('/mini/sw.js',{scope:'/mini/'}).catch(()=>{});

if(location.pathname.startsWith('/mini/'))document.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a||a.target==='_blank')return;try{const u=new URL(a.href);if((u.origin===location.origin||u.hostname==='stagecraft.kz')&&u.pathname==='/backstage/')a.href='/mini/'+u.hash}catch{}},true);
