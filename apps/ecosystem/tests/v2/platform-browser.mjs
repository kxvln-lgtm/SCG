import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {preview} from './preview.mjs';
const stop=await preview();const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const profile={id:user.id,first_name:'Тест',last_name:'Пользователь',role:'VOLUNTEER',status:'активен',department:'UNION',region:'Север',personnel_id:'TEST-LOCAL-ID'};
const projects=[0,1,2].map(i=>({id:'test-'+i,title:'Тестовый проект '+i,department:i%2?'CAST':'PR',status:'open',cover_url:'https://snmcoapfubdnvaoowjjk.supabase.co/storage/v1/object/public/ui-test/'+i+'.png'}));
const token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test';
const picture=await readFile('public/media/scg.png');const result=[];
try{
 for(const width of [1440,1024,768,390,360]){
  const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({user,token})=>{localStorage.setItem('scg-essentials-beta-auth',JSON.stringify({access_token:token,refresh_token:'ui-only',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user,token_type:'bearer'}));localStorage.setItem('scg-theme','light');},{user,token});
  await page.route('https://snmcoapfubdnvaoowjjk.supabase.co/**',async route=>{const url=new URL(route.request().url());const name=url.pathname.split('/').pop();if(url.pathname.includes('/storage/'))return route.fulfill({status:200,contentType:'image/png',body:picture,headers:{'Access-Control-Allow-Origin':'*'}});const data=name==='profiles'?profile:name==='scg_public_projects'?projects:[];await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
  await page.goto('http://127.0.0.1:4173/#/one');await page.getByRole('heading',{name:/Твои проекты/}).waitFor();await page.getByRole('button',{name:'SOUTH',exact:true}).click();await page.locator('.region-info').getByText('Алматы',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'one overflow '+width);
  if(width===1440){await page.locator('.regional-stage canvas').waitFor({state:'attached'});await page.getByRole('button',{name:'Приостановить движение'}).click();await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/backstage-one-desktop.png',fullPage:true});}
  if(width===390)await page.screenshot({path:'test-results/backstage-one-mobile.png',fullPage:true});
  await page.goto('http://127.0.0.1:4173/#/space');await page.getByRole('heading',{name:/Пространство.*для креативных/}).waitFor();await page.getByRole('button',{name:'Следующий проект'}).click();await page.locator('.cinema-controls').getByText('2 / 3',{exact:true}).waitFor();
  assert.equal(await page.locator('.cinema-frame.current').getAttribute('aria-hidden'),'false');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'space overflow '+width);
  if(width===1440)await page.screenshot({path:'test-results/space-desktop.png',fullPage:true});
  await page.getByRole('link',{name:'Начать',exact:false}).click();assert.ok(page.url().includes('#/space/discover'));await page.getByRole('link',{name:'Тестовый проект 0',exact:false}).click();assert.ok(page.url().includes('#/space/projects/test-0'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4173/#/one');await page.getByRole('button',{name:'WEST',exact:true}).click();await page.locator('.region-info').getByText('Актобе',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);result.push({width,one:true,space:true,regionSelection:true,carousel:true,deepLinks:true,reducedMotion:true,errors:0});await page.close();
 }
 console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await stop();}
