import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,deleteDoc,writeBatch} from 'firebase/firestore';
import {createCloudStore} from '../../lib/cloud-store.ts';import {createFeedbackStore} from '../../lib/feedback.ts';
test('same account preview writes, imports, feedback and revisions never alter live',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
 await env.clearFirestore();const db=env.authenticatedContext('alice',{email_verified:true}).firestore(),bob=env.authenticatedContext('bob',{email_verified:true}).firestore(),unverified=env.authenticatedContext('alice',{email_verified:false}).firestore(),guest=env.unauthenticatedContext().firestore();
 const identity={uid:'alice',name:'Alice',timezone:'UTC'},live=createCloudStore(db,identity,()=>{},'live'),preview=createCloudStore(db,identity,()=>{},'preview');
 const op=text=>({operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'note.save',payload:{date:'2026-11-04',text}}});
 const initial=await live.load(),saved=await live.commit(op('real record'),initial.revision);const empty=await preview.load();assert.equal(empty.state.notes['2026-11-04'],undefined);
 assert.equal(empty.state.settings.nutritionEnabled,true);assert.equal(empty.state.settings.visibleModules.length,5);assert.equal(initial.state.settings.nutritionEnabled,false);assert.deepEqual(initial.state.settings.visibleModules,[]);
 const imported=await preview.commit({operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'backup.import',payload:saved.state}},empty.revision);
 await preview.commit(op('test edit'),imported.revision);assert.deepEqual(await live.load(),saved);assert.equal((await preview.load()).state.notes['2026-11-04'],'test edit');
 await live.commit(op('new real record'),saved.revision);assert.equal((await preview.load()).state.notes['2026-11-04'],'test edit');
 for(const forbidden of [bob,unverified,guest])for(const path of [['workspace','current'],['chunks','0']]){await assertFails(getDoc(doc(forbidden,'previewUsers','alice',...path)));await assertFails(setDoc(doc(forbidden,'previewUsers','alice',...path),{ownerId:'alice'}));await assertFails(deleteDoc(doc(forbidden,'previewUsers','alice',...path)));}
 await assertFails(getDoc(doc(db,'unknownUsers','alice','workspace','current')));
 const batch=writeBatch(db);batch.set(doc(db,'previewUsers','alice','chunks','0'),{ownerId:'alice',revision:999,data:'{}'});await assertFails(batch.commit());
 const prodFeedback=createFeedbackStore(db,'alice','live'),testFeedback=createFeedbackStore(db,'alice','preview');
 await prodFeedback.submit('identical-id',{kind:'其他',content:'real feedback',contact:'',images:[]});await testFeedback.submit('identical-id',{kind:'其他',content:'test feedback',contact:'',images:[]});
 assert.equal((await getDoc(doc(db,'feedback','identical-id'))).data().content,'real feedback');assert.equal((await getDoc(doc(db,'previewFeedback','identical-id'))).data().content,'test feedback');await assertFails(getDoc(doc(bob,'previewFeedback','identical-id')));
 }finally{await env.cleanup();}
});
