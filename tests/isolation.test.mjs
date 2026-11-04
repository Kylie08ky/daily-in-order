import test from 'node:test';import assert from 'node:assert/strict';import 'fake-indexeddb/auto';
import {createDeviceStore,receive,accept,projected} from '../lib/offline.ts';
import {freshState} from '../lib/cloud-store.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const identity=uid=>({uid,name:uid,timezone:'UTC'});
const snapshot=uid=>({ownerId:uid,state:freshState(identity(uid)),revision:0,updatedAt:new Date().toISOString()});
test('new accounts have no tasks, courses, finance entries, or another person’s name',()=>{
 const a=freshState(identity('Alice')),b=freshState(identity('Bob'));
 for(const s of [a,b]){assert.equal(s.tasks.length,0);assert.equal(s.projects.length,0);assert.equal(s.series.length,0);assert.equal(s.sessions.length,0);for(const [key,value] of Object.entries(s.life))if(Array.isArray(value))assert.equal(value.length,0,key);assert.equal(s.life.preferences.monthlyLiving,null);}
 assert.equal(a.settings.name,'Alice');assert.equal(b.settings.name,'Bob');assert.equal(b.settings.timezone,'UTC');
});
test('offline queues are isolated by project and UID, including clear and stale writes',async()=>{
 const project='demo-'+crypto.randomUUID(),a=createDeviceStore(project,'alice'),b=createDeviceStore(project,'bob'),other=createDeviceStore('other-project','alice');
 let r=receive(undefined,snapshot('alice'));r=accept(r,{operationId:crypto.randomUUID(),instant:new Date().toISOString(),command:{type:'note.save',payload:{date:'2026-11-02',text:'Alice only'}}});
 const saved=await a.writeDevice(r,undefined);
 assert.equal(await b.readDevice(),undefined);assert.equal(await other.readDevice(),undefined);
 await assert.rejects(b.writeDevice(saved,undefined),/不属于当前账号/);
 const bob=await b.writeDevice(receive(undefined,snapshot('bob')),undefined);
 await assert.rejects(a.writeDevice(r,undefined),/其他窗口/);
 await b.clearDevice(bob.generation);
 assert.equal(projected(await a.readDevice()).state.notes['2026-11-02'],'Alice only');
 assert.throws(()=>receive(awaitable(saved),snapshot('bob')),/账号/);
 function awaitable(value){return value;}
});
test('large Unicode snapshots are split below Firestore document limits and restored intact',()=>{
 const s=freshState(identity('Alice'));s.tasks=Array.from({length:150},(_,i)=>({id:'task-'+i,title:'测试 '+i,note:'中文🌿'.repeat(700),projectId:'',moduleId:'',category:'默认',date:'',start:'',minutes:30,actual:null,progress:0,deadline:'',parentId:'',relation:'contained',activity:null,seriesId:'',occurrence:'',createdAt:'2026-11-02',completedAt:null,deletedAt:null,order:i}));
 const parts=encodeState(s);assert.ok(parts.length>1);for(const p of parts)assert.ok(new TextEncoder().encode(p).length<=600000);assert.deepEqual(decodeState(parts),s);
});
