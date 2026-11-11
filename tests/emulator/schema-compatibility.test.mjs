import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {createDeviceStore,accept,receive} from '../../lib/offline.ts';
import {SchemaCompatibilityError} from '../../lib/schema-version.ts';

test('schema 11 queued progress survives device reopen, upload retry and cloud reload without duplication',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();const identity={uid:'schema-user',name:'Synthetic',timezone:'UTC'},db=env.authenticatedContext(identity.uid,{email_verified:true}).firestore();
  const store=createCloudStore(db,identity,()=>{},'preview'),live=createCloudStore(db,identity,()=>{},'live');
  let snap=await store.load();const liveBefore=await live.load(),instant='2026-11-11T12:00:00.000Z';
  const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
  await run('life.save',{table:'courses',record:{id:'video',name:'Demo course',total:64,initial:4,unit:'videos'}});
  await run('task.save',{id:'task',task:{title:'Demo practice',date:'2026-11-09',minutes:60,activity:{kind:'german',refId:'video'}}});
  await run('task.record',{id:'task',date:'2026-11-10',minutes:31});
  const sessions=structuredClone(snap.state.sessions);
  const operation={operationId:crypto.randomUUID(),instant,command:{type:'activity.progress',payload:{taskId:'task',sessionId:sessions[0].id,date:'2026-11-10',recordType:'activity',entries:[{id:'entry',kind:'german',refId:'video',date:'2026-11-10',minutes:0,units:2,quantityKnown:true,videoIds:['5','6']}],outcomes:[]}}};
  const project='demo-schema-preview',device=createDeviceStore(project,identity.uid);
  let local=await device.writeDevice(accept(receive(undefined,snap),operation),undefined);
  const queued=structuredClone(local);
  // Cloud accepted the write but the client lost the acknowledgement.
  const committed=await store.commit(operation,snap.revision);
  assert.deepEqual(await device.readDevice(),queued);
  local=await createDeviceStore(project,identity.uid).readDevice();
  const retried=await createCloudStore(db,identity,()=>{},'preview').commit(local.queue[0],local.base.revision);
  assert.equal(retried.revision,committed.revision);
  local=await device.writeDevice(receive(local,retried),local.generation);
  assert.equal(local.queue.length,0);assert.equal(local.base.state.schemaVersion,12);
  assert.equal(local.base.state.tasks[0].actual,31);assert.equal(local.base.state.tasks[0].date,'2026-11-09');
  assert.deepEqual(local.base.state.sessions,sessions);assert.equal(local.base.state.life.entries.length,1);
  assert.deepEqual(local.base.state.life.entries[0].videoIds,['5','6']);assert.equal(local.base.state.life.entries[0].units,2);
  assert.deepEqual(await live.load(),liveBefore);
  const meta=doc(db,'previewUsers',identity.uid,'workspace','current'),chunk=doc(db,'previewUsers',identity.uid,'chunks','0');
  assert.equal((await getDoc(meta)).data().schemaVersion,1);
  // A future writer's content must never be rewritten by this client, even during load.
  await env.withSecurityRulesDisabled(async admin=>{
   const ref=doc(admin.firestore(),'previewUsers',identity.uid,'chunks','0');const data=(await getDoc(ref)).data();
   await setDoc(ref,{...data,data:JSON.stringify({...JSON.parse(data.data),schemaVersion:13,futureOnly:'keep'})});
  });
  const originalMeta=(await getDoc(meta)).data(),originalChunk=(await getDoc(chunk)).data(),deviceBefore=await device.readDevice();
  await assert.rejects(store.load(),SchemaCompatibilityError);await assert.rejects(store.commit(operation,retried.revision),SchemaCompatibilityError);
  assert.deepEqual((await getDoc(meta)).data(),originalMeta);assert.deepEqual((await getDoc(chunk)).data(),originalChunk);
  assert.deepEqual(await device.readDevice(),deviceBefore);
 }finally{await env.cleanup();}
});
