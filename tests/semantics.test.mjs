import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState,taskInput,projectMetrics,initializeDay} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {recordedTime,calendarOccupancy} from '../lib/time-metrics.ts';
import {activityStats,allActivityMinutes} from '../lib/life-metrics.ts';
const now=new Date('2026-11-02T12:00:00Z');
const apply=(s,type,payload)=>applyCommand(s,{type,payload},now);
const task=(s,id,extra={})=>apply(s,'task.save',{id,task:{title:id,date:'2026-11-02',...extra}});
const save=(s,record)=>apply(s,'life.save',{table:'courses',record});
function base(){return apply(emptyState(),'project.save',{id:'de',project:{name:'德语'},modules:[{id:'listen',name:'听力'},{id:'vocab',name:'词汇'}]});}
test('null actual is unknown, explicit zero is known, estimate never enters actual charts',()=>{
 let s=task(task(task(base(),'known',{actual:60,minutes:90,progress:100,projectId:'de'}),'zero',{actual:0,minutes:30,progress:100,projectId:'de'}),'missing',{minutes:45,progress:100,projectId:'de'});
 assert.equal(recordedTime(s.tasks).actual,60);assert.equal(recordedTime(s.tasks).estimated,45);assert.equal(recordedTime(s.tasks).missing.length,1);assert.equal(projectMetrics(s,'de').spent,60);
 s=apply(s,'task.progress',{id:'missing',progress:100,actual:20});assert.equal(recordedTime(s.tasks).actual,80);assert.equal(recordedTime(s.tasks).missing.length,0);
});
test('course baseline correction does not fabricate sessions; practice mappings dedupe project/module/explicit links',()=>{
 let s=save(base(),{id:'a1',name:'A1',category:'listening',total:64,initial:1});
 s=save(s,{id:'listening',name:'日常听力',mode:'practice',total:null,category:'listening',projectId:'de',moduleIds:['listen']});
 s=save(s,{id:'other',name:'其他',mode:'practice',total:null,category:'other',projectId:'de',includeProject:true});
 s=task(s,'t',{minutes:30,actual:20,progress:100,projectId:'de',moduleId:'listen',activity:{kind:'german',refId:'a1'}});
 s=apply(s,'life.save',{table:'entries',record:{id:'entry',kind:'german',refId:'a1',date:'2026-11-02',minutes:20,units:0,taskId:'t'}});
 s=task(s,'v',{minutes:45,progress:100,projectId:'de',moduleId:'vocab'});
 const n=s.tasks.length;s=apply(s,'life.course.progress',{id:'a1',current:4});assert.equal(s.tasks.length,n);assert.equal(s.life.entries.length,1);assert.equal(s.life.courses[0].initial,4);
 s=apply(s,'life.course.movePractice',{fromId:'a1',toId:'listening'});
 assert.equal(activityStats(s,'german').minutes,20);assert.equal(activityStats(s,'german').missing,1);assert.equal(activityStats(s,'german').estimated,45);assert.equal(activityStats(s,'german','listening').minutes,20);assert.equal(activityStats(s,'german','a1').minutes,0);assert.equal(activityStats(s,'german','other').minutes,0);assert.equal(allActivityMinutes(s,'2026-11-02','2026-11-02'),20);
 assert.equal(s.life.courses[0].initial,4);assert.throws(()=>save(s,{id:'dup',name:'重复',mode:'practice',category:'listening',projectId:'de',moduleIds:['listen']}),/只能映射一次/);
 assert.throws(()=>save(s,{id:'fake',name:'虚构',mode:'practice',category:'listening',total:64}),/只记录用时/);
});
test('quantity-bearing entries stay with course, archived practice stops mapping, removed modules release mapping',()=>{
 let s=save(save(base(),{id:'a1',name:'A1',category:'listening',total:64}),{id:'pr',name:'听力',category:'listening',mode:'practice',projectId:'de',moduleIds:['listen']});
 s=apply(s,'life.save',{table:'entries',record:{id:'e',kind:'german',refId:'a1',date:'2026-11-02',minutes:20,units:1}});
 s=apply(s,'life.course.movePractice',{fromId:'a1',toId:'pr'});assert.equal(activityStats(s,'german','a1').units,1);assert.throws(()=>apply(s,'life.course.progress',{id:'a1',current:0}),/不能小于/);
 s=apply(s,'project.save',{id:'de',project:s.projects[0],modules:[]});assert.deepEqual(s.life.courses[1].moduleIds,[]);
});
function schedule(){let s=task(emptyState(),'ho',{start:'08:30',minutes:480});s=task(s,'out',{start:'16:45',minutes:240});for(const [id,minutes]of [['shop',60],['vocab',45],['agent',120]])s=task(s,id,{minutes,parentId:'ho'});return task(s,'plan',{minutes:15});}
test('16 hours effort separates into 12 fixed hours plus 15 flexible minutes without rewriting actual',()=>{
 const s=schedule();assert.deepEqual(calendarOccupancy(s.tasks),{fixed:720,flexible:15,total:735,effort:960,contained:3});assert.equal(s.tasks[2].actual,null);assert.equal(validateState(JSON.parse(JSON.stringify(s))).tasks.length,6);
});
test('moving container moves dated children and timed offsets; resize/child move invalidates atomically',()=>{
 let s=task(schedule(),'timed',{parentId:'ho',start:'10:00',minutes:30,actual:25});
 s=apply(s,'task.schedule',{id:'ho',date:'2026-11-03',start:'09:30'});assert.equal(s.tasks.find(t=>t.id==='timed').start,'11:00');assert.equal(s.tasks.find(t=>t.id==='agent').date,'2026-11-03');assert.equal(s.tasks.find(t=>t.id==='timed').actual,25);
 assert.throws(()=>apply(s,'task.schedule',{id:'ho',date:'2026-11-03',start:'09:30',minutes:60}),/关联时段/);
 assert.throws(()=>apply(s,'task.schedule',{id:'timed',date:'2026-11-04',start:'11:00'}),/同一天/);
 assert.throws(()=>task(s,'ho',{...s.tasks[0],parentId:'timed'}),/循环|多层/);
});
test('soft delete preserves relation, stops coverage, restores coverage; repeat templates cannot bind a dated parent',()=>{
 let s=schedule();s=apply(s,'task.delete',{id:'ho'});assert.equal(s.tasks.find(t=>t.id==='agent').parentId,'ho');assert.equal(calendarOccupancy(s.tasks).flexible,240);
 s=apply(s,'task.restore',{id:'ho'});assert.equal(calendarOccupancy(s.tasks).total,735);
 assert.throws(()=>apply(s,'task.save',{id:'rep',task:{title:'rep',date:'2026-11-02',parentId:'ho'},repeat:{frequency:'daily'}}),/单次日程/);
 s=apply(s,'template.save',{id:'template',task:s.tasks.find(t=>t.id==='agent')});assert.equal(s.templates[0].task.parentId,'');
 s=initializeDay(s,now);assert.equal(s.tasks.length,6);
});
test('parallel timed overlap uses interval union and keeps separate effort',()=>{
 let s=task(emptyState(),'container',{start:'09:00',minutes:60});s=task(s,'listen',{parentId:'container',relation:'parallel',start:'09:30',minutes:60});
 assert.equal(calendarOccupancy(s.tasks).fixed,90);assert.equal(calendarOccupancy(s.tasks).effort,120);
 assert.throws(()=>apply(s,'task.schedule',{id:'listen',date:'2026-11-02',start:'10:30'}),/重叠/);
});
