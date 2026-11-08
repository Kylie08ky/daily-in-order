import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {previewTransfer} from '../../lib/learning-transfer.ts';
test('learning reassignment commits once, persists undo, rejects stale previews and leaves live untouched',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();const db=env.authenticatedContext('learning-demo',{email_verified:true}).firestore(),identity={uid:'learning-demo',name:'Demo',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');let snap=await store.load();const liveBefore=await live.load(),instant='2026-11-08T12:00:00Z';
  const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
  for(const id of ['old','new'])await run('life.save',{table:'courses',record:{id,name:id,category:'listening',mode:'practice'}});
  await run('task.save',{id:'original',task:{title:'Demo task',date:'2026-11-06',minutes:120,actual:70,progress:50,activity:{kind:'german',refId:'old',category:'listening'}}});
  const before=structuredClone(snap.state.tasks),keys=[{kind:'task',id:'original'}],p=previewTransfer(snap.state,keys,'new'),revision=snap.revision,op={operationId:crypto.randomUUID(),instant,command:{type:'learning.transfer',payload:{keys,toId:'new',token:p.token}}};
  snap=await store.commit(op,revision);assert.equal(snap.revision,revision+1);const retry=await store.commit(op,revision);assert.equal(retry.revision,snap.revision);snap=await store.load();assert.equal(snap.state.learningTransfers.length,1);assert.equal(snap.state.tasks[0].activity.refId,'new');assert.equal(snap.state.tasks[0].actual,70);
  await assert.rejects(()=>store.commit({...op,operationId:crypto.randomUUID()},snap.revision),/重新预览/);assert.equal((await store.load()).revision,snap.revision);
  await run('learning.undo',{id:snap.state.learningTransfers[0].id});snap=await store.load();assert.deepEqual(snap.state.tasks,before);assert.equal(snap.state.learningTransfers[0].undone,true);assert.deepEqual(await live.load(),liveBefore);
 }finally{await env.cleanup();}
});
