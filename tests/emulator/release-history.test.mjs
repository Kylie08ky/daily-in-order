import test from 'node:test';import {readFileSync} from 'node:fs';import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';import {doc,getDoc,setDoc,deleteDoc,collection,getDocs} from 'firebase/firestore';
test('public release metadata is readable but no client can publish, list or access workspaces',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.withSecurityRulesDisabled(async a=>setDoc(doc(a.firestore(),'releaseHistory','live'),{payload:'[]'}));
 for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('release-reader',{email_verified:true}).firestore()]){
 await assertSucceeds(getDoc(doc(db,'releaseHistory','live')));await assertFails(setDoc(doc(db,'releaseHistory','live'),{payload:'[]'}));await assertFails(deleteDoc(doc(db,'releaseHistory','live')));await assertFails(getDocs(collection(db,'releaseHistory')));await assertFails(getDoc(doc(db,'users','someone-else','workspace','current')));
 }}finally{await env.cleanup();}
});
