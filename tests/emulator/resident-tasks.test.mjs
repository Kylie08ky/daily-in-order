import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';import {createCloudStore} from '../../lib/cloud-store.ts';
test('resident use persists once across retries and archive keeps actual records and live isolated',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const db=env.authenticatedContext('resident-demo',{email_verified:true}).firestore(),identity={uid:'resident-demo',name:'Demo',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');let snap=await store.load();const untouched=await live.load(),instant='2026-11-10T12:00:00Z';
 const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
 await run('template.save',{id:'entry',task:{title:'Demo coding',minutes:60},kind:'stage'});
 const revision=snap.revision,op={operationId:'resident-use',instant,command:{type:'template.use',payload:{id:'entry',newId:'today',date:'2026-11-10',minutes:60,start:''}}};snap=await store.commit(op,revision);assert.equal((await store.commit(op,revision)).revision,snap.revision);
 await assert.rejects(()=>run('template.use',{id:'entry',newId:'duplicate',date:'2026-11-10'}),/当天已有/);assert.equal((await store.load()).state.tasks.length,1);
 await run('task.record',{id:'today',date:'2026-11-10',minutes:60,progress:100});await run('template.status',{id:'entry',status:'archived'});snap=await store.load();assert.equal(snap.state.tasks[0].actual,60);assert.equal(snap.state.sessions.length,1);assert.equal(snap.state.templates[0].status,'archived');assert.deepEqual(await live.load(),untouched);
 }finally{await env.cleanup();}
});
