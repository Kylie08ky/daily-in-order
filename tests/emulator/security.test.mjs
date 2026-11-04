import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,deleteDoc,collection,getDocs,writeBatch} from 'firebase/firestore';
import {createCloudStore,RevisionConflict} from '../../lib/cloud-store.ts';
const projectId='demo-friends-isolation';
test('Firebase rules and real transactions isolate two users end to end',async()=>{
 const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const alice=env.authenticatedContext('alice',{email_verified:true}).firestore(),bob=env.authenticatedContext('bob',{email_verified:true}).firestore(),unverified=env.authenticatedContext('alice',{email_verified:false}).firestore(),guest=env.unauthenticatedContext().firestore();
  const a=createCloudStore(alice,{uid:'alice',name:'Alice',timezone:'UTC'}),b=createCloudStore(bob,{uid:'bob',name:'Bob',timezone:'UTC'});
  const initial=await a.load(),blank=await b.load();assert.equal(initial.state.tasks.length,0);assert.equal(blank.state.tasks.length,0);
  const privatePath=db=>doc(db,'users','alice','workspace','current');
  for(const db of [bob,unverified,guest]){await assertFails(getDoc(privatePath(db)));await assertFails(setDoc(privatePath(db),{ownerId:'alice',revision:1,chunks:1,schemaVersion:1,updatedAt:'now'}));await assertFails(getDoc(doc(db,'users','alice','chunks','0')));await assertFails(deleteDoc(doc(db,'users','alice','chunks','0')));}
  await assertFails(getDocs(collection(alice,'users')));await assertFails(setDoc(doc(alice,'public','data'),{private:'no'}));
  const operation={operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'note.save',payload:{date:'2026-11-02',text:'Alice private note'}}};
  const committed=await a.commit(operation,initial.revision);assert.equal(committed.revision,1);
  assert.equal((await a.commit(operation,initial.revision)).revision,1,'lost response retry acknowledged once');
  assert.equal((await b.load()).state.notes['2026-11-02'],undefined);
  const next=text=>({...operation,operationId:crypto.randomUUID(),command:{type:'note.save',payload:{date:'2026-11-03',text}}});
  const concurrent=await Promise.allSettled([a.commit(next('first'),1),a.commit(next('second'),1)]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.ok(concurrent.find(r=>r.status==='rejected').reason instanceof RevisionConflict,String(concurrent.find(r=>r.status==='rejected').reason));
  await assertFails(setDoc(privatePath(alice),{ownerId:'bob',revision:3,chunks:1,schemaVersion:1,updatedAt:'now'}));
  await assertFails(setDoc(privatePath(alice),{ownerId:'alice',revision:999,chunks:1,schemaVersion:1,updatedAt:'now'}));
  const spoof=writeBatch(bob);spoof.set(doc(bob,'users','alice','chunks','0'),{ownerId:'alice',revision:3,data:'{}'});spoof.set(privatePath(bob),{ownerId:'alice',revision:3,chunks:1,schemaVersion:1,updatedAt:'now'});await assertFails(spoof.commit());
  await assertSucceeds(getDoc(privatePath(alice)));
 }finally{await env.cleanup();}
});
