import test from 'node:test';import assert from 'node:assert/strict';import 'fake-indexeddb/auto';
import {dataSpaceForHost,deviceNamespace} from '../lib/data-space.ts';
import {createDeviceStore,receive,accept,projected} from '../lib/offline.ts';
import {freshState} from '../lib/cloud-store.ts';
test('reviewed bundle uses independent preview storage and original live destination after promotion',()=>{
 for(const host of ['daily-in-order-example.web.app','daily-in-order-example.firebaseapp.com'])assert.equal(dataSpaceForHost(host,'daily-in-order-example'),'live');
 for(const host of ['daily-in-order-example--workbench-review-jcm1lx87.web.app','localhost','127.0.0.1'])assert.equal(dataSpaceForHost(host,'daily-in-order-example'),'preview');
 for(const host of ['evil.web.app','daily-in-order-example.web.app.evil.com',''])assert.throws(()=>dataSpaceForHost(host,'daily-in-order-example'));
 assert.equal(deviceNamespace('demo','live'),'demo');assert.notEqual(deviceNamespace('demo','preview'),'demo');
});
test('same UID legacy/live queues never replay into preview; clearing preview preserves live',async()=>{
 const project='demo-'+crypto.randomUUID(),uid='same-user',live=createDeviceStore(deviceNamespace(project,'live'),uid),preview=createDeviceStore(deviceNamespace(project,'preview'),uid);
 const snapshot={ownerId:uid,state:freshState({uid,name:'User',timezone:'UTC'}),revision:0,updatedAt:new Date().toISOString()};
 let original=receive(undefined,snapshot);original=accept(original,{operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'note.save',payload:{date:'2026-11-04',text:'unsent live note'}}});
 await live.writeDevice(original,undefined);assert.equal(await preview.readDevice(),undefined);
 let copy=receive(undefined,snapshot);copy=accept(copy,{operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'note.save',payload:{date:'2026-11-04',text:'preview experiment'}}});
 const saved=await preview.writeDevice(copy,undefined);assert.equal(projected(await live.readDevice()).state.notes['2026-11-04'],'unsent live note');
 await preview.clearDevice(saved.generation);assert.equal((await live.readDevice()).queue.length,1);
});


test('preview enables all optional modules once without altering live defaults or records',async()=>{
 const {initializePreviewModules}=await import('../lib/preview-defaults.ts');
 const identity={uid:'tester',name:'Tester',timezone:'UTC'};
 const live=freshState(identity),preview=freshState(identity,'preview');
 assert.deepEqual(live.settings.visibleModules,[]);assert.equal(live.settings.nutritionEnabled,false);
 assert.equal(preview.settings.visibleModules.length,5);assert.equal(preview.settings.nutritionEnabled,true);
 const existing=structuredClone(live);existing.notes['2026-11-04']='keep me';existing.onboarding='completed';
 initializePreviewModules(existing,'preview');assert.equal(existing.settings.nutritionEnabled,true);assert.equal(existing.notes['2026-11-04'],'keep me');assert.equal(existing.onboarding,'completed');
 existing.settings.nutritionEnabled=false;existing.settings.visibleModules=['reading'];
 initializePreviewModules(existing,'preview');assert.deepEqual(existing.settings.visibleModules,['reading']);assert.equal(existing.settings.nutritionEnabled,false);
 const unchanged=structuredClone(live);initializePreviewModules(unchanged,'live');assert.deepEqual(unchanged,live);
});


test('custom production domains are explicit and preview matching cannot accept lookalikes',()=>{
 const project='daily-in-order-example';
 assert.throws(()=>dataSpaceForHost('planner.example.com',project));
 assert.equal(dataSpaceForHost('planner.example.com',project,['planner.example.com']),'live');
 for(const host of ['planner.example.com.attacker.test',project+'--previewXwebXapp',project+'--preview.web.app.attacker.test'])assert.throws(()=>dataSpaceForHost(host,project,['planner.example.com']));
 assert.throws(()=>dataSpaceForHost('other.web.app','invalid.project'));
});
