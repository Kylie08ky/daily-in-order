import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {focusSeconds,potentialWealth} from '../lib/focus-clock.ts';
import {learningInvestment,learningRange} from '../lib/learning-overview.ts';
const now=new Date('2026-11-04T10:00:00Z');
const apply=(s,type,payload,seconds=0)=>applyCommand(s,{type,payload},new Date(+now+seconds*1000));
const task=(s,id,data={})=>apply(s,'task.save',{id,task:{title:id,...data}});

test('countdown stops at target across reload, pause, resume and late settlement; never completes task',()=>{
 let s=task(emptyState(),'a');s=apply(s,'focus.start',{taskId:'a',mode:'countdown',minutes:2});
 s=apply(s,'focus.pause',undefined,30);s=apply(s,'focus.start',{taskId:'a'},60);
 s=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(focusSeconds(s.focus,+now+140000),110);
 assert.equal(focusSeconds(s.focus,+now+3600000),120);
 assert.equal(potentialWealth(focusSeconds(s.focus,+now+3600000),60),2);
 s=apply(s,'focus.pause',undefined,3600);
 assert.equal(s.focus.seconds,120);
 assert.throws(()=>apply(s,'focus.start',{taskId:'a'},3601),/到点/);
 s=apply(s,'focus.finish',undefined,3602);
 assert.equal(s.tasks[0].actual,2);assert.equal(s.tasks[0].progress,7);assert.equal(s.tasks[0].date,'2026-11-04');
 assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].seconds,120);
 assert.equal(apply(s,'focus.finish',undefined,4000).sessions.length,1);
});
test('count-up passes target; rejected modes and durations do not change original state',()=>{
 const initial=task(emptyState(),'a');const s=apply(initial,'focus.start',{taskId:'a',mode:'countup',minutes:1});
 assert.equal(focusSeconds(s.focus,+now+600000),600);
 for(const payload of [{taskId:'a',mode:'bad'},{taskId:'a',minutes:0},{taskId:'a',minutes:1441}])assert.throws(()=>apply(initial,'focus.start',payload));
 assert.equal(initial.focus,null);
});
test('return overdue repeated occurrence to pool preserves its identity, actual and repeat rule',()=>{
 let s=apply(emptyState(),'task.save',{id:'repeat',task:{title:'repeat',date:'2026-11-01',minutes:30},repeat:{frequency:'daily',days:[],until:'2026-11-05'}});
 const t=s.tasks.find(t=>t.date==='2026-11-01');s=apply(s,'task.progress',{id:t.id,progress:20,actual:10});
 const before=s.tasks.find(x=>x.id===t.id);s=apply(s,'tasks.unschedule',{ids:[t.id]});
 const after=s.tasks.find(x=>x.id===t.id);
 assert.deepEqual(after,{...before,date:'',start:'',parentId:''});
 assert.equal(s.tasks.filter(x=>x.occurrence==='2026-11-01').length,1);assert.equal(s.series[0].active,true);
});
test('return parent with children clears invalid time links but preserves completed history',()=>{
 let s=task(emptyState(),'parent',{date:'2026-11-03',start:'09:00',minutes:120});
 s=task(s,'child',{date:'2026-11-03',start:'09:00',minutes:30,parentId:'parent'});
 s=task(s,'done',{date:'2026-11-03',start:'10:00',minutes:30,parentId:'parent',progress:100,actual:25});
 assert.throws(()=>apply(s,'tasks.unschedule',{ids:['child']}),/父时段/);
 s=apply(s,'tasks.unschedule',{ids:['parent']});
 assert.equal(s.tasks[1].date,'');assert.equal(s.tasks[1].parentId,'');
 assert.equal(s.tasks[2].date,'2026-11-03');assert.equal(s.tasks[2].progress,100);assert.equal(s.tasks[2].actual,25);
});
test('module display choices sync in backups without deleting activities; none is valid',()=>{
 let s=task(emptyState(),'a');s=apply(s,'settings.save',{...s.settings,visibleModules:[]});
 const copy=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(copy.settings.visibleModules,[]);assert.equal(copy.tasks.length,1);
 assert.throws(()=>apply(s,'settings.save',{...s.settings,visibleModules:['private']}));
});
test('learning periods cross month/year boundaries and respect Sunday week start',()=>{
 assert.deepEqual(learningRange('2026-11-01','week','monday'),{from:'2026-10-26',to:'2026-11-01'});
 assert.deepEqual(learningRange('2026-11-01','week','sunday'),{from:'2026-11-01',to:'2026-11-07'});
 assert.deepEqual(learningRange('2024-02-20','month','monday'),{from:'2024-02-01',to:'2024-02-29'});
 assert.deepEqual(learningRange('2026-11-04','year','monday'),{from:'2026-01-01',to:'2026-12-31'});
});
test('learning investment includes unfinished actual and deduplicates linked logs and sessions',()=>{
 let s=apply(emptyState(),'life.save',{table:'courses',record:{id:'course',name:'练习',category:'实践',mode:'practice',total:null}});
 s=task(s,'study',{date:'2026-11-04',actual:15,activity:{kind:'german',refId:'course',category:'other'}});
 s=task(s,'estimated',{date:'2026-11-04',minutes:60,activity:{kind:'german',refId:'course',category:'other'}});
 s=task(s,'old',{date:'2026-10-01',actual:90,activity:{kind:'german',refId:'course',category:'other'}});
 s=apply(s,'focus.start',{taskId:'study',mode:'countup'});s=apply(s,'focus.finish',undefined,300);
 assert.equal(learningInvestment(s,'2026-11-01','2026-11-30').total,20);
 assert.equal(learningInvestment(s,'0000-01-01','9999-12-31').total,110);
 assert.equal(learningInvestment(s,'2026-11-01','2026-11-30').categories[0].label,'实践');
 s=apply(s,'life.save',{table:'entries',record:{id:'linked',kind:'german',refId:'course',date:'2026-11-04',minutes:20,taskId:'study',units:0}});
 assert.equal(learningInvestment(s,'2026-11-01','2026-11-30').total,20);
 s=apply(s,'task.progress',{id:'study',progress:0});
 assert.equal(learningInvestment(s,'2026-11-01','2026-11-30').total,20);
});
