// Read-only rendering and intercepted Auth transport; never sends actual email.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {preview} from './preview.mjs';
const stop=await preview(),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [1440,1024,768,390,360]){
  const page=await browser.newPage({viewport:{width,height:950},serviceWorkers:'block'});const errors=[],authCalls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://snmcoapfubdnvaoowjjk.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('/auth/v1/otp')){authCalls.push(req.postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:'{}'});}await route.fulfill({status:200,contentType:'application/json',body:'[]'});});
  await page.goto('http://127.0.0.1:4173/');await page.getByRole('heading',{name:'STAGE CRAFT GROUP'}).waitFor();
  assert.equal(await page.getByRole('link',{name:/SCG Admin/}).count(),0);
  assert.equal(await page.locator('.living-divisions>a').count(),4);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'public overflow '+width);
  if(width===1440){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/public-desktop-no-media.png',fullPage:true});}
  await page.goto('http://127.0.0.1:4173/#/auth');await page.getByRole('heading',{name:'Войти в SCG'}).waitFor();
  await page.getByLabel('Email',{exact:true}).fill('ui-test@example.invalid');await page.getByRole('button',{name:'Получить код'}).click();
  const otp=page.getByLabel('Код из письма',{exact:true});await otp.waitFor();assert.equal(await otp.getAttribute('maxlength'),'6');await otp.fill('123456');
  assert.equal(authCalls.length,1);assert.equal(authCalls[0].create_user,false);assert.equal(authCalls[0].email,'ui-test@example.invalid');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'auth overflow '+width);
  if(width===390)await page.screenshot({path:'test-results/identity-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,public:true,adminHidden:true,otp6:true,realEmailsSent:0,errors:0});await page.close();
 }
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await stop();}
