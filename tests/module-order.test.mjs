import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,projectModuleGroups,projectMetrics} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const at=new Date('2026-11-07T12:00:00Z');
const apply=(s,type,payload)=>applyCommand(s,{type,payload},at);
const ids=s=>projectModuleGroups(s,'p').map(m=>m.id);
function base(){
 let s=apply(emptyState(),'project.save',{id:'p',project:{name:'Example'},modules:[{id:'a',name:'A'},{id:'b',name:'B'}]});
 s=apply(s,'project.save',{id:'q',project:{name:'Other'},modules:[{id:'foreign',name:'Other module'}]});
 return apply(s,'task.save',{id:'t',task:{title:'Example task',projectId:'p',moduleId:'a',minutes:60,actual:20,progress:30}});
}
const move=(s,moduleId,direction)=>apply(s,'module.move',{projectId:'p',moduleId,direction});
test('moving modules and Unassigned persists without altering tasks, metrics, or another project',()=>{
 const original=base();assert.deepEqual(ids(original),['a','b','']);
 let s=move(original,'b','up');assert.deepEqual(ids(s),['b','a','']);
 s=move(s,'','up');assert.deepEqual(ids(s),['b','','a']);
 s=move(s,'b','down');assert.deepEqual(ids(s),['','b','a']);
 assert.deepEqual(ids(decodeState(encodeState(s))),['','b','a']);
 assert.deepEqual(s.tasks,original.tasks);assert.deepEqual(s.sessions,original.sessions);
 assert.deepEqual(projectMetrics(s,'p'),projectMetrics(original,'p'));
 assert.deepEqual(projectModuleGroups(s,'q'),projectModuleGroups(original,'q'));
 assert.deepEqual(ids(original),['a','b','']);
});
test('boundary moves are harmless and missing, foreign or invalid requests are rejected',()=>{
 const s=base();assert.deepEqual(move(s,'a','up'),s);assert.deepEqual(move(s,'','down'),s);
 for(const moduleId of ['missing','foreign'])assert.throws(()=>move(s,moduleId,'up'));
 assert.throws(()=>move(s,'a','sideways'));
 assert.throws(()=>apply(s,'module.move',{projectId:'missing',moduleId:'',direction:'up'}));
 const deleted=apply(s,'project.delete',{id:'p'});assert.throws(()=>move(deleted,'a','down'));
});
test('project edits preserve saved order while removed and newly added modules remain usable',()=>{
 let s=move(base(),'b','up');
 s=apply(s,'project.save',{id:'p',project:{name:'Renamed'},modules:[{id:'a',name:'Renamed A'},{id:'b',name:'B'},{id:'c',name:'New'}]});
 assert.deepEqual(ids(s),['b','a','','c']);
 s=apply(s,'project.save',{id:'p',project:{name:'Renamed'},modules:[{id:'b',name:'B'},{id:'c',name:'New'}]});
 assert.deepEqual(ids(s),['b','','c']);assert.equal(s.tasks[0].moduleId,'');
 s=move(s,'c','up');assert.deepEqual(ids(s),['b','c','']);
 assert.deepEqual(s.projects.find(p=>p.id==='p').moduleOrder,['b','c','']);
});
