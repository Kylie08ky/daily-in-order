import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {investmentToken} from '../../lib/investment-edits.ts';
import {learningSources} from '../../lib/learning-sources.ts';
import {previewTransfer} from '../../lib/learning-transfer.ts';
test('time sources, audit, retry and reassignment survive cloud reload without leaking to live',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const identity={uid:'source-test',name:'Synthetic',timezone:'UTC'},db=env.authenticatedContext(identity.uid,{email_verified:true}).firestore(),store=createCloudStore(db,identity,()=>{},'preview');let snap=await store.load();const instant='2026-11-11T18:00:00Z';
 const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
 for(const id of ['podcast','commute'])await run('life.save',{table:'courses',record:{id,name:id,mode:'practice',category:'listening'}});
 await run('task.save',{id:'task',task:{title:'Synthetic commute',date:'2026-11-06',activity:{kind:'german',refId:'podcast',category:'listening'}}});
 await run('task.record',{id:'task',date:'2026-11-06',minutes:60});await run('task.record',{id:'task',date:'2026-11-10',minutes:45});
 const original=structuredClone(snap.state),session=snap.state.sessions.at(-1);
 const command={type:'investment.correct',payload:{id:'correction',kind:'task',recordId:'task',token:investmentToken(snap.state,'task','task'),change:{type:'session.update',payload:{id:session.id,date:session.date,spans:[],untimedSeconds:1800,note:'corrected'}}}},op={operationId:crypto.randomUUID(),instant,command},revision=snap.revision;
 await store.commit(op,revision);snap=await store.commit(op,revision);snap=await store.load();assert.equal(snap.state.tasks[0].actual,90);assert.equal(snap.state.investmentEdits.length,1);assert.equal(snap.state.sessions.length,2);
 const keys=[{kind:'task',id:'task'}],preview=previewTransfer(snap.state,keys,'commute');await run('learning.transfer',{id:'move',keys,toId:'commute',token:preview.token});
 assert.equal(learningSources(snap.state,'podcast','2026-11-09','2026-11-15').total,0);assert.equal(learningSources(snap.state,'commute','2026-11-09','2026-11-15').total,30);
 await run('learning.undo',{id:'move'});await run('investment.undo',{id:'correction'});snap=await store.load();assert.deepEqual(snap.state.sessions,original.sessions);assert.deepEqual(snap.state.tasks,original.tasks);assert.equal(snap.state.schemaVersion,16);
 assert.equal((await createCloudStore(db,identity,()=>{},'live').load()).state.tasks.length,0);
 }finally{await env.cleanup();}
});
