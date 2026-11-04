import {readdirSync,readFileSync,existsSync} from 'node:fs';import {join} from 'node:path';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
for(const forbidden of ['.openai','.wrangler','db','drizzle','app/api','app/chatgpt-auth.ts'])if(existsSync(forbidden))throw Error('Private hosting file present: '+forbidden);
for(const path of walk('dist'))if(/\.(js|html|json|webmanifest|css|txt|md)$/.test(path)){
 const s=readFileSync(path,'utf8');for(const value of ['oai-authenticated-user-id','/api/automation','/signin-with-chatgpt','VITE_FIREBASE_EMULATORS'])if(s.includes(value))throw Error('Private or emulator binding in build: '+value);
}
console.log('Build audit passed: no private Site bindings, owner endpoints, or emulator toggle.');
