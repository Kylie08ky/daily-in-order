import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';

test('quick batch retries are idempotent, undo persists, and live/other accounts stay unchanged',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const db=env.authenticatedContext('quick-alice',{email_verified:true}).firestore();
  const identity={uid:'quick-alice',name:'Demo',timezone:'UTC'};
  const preview=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');
  const bob=createCloudStore(env.authenticatedContext('quick-bob',{email_verified:true}).firestore(),{...identity,uid:'quick-bob'},()=>{},'preview');
  const before=await preview.load(),liveBefore=await live.load(),bobBefore=await bob.load();
  const command={type:'quick.add',payload:{firstLogin:true,items:[{id:'draft1',title:'Synthetic reading',date:'2026-11-04',start:'',minutes:0}]}};
  const op={operationId:crypto.randomUUID(),instant:new Date().toISOString(),command};
  const saved=await preview.commit(op,before.revision);
  const retried=await preview.commit(op,before.revision);
  assert.equal(retried.state.tasks.length,1);assert.equal(retried.revision,saved.revision);
  const undo={operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'quick.undo',payload:saved.state.tasks}};
  await preview.commit(undo,saved.revision);
  assert.ok((await preview.load()).state.tasks[0].deletedAt);
  assert.deepEqual(await live.load(),liveBefore);assert.deepEqual(await bob.load(),bobBefore);
 }finally{await env.cleanup();}
});
