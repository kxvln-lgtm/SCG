import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location=new URL('https://stagecraft.kz/backstage/');
const {esc,safeUrl,kazakhTimestamp,localDateTime,errorText}=await import('../assets/core.js');
test('User text is escaped before insertion in HTML and attributes',()=>assert.equal(esc('<img src=x onerror="alert(1)"> & \'x\''),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;x&#39;'));
test('Links reject script, data and insecure remote schemes',()=>{for(const url of ['javascript:alert(1)','data:text/html,test','http://evil.example'])assert.equal(safeUrl(url),'');assert.equal(safeUrl('https://stagecraft.kz/#documents'),'https://stagecraft.kz/#documents');});
test('Project dates round-trip through Kazakhstan UTC+5',()=>{const input='2026-10-11T20:30';assert.equal(kazakhTimestamp(input),'2026-10-11T15:30:00.000Z');assert.equal(localDateTime(kazakhTimestamp(input)),input);});
test('Errors do not disclose database names or server internals',()=>{assert.equal(errorText({message:'private table scg_email_outbox service_role password'}),'Не удалось выполнить действие. Попробуй ещё раз или обратись в поддержку.');assert.match(errorText({message:'REQUEST_LIMIT'}),/Слишком много/);});
