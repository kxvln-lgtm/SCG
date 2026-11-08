import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {preview} from './preview.mjs';
const stop=await preview();
try{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const catalog=[['volunteers','BSU','Волонтёрское сопровождение'],['event_staff','BSS','Персонал мероприятия'],['photographers','CB','Фотосъёмка'],['dancers','SCN','Танцевальная команда']].map(([id,division,title])=>({id,division,title,pricing_mode:id==='volunteers'?'volunteer_review':'custom_quote',max_quantity:500}));
const results=[];
for(const width of [1440,768,390,360]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://snmcoapfubdnvaoowjjk.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(route.request().url().includes('service_catalog')?catalog:[])}));
 await page.goto('http://127.0.0.1:4173/#/services');
 await page.getByRole('heading',{name:'Команда для вашего события.'}).waitFor();
 await page.getByRole('heading',{name:'Волонтёрское сопровождение'}).waitFor();
 assert.equal(await page.locator('.service-grid article').count(),4);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
 await page.getByRole('button',{name:'Создать заказ',exact:true}).click();
 await page.getByRole('heading',{name:'Войдите в SCG'}).waitFor();
 assert.deepEqual(errors,[]);
 results.push({width,catalog:4,authGate:true,overflow:false,errors:0});await page.close();
}
await browser.close();console.log(JSON.stringify(results,null,2));
}finally{await stop();}
