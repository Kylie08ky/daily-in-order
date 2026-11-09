import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';import {createCloudStore} from '../../lib/cloud-store.ts';
test('weekly schedule commits once, rechecks conflicts and isolates preview from live',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const db=env.authenticatedContext('plan-demo',{email_verified:true}).firestore(),identity={uid:'plan-demo',name:'Demo',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');let snap=await store.load();const liveBefore=await live.load(),instant='2026-11-09T12:00:00Z';
 const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
 await run('capacity.save',{date:'2026-11-10',hours:8});await run('task.save',{id:'task',task:{title:'Demo',minutes:60}});
 const revision=snap.revision,op={operationId:crypto.randomUUID(),instant,command:{type:'planning.schedule',payload:{id:'task',date:'2026-11-10',start:'09:00',minutes:60}}};snap=await store.commit(op,revision);assert.equal((await store.commit(op,revision)).revision,snap.revision);snap=await store.load();assert.equal(snap.state.tasks.length,1);assert.equal(snap.state.tasks[0].start,'09:00');assert.equal(snap.state.tasks[0].actual,null);
 await run('task.save',{id:'other',task:{title:'Conflict',date:'2026-11-10',start:'10:00',minutes:60}});const before=await store.load();await assert.rejects(()=>run('planning.schedule',{id:'task',date:'2026-11-10',start:'10:30',minutes:60}),/重叠/);assert.deepEqual(await store.load(),before);assert.deepEqual(await live.load(),liveBefore);
 }finally{await env.cleanup();}
});
