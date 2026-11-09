import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';import {createCloudStore} from '../../lib/cloud-store.ts';
test('split plans persist atomically, deduplicate offline retries and never write to live',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const db=env.authenticatedContext('split-demo',{email_verified:true}).firestore(),identity={uid:'split-demo',name:'Demo',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');let snap=await store.load();const originalLive=await live.load(),instant='2026-11-30T12:00:00Z';
 const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
 await run('task.save',{id:'task',task:{title:'Demo six-hour task',minutes:360}});
 await run('task.plan.save',{id:'task',planId:'a',date:'2026-11-09',start:'09:00',minutes:120});
 const revision=snap.revision,op={operationId:crypto.randomUUID(),instant,command:{type:'task.plan.save',payload:{id:'task',planId:'b',date:'2026-11-16',start:'10:00',minutes:240}}};snap=await store.commit(op,revision);assert.equal((await store.commit(op,revision)).revision,snap.revision);
 snap=await store.load();assert.equal(snap.state.tasks.length,1);assert.equal(snap.state.tasks[0].plans.length,2);assert.equal(snap.state.tasks[0].minutes,360);
 const before=await store.load();await assert.rejects(()=>run('task.plan.save',{id:'task',planId:'c',date:'2026-11-17',start:'',minutes:30}),/总预计/);assert.deepEqual(await store.load(),before);
 await run('task.record',{id:'task',date:'2026-11-09',minutes:30});await run('task.plan.delete',{id:'task',planId:'a'});snap=await store.load();assert.equal(snap.state.tasks[0].actual,30);assert.equal(snap.state.sessions.length,1);assert.equal(snap.state.sessions[0].planId,'a');assert.equal(snap.state.tasks[0].plans.length,1);assert.deepEqual(await live.load(),originalLive);
 }finally{await env.cleanup();}
});
