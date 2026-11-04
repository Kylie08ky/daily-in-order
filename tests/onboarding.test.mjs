import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {emptyState,validateState} from '../lib/model.ts';
import {freshState} from '../lib/cloud-store.ts';
import {applyCommand} from '../lib/commands.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
import {createDeviceStore,receive,accept,projected} from '../lib/offline.ts';
const now=new Date('2026-11-03T12:00Z');
const apply=(s,payload)=>applyCommand(s,{type:'life.onboarding',payload},now);
const goals={germanWeekly:150,readingYearly:6,sleepBed:'08:00',sleepWake:'16:00',fitnessWeekly:120};

test('only new workspaces start with the welcome guide; older accounts keep their settings',()=>{
 assert.equal(freshState({uid:'new',name:'新用户',timezone:'UTC'}).onboarding,'pending');
 for(const version of [1,2,3]){const old=emptyState();old.schemaVersion=version;delete old.onboarding;old.life.preferences.germanWeekly=210;
  const migrated=validateState(old);assert.equal(migrated.onboarding,'legacy');assert.equal(migrated.life.preferences.germanWeekly,210);
 }
});
test('completing the guide saves goals atomically without creating activities or changing other preferences',()=>{
 const s=emptyState();s.life.preferences.financeCurrency='USD';s.life.preferences.readingMinutes=45;
 const result=apply(s,{action:'complete',goals});
 assert.equal(result.onboarding,'completed');for(const [key,value] of Object.entries(goals))assert.equal(result.life.preferences[key],value);
 assert.equal(result.life.preferences.financeCurrency,'USD');assert.equal(result.life.preferences.readingMinutes,45);
 assert.equal(result.tasks.length,0);assert.equal(result.life.habits.length,0);assert.equal(result.life.entries.length,0);
 assert.equal(decodeState(encodeState(result)).onboarding,'completed');
 assert.throws(()=>apply(s,{action:'complete',goals:{...goals,readingYearly:-1}}));assert.equal(s.onboarding,'pending');
 assert.throws(()=>apply(s,{action:'complete',goals:{...goals,financeCurrency:'EUR'}}));
});
test('skip preserves preferences and later changes stay editable without reopening the guide',()=>{
 const s=emptyState();s.life.preferences.readingYearly=8;const skipped=apply(s,{action:'skip'});
 assert.equal(skipped.onboarding,'skipped');assert.deepEqual(skipped.life.preferences,s.life.preferences);
 const edited=applyCommand(skipped,{type:'life.preferences',payload:{...skipped.life.preferences,readingYearly:10}},now);
 assert.equal(edited.onboarding,'skipped');assert.equal(edited.life.preferences.readingYearly,10);
 // A delayed request from another device must not replace the newer setting.
 assert.equal(apply(edited,{action:'complete',goals}).life.preferences.readingYearly,10);
 const blank=apply(emptyState(),{action:'complete',goals:{germanWeekly:0,readingYearly:0,sleepBed:'',sleepWake:'',fitnessWeekly:0}});
 assert.equal(blank.onboarding,'completed');assert.equal(blank.life.preferences.sleepBed,'');
});
test('offline skip survives a reload and remains isolated to its account',async()=>{
 const project='demo-welcome-'+crypto.randomUUID(),alice=createDeviceStore(project,'alice'),bob=createDeviceStore(project,'bob');
 const snapshot={ownerId:'alice',state:emptyState(),revision:0,updatedAt:now.toISOString()};
 let r=accept(receive(undefined,snapshot),{operationId:'skip-once',instant:now.toISOString(),command:{type:'life.onboarding',payload:{action:'skip'}}});
 await alice.writeDevice(r,undefined);r=await alice.readDevice();assert.equal(projected(r).state.onboarding,'skipped');assert.equal(await bob.readDevice(),undefined);
 const synced={...snapshot,state:apply(snapshot.state,{action:'skip'}),revision:1};synced.state.receipts=['skip-once'];
 r=receive(r,synced);assert.equal(r.queue.length,0);assert.equal(projected(r).state.onboarding,'skipped');
});

test('manual guide saves only goals for existing accounts and does not reset first-login status',()=>{
 for(const status of ['legacy','completed','skipped']){
  const s=emptyState();s.onboarding=status;s.life.preferences.financeCurrency='CNY';s.life.preferences.readingMinutes=45;
  const r=applyCommand(s,{type:'life.goals',payload:goals},now);
  assert.equal(r.onboarding,status);assert.equal(r.life.preferences.readingYearly,6);
  assert.equal(r.life.preferences.financeCurrency,'CNY');assert.equal(r.life.preferences.readingMinutes,45);
  assert.equal(r.tasks.length,0);assert.equal(decodeState(encodeState(r)).onboarding,status);
  assert.throws(()=>applyCommand(r,{type:'life.goals',payload:{...goals,financeCurrency:'USD'}},now));
 }
});
