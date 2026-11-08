import {spawn} from 'node:child_process';
import {once} from 'node:events';
export async function preview(){
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe']});
 let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw Error('Preview exited: '+output);
  try{if((await fetch('http://127.0.0.1:4173')).ok)return async()=>{server.kill();await once(server,'exit');};}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 server.kill();throw Error('Preview did not start: '+output);
}
