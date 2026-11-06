import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {parseAIPlan,prepareQuickBatch} from '../../lib/quick-capture.ts';

test('quick batch retries are idempotent, undo persists, and live/other accounts stay unchanged',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const db=env.authenticatedContext('quick-alice',{email_verified:true}).firestore();
  const identity={uid:'quick-alice',name:'Demo',timezone:'UTC'};
  const preview=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');
  const bob=createCloudStore(env.authenticatedContext('quick-bob',{email_verified:true}).firestore(),{...identity,uid:'quick-bob'},()=>{},'preview');
  const before=await preview.load(),liveBefore=await live.load(),bobBefore=await bob.load();
  // Synthetic browser smoke-test output: timed, duration-only and unscheduled tasks.
  const draft=parseAIPlan(JSON.stringify({projects:[{key:'learn',name:'虚构学习项目',note:'练习',start:'',deadline:''}],tasks:[
   {title:'阅读',projectKey:'learn',date:'2026-11-07',start:'',minutes:30},
   {title:'散步',projectKey:'learn',date:'2026-11-07',start:'19:00',minutes:45},
   {title:'整理演示资料',date:'',start:'',minutes:0}
  ]}));
  const command={type:'quick.add',payload:{firstLogin:true,...prepareQuickBatch(before.state,draft)}};
  const op={operationId:crypto.randomUUID(),instant:new Date().toISOString(),command};
  const saved=await preview.commit(op,before.revision);
  const retried=await preview.commit(op,before.revision);
  assert.equal(retried.state.tasks.length,3);assert.equal(retried.revision,saved.revision);
  const reloaded=await preview.load();
  const schedule=({title,date,start,minutes})=>({title,date,start,minutes});
  assert.deepEqual(reloaded.state.tasks.map(schedule),draft.tasks.map(schedule));
  assert.equal(reloaded.state.projects.length,1);assert.equal(reloaded.state.tasks[0].projectId,reloaded.state.projects[0].id);
  assert.ok(reloaded.state.tasks.every(t=>t.actual===null&&t.progress===0));
  const undo={operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'quick.undo',payload:{tasks:saved.state.tasks,projects:saved.state.projects}}};
  await preview.commit(undo,saved.revision);
  assert.ok((await preview.load()).state.tasks[0].deletedAt);
  assert.ok((await preview.load()).state.projects[0].deletedAt);
  assert.deepEqual(await live.load(),liveBefore);assert.deepEqual(await bob.load(),bobBefore);
 }finally{await env.cleanup();}
});
