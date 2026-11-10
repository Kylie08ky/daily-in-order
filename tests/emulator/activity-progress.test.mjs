import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {activityStats} from '../../lib/life-metrics.ts';
test('progress retries and reloads keep one original investment and isolate preview from live',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();const db=env.authenticatedContext('progress-test',{email_verified:true}).firestore(),identity={uid:'progress-test',name:'Synthetic',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview');let snap=await store.load();
  const instant='2026-11-10T12:00:00Z';
  const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
  await run('life.save',{table:'courses',record:{id:'course',name:'Synthetic video',total:64,initial:4,unit:'videos'}});
  await run('task.save',{id:'task',task:{title:'Synthetic task',date:'2026-11-10',minutes:60,activity:{kind:'german',refId:'course'}}});
  await run('task.record',{id:'task',date:'2026-11-10',minutes:31});
  const sessionId=snap.state.sessions[0].id,before=structuredClone(snap.state.sessions),payload={taskId:'task',sessionId,date:'2026-11-10',recordType:'activity',entries:[{id:'entry',kind:'german',refId:'course',date:'2026-11-10',minutes:0,units:2,quantityKnown:true}],outcomes:[]};
  const revision=snap.revision,operation={operationId:crypto.randomUUID(),instant,command:{type:'activity.progress',payload}};
  snap=await store.commit(operation,revision);snap=await store.commit(operation,revision);
  snap=await createCloudStore(db,identity,()=>{},'preview').load();assert.equal(snap.state.life.entries.length,1);assert.equal(activityStats(snap.state,'german','course').units,2);assert.equal(snap.state.tasks[0].actual,31);
  await run('activity.progress',{...payload,entries:[{...payload.entries[0],units:3}]});
  snap=await createCloudStore(db,identity,()=>{},'preview').load();assert.equal(activityStats(snap.state,'german','course').units,3);assert.equal(snap.state.tasks[0].actual,31);assert.deepEqual(snap.state.sessions,before);assert.equal((await createCloudStore(db,identity,()=>{},'live').load()).state.tasks.length,0);
 }finally{await env.cleanup();}
});
