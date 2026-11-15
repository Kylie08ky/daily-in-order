import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {initializeTestEnvironment} from '@firebase/rules-unit-testing';import {createCloudStore} from '../../lib/cloud-store.ts';
test('focus actual start/end survive Firestore reload and pause/resume in preview, live stays blank',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const db=env.authenticatedContext('focus-user',{email_verified:true}).firestore(),identity={uid:'focus-user',name:'Test',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview');let snap=await store.load();
 const run=async(type,payload,instant)=>{snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);snap=await createCloudStore(db,identity,()=>{},'preview').load();};
 await run('task.save',{id:'t',task:{title:'Podcast',date:'2026-11-04',start:'09:00',minutes:30}},'2026-11-04T06:00:00Z');await run('focus.start',{taskId:'t',mode:'countup'},'2026-11-04T10:10:00Z');await run('focus.pause',undefined,'2026-11-04T10:20:00Z');await run('focus.start',{taskId:'t'},'2026-11-04T10:35:00Z');await run('focus.finish',undefined,'2026-11-04T10:55:00Z');
 assert.equal(snap.state.tasks[0].actual,30);assert.equal(snap.state.sessions[0].spans.length,2);assert.equal(snap.state.sessions[0].spans[0].startedAt,'2026-11-04T10:10:00.000Z');assert.equal(snap.state.sessions[0].spans[1].endedAt,'2026-11-04T10:55:00.000Z');assert.equal((await createCloudStore(db,identity,()=>{},'live').load()).state.tasks.length,0);
 }finally{await env.cleanup();}
});

test('expired countdown continues after cloud reload and retry without double counting',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{await env.clearFirestore();const db=env.authenticatedContext('continue-user',{email_verified:true}).firestore(),identity={uid:'continue-user',name:'Test',timezone:'Europe/Berlin'},store=createCloudStore(db,identity,()=>{},'preview');let snap=await store.load();
 const run=async(type,payload,instant)=>{snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);snap=await createCloudStore(db,identity,()=>{},'preview').load();};
 await run('task.save',{id:'t',task:{title:'Synthetic focus',minutes:25}},'2026-11-15T10:00:00Z');
 await run('focus.start',{taskId:'t',mode:'countdown',minutes:25},'2026-11-15T10:00:00Z');
 const payload={taskId:'t',target:1500,anchor:snap.state.focus.startedAt};
 await run('focus.pause',{expectedMode:'countdown'},'2026-11-15T10:25:10Z');
 await run('focus.continue',payload,'2026-11-15T10:30:00Z');
 await run('focus.continue',payload,'2026-11-15T10:30:30Z');
 assert.equal(snap.state.focus.startedAt,'2026-11-15T10:30:00.000Z');
 await run('focus.finish',{sessionId:'combined'},'2026-11-15T10:35:00Z');
 assert.equal(snap.state.sessions.length,1);assert.equal(snap.state.sessions[0].seconds,1800);assert.equal(snap.state.tasks[0].actual,30);assert.notEqual(snap.state.tasks[0].progress,100);
 assert.equal(snap.state.sessions[0].spans[0].endedAt,'2026-11-15T10:25:00.000Z');
 assert.equal(snap.state.sessions[0].spans[1].startedAt,'2026-11-15T10:30:00.000Z');
 assert.equal((await createCloudStore(db,identity,()=>{},'live').load()).state.tasks.length,0);
 }finally{await env.cleanup();}
});
