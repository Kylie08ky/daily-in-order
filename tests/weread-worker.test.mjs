import test from 'node:test';
import assert from 'node:assert/strict';
import {handle,authenticate} from '../integrations/weread/worker.mjs';
const origin='https://preview.example.org',env={ALLOWED_ORIGINS:origin,FIREBASE_PROJECT_ID:'demo-friends-isolation',FIREBASE_WEB_API_KEY:'synthetic-public-key',RATE_LIMITER:{limit:async()=>({success:true})}};
const payload={aud:env.FIREBASE_PROJECT_ID,iss:'https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID,sub:'demo-user',exp:Date.now()/1000+3600,auth_time:1700000000};
const token=()=> 'header.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.signature';
const request=(body={},options={})=>new Request('https://worker.example.org/weread',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({key:'wrk-synthetickey',api:'/shelf/sync',...body}),...options});
const user={localId:'demo-user',emailVerified:true,validSince:'1600000000'};
test('gateway denies other origins and methods; preflight needs no personal key',async()=>{
 const fail=()=>{throw Error('unexpected network');};
 assert.equal((await handle(new Request('https://worker.example.org/weread',{method:'OPTIONS',headers:{Origin:origin}}),env,fail)).status,204);
 assert.equal((await handle(new Request('https://worker.example.org/weread',{method:'OPTIONS',headers:{Origin:'https://evil.example.org'}}),env,fail)).status,403);
 assert.equal((await handle(new Request('https://worker.example.org/weread',{headers:{Origin:origin}}),env,fail)).status,405);
 assert.equal((await handle(request(),{...env,RATE_LIMITER:undefined},fail)).status,503);
 assert.equal((await handle(request(),{...env,RATE_LIMITER:{limit:async()=>({success:false})}},fail)).status,429);
});
test('authentication is verified by Google, not trusted decoded claims; rejects disabled/unverified/revoked users',async()=>{
 for(const result of [{...user,emailVerified:false},{...user,disabled:true},{...user,validSince:String(payload.auth_time+1)},{...user,localId:'other'}])await assert.rejects(authenticate(token(),env,async()=>Response.json({users:[result]})));
 await assert.rejects(authenticate(token(),env,async()=>Response.json({error:'invalid'},{status:400})));
 await assert.rejects(authenticate(token(),{...env,FIREBASE_PROJECT_ID:'other'},async()=>{throw Error('should not fetch');}));
});
test('only two read APIs, fixed upstream/version; credentials and reading time never returned',async()=>{
 const calls=[];const send=async(url,options)=>{calls.push({url,options});if(url.startsWith('https://identitytoolkit.googleapis.com/'))return Response.json({users:[user]});return Response.json({bookId:'book123',book:{progress:1,updateTime:123,recordReadingTime:9999},credential:'must not return'});};
 let r=await handle(request({api:'/book/getprogress',bookId:'book123'}),env,send);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(await r.json(),{bookId:'book123',book:{progress:1,updateTime:123}});
 assert.equal(calls[1].url,'https://i.weread.qq.com/api/agent/gateway');assert.equal(JSON.parse(calls[1].options.body).skill_version,'1.0.5');assert.equal(calls[1].options.redirect,'manual');assert.ok(!calls[0].options.body.includes('wrk-'));
 calls.length=0;r=await handle(request({api:'/shelf/remove'}),env,send);assert.equal(r.status,400);assert.equal(calls.length,1);
 r=await handle(request({api:'/book/getprogress',bookId:'https://evil.example'}),env,send);assert.equal(r.status,400);
});
test('upstream errors/upgrades fail safely without reflecting credentials or writing data',async()=>{
 for(const data of [{upgrade_info:{message:'upgrade'}},{errcode:-2010,errmsg:'sensitive'},{unexpected:true}]){
 const r=await handle(request(),env,async url=>url.includes('identitytoolkit')?Response.json({users:[user]}):Response.json(data));assert.ok(r.status>=400);const text=await r.text();assert.ok(!text.includes('sensitive'));assert.ok(!text.includes('wrk-'));
 }
});

 test('redirects never forward credentials and network failures are not reported as a lost login',async()=>{
 let calls=0;let r=await handle(request(),env,async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://other.example.org'}});});assert.equal(r.status,503);assert.equal(calls,1);
 r=await handle(request(),env,async()=>{throw new TypeError('synthetic network failure');});assert.equal(r.status,503);assert.equal((await r.json()).error,'unavailable');
 calls=0;r=await handle(request(),env,async(url,options)=>{calls++;assert.equal(options.redirect,'manual');return url.includes('identitytoolkit')?Response.json({users:[user]}):new Response(null,{status:302,headers:{Location:'https://other.example.org'}});});assert.equal(r.status,502);assert.equal(calls,2);
 });
