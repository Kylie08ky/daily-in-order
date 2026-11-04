import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs,query,where,serverTimestamp} from 'firebase/firestore';
import {createFeedbackStore} from '../../lib/feedback.ts';
test('feedback is owner-private, only designated admin can read all and reply, never workspace data',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
 await env.clearFirestore();
 const alice=env.authenticatedContext('feedback-alice',{email_verified:true}).firestore(),bob=env.authenticatedContext('feedback-bob',{email_verified:true}).firestore(),admin=env.authenticatedContext('feedback-admin',{email_verified:true}).firestore(),guest=env.unauthenticatedContext().firestore(),unverified=env.authenticatedContext('feedback-alice',{email_verified:false}).firestore();
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'feedbackAdmins','feedback-admin'),{enabled:true}));
 const a=createFeedbackStore(alice,'feedback-alice'),b=createFeedbackStore(bob,'feedback-bob'),owner=createFeedbackStore(admin,'feedback-admin');
 const draft={kind:'出问题了',content:'按钮看不清楚',contact:'',images:['data:image/jpeg;base64,YQ==']};
 assert.equal(await owner.isAdmin(),true);assert.equal(await a.isAdmin(),false);
 await a.submit('feedback-one',draft);await b.submit('feedback-two',{...draft,content:'另一位用户的建议'});
 for(const denied of [bob,guest,unverified])await assertFails(getDoc(doc(denied,'feedback','feedback-one')));
 await assertFails(getDocs(collection(alice,'feedback')));await assertSucceeds(getDocs(query(collection(alice,'feedback'),where('ownerId','==','feedback-alice'))));
 assert.equal((await a.list()).items.length,1);assert.equal((await owner.list(true)).items.length,2);
 await assertFails(setDoc(doc(alice,'feedbackAdmins','feedback-alice'),{enabled:true}));await assertFails(getDocs(collection(admin,'feedbackAdmins')));
 await assertFails(updateDoc(doc(alice,'feedback','feedback-one'),{status:'resolved',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(admin,'feedback','feedback-one'),{ownerId:'feedback-admin'}));
 await owner.respond('feedback-one','resolved','已修复');assert.equal((await a.list()).items[0].reply,'已修复');
 await assertFails(deleteDoc(doc(admin,'feedback','feedback-one')));await assertFails(getDoc(doc(admin,'users','feedback-alice','workspace','current')));
 const raw={...draft,ownerId:'feedback-alice',status:'new',reply:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 for(const patch of [{ownerId:'feedback-bob'},{status:'resolved'},{reply:'伪造回复'},{images:['data:text/html,evil']},{content:'x'.repeat(2001)},{images:Array(4).fill('data:image/jpeg;base64,YQ==')},{extra:'no'}])await assertFails(setDoc(doc(alice,'feedback','invalid'),{...raw,...patch}));
 await assertFails(setDoc(doc(unverified,'feedback','unverified'),raw));
 }finally{await env.cleanup();}
});
