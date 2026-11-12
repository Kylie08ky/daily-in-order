import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {createCloudStore} from '../../lib/cloud-store.ts';
import {bookProgress} from '../../lib/life-metrics.ts';
import {concreteOutcomes} from '../../lib/development-projects.ts';
test('concrete outcomes and page-only corrections survive cloud retries without changing original investments',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-friends-isolation',firestore:{host:'127.0.0.1',port:8085,rules:readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();const identity={uid:'concrete-test',name:'Synthetic',timezone:'UTC'},db=env.authenticatedContext(identity.uid,{email_verified:true}).firestore(),store=createCloudStore(db,identity,()=>{},'preview');let snap=await store.load();const instant='2026-11-11T12:00:00Z';
  const run=async(type,payload)=>snap=await store.commit({operationId:crypto.randomUUID(),instant,command:{type,payload}},snap.revision);
  const retry=async(type,payload)=>{const operation={operationId:crypto.randomUUID(),instant,command:{type,payload}},revision=snap.revision;await store.commit(operation,revision);snap=await store.commit(operation,revision);snap=await createCloudStore(db,identity,()=>{},'preview').load();};
  await run('project.save',{id:'dev',project:{name:'Development'},modules:[]});
  await run('task.save',{id:'task',task:{title:'Shared development',projectId:'dev',date:'2026-11-06',minutes:120}});
  await run('task.record',{id:'task',date:'2026-11-06',minutes:120});
  await run('life.save',{table:'books',record:{id:'book',title:'Synthetic book',total:258,initial:149}});
  for(const [id,date,minutes] of [['old','2026-11-06',20],['new','2026-11-08',30]])await run('life.save',{table:'entries',record:{id,kind:'reading',refId:'book',date,minutes}});
  const tasks=structuredClone(snap.state.tasks),sessions=structuredClone(snap.state.sessions),entries=structuredClone(snap.state.life.entries);
  for(const id of ['alpha','beta','gamma'])await retry('development.save',{id,projectId:'dev',name:id});
  const outcomes=['alpha','beta','gamma'].map(id=>({id:'outcome-'+id,developmentId:id,projectId:'dev',date:'2026-11-06',version:'v0.5',result:'Synthetic outcome',status:'milestone'}));
  await retry('activity.progress',{taskId:'task',date:'2026-11-06',recordType:'project',entries:[],outcomes});
  await retry('reading.checkpoint',{id:'old',page:97});await retry('reading.checkpoint',{id:'new',page:149});
  assert.equal(snap.state.schemaVersion,16);assert.equal(snap.state.developmentProjects.length,3);
  for(const id of ['alpha','beta','gamma'])assert.equal(concreteOutcomes(snap.state,'dev',id).length,1);
  assert.equal(bookProgress(snap.state,'book').pages,149);assert.deepEqual(snap.state.sessions,sessions);
  for(const original of tasks){const current=snap.state.tasks.find(t=>t.id===original.id);const {outcomes:a,recordType:b,...before}=original,{outcomes:c,recordType:d,...after}=current;assert.deepEqual(after,before);}
  for(const original of entries){const {page,...current}=snap.state.life.entries.find(e=>e.id===original.id);assert.deepEqual(current,original);assert.equal(page,original.id==='old'?97:149);}
  const live=await createCloudStore(db,identity,()=>{},'live').load();assert.equal(live.state.tasks.length,0);assert.equal(live.state.developmentProjects.length,0);
 }finally{await env.cleanup();}
});
