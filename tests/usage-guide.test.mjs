import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,projectMetrics} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {newUsageProgress,usageSelection} from '../lib/usage-guide.ts';
const now=new Date('2026-11-03T12:00Z'),apply=(s,type,payload)=>applyCommand(s,{type,payload},now);
test('usage guide requires saved project, task and a real timed schedule in order',()=>{
 let s=emptyState(),g={...newUsageProgress(),step:3,projectId:'p',taskId:'t'};
 assert.equal(usageSelection(s,g).step,0);
 s=apply(s,'project.save',{id:'p',project:{name:'学习编程'},modules:[]});assert.equal(usageSelection(s,g).step,1);
 s=apply(s,'task.save',{id:'t',task:{title:'完成第一节练习',projectId:'p',minutes:30}});assert.equal(usageSelection(s,g).step,2);
 s=apply(s,'task.schedule',{id:'t',date:'2026-11-03',start:'',minutes:30});assert.equal(usageSelection(s,g).scheduled,false);
 s=apply(s,'task.schedule',{id:'t',date:'2026-11-03',start:'10:00',minutes:30});assert.equal(usageSelection(s,g).step,3);
 assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].actual,null);assert.equal(projectMetrics(s,'p').progress,0);
 s=apply(s,'task.progress',{id:'t',progress:100,actual:25});assert.equal(projectMetrics(s,'p').progress,100);assert.equal(projectMetrics(s,'p').spent,25);
});
test('reusing existing records does not insert demo data or edit them',()=>{
 let s=apply(emptyState(),'project.save',{id:'p',project:{name:'已有项目'},modules:[]});
 s=apply(s,'task.save',{id:'t',task:{title:'已有任务',projectId:'p',date:'2026-11-03',start:'11:00',minutes:45}});
 const before=JSON.stringify(s);const result=usageSelection(s,{step:3,projectId:'p',taskId:'t',awaiting:null});
 assert.equal(result.scheduled,true);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(newUsageProgress(),{step:0,projectId:'',taskId:'',awaiting:null});
});
test('deleted, archived or mismatched selections return to the appropriate step',()=>{
 let s=apply(emptyState(),'project.save',{id:'p',project:{name:'项目'},modules:[]});
 s=apply(s,'task.save',{id:'t',task:{title:'独立任务',date:'2026-11-03',start:'11:00'}});
 const g={step:3,projectId:'p',taskId:'t',awaiting:null};assert.equal(usageSelection(s,g).step,1);
 s=apply(s,'project.delete',{id:'p'});assert.equal(usageSelection(s,g).step,0);
});
