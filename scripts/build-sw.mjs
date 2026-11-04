import {readdirSync,writeFileSync,readFileSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const paths=walk('dist').map(p=>'/'+p.replaceAll('\\','/').slice(5)).filter(p=>p!=='/sw.js');
const hash=createHash('sha256');for(const p of paths)hash.update(readFileSync('dist'+p));const version='niannian-friends-'+hash.digest('hex').slice(0,16);
writeFileSync('dist/sw.js',`const VERSION=${JSON.stringify(version)},ASSETS=${JSON.stringify(paths)};
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('niannian-friends-')&&k!==VERSION)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='CACHE_READY')e.source?.postMessage('OFFLINE_READY');});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/__/'))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(async()=>await(await caches.open(VERSION)).match('/index.html')));return;}
if(ASSETS.includes(url.pathname))e.respondWith(caches.open(VERSION).then(async c=>await c.match(url.pathname)||fetch(e.request)));});
`);
console.log('Public app shell cached; Firebase requests are never intercepted.');
