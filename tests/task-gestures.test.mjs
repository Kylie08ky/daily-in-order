import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {taskPlans,rawPlans,calendarTasks,dayPlanEntries,remainingMinutes,planStatusLabel,planningSignature} from '../lib/task-plans.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {timelineItems} from '../lib/timeline-items.ts';
const now=new Date('2026-11-10T12:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
const base=(extra={})=>run(emptyState(),'task.save',{id:'task',task:{title:'Synthetic practice',date:'2026-11-10',start:'09:00',minutes:120,...extra}});
const defer=s=>run(s,'task.defer',{id:'task',from:'2026-11-10'});

test('defer preserves actual dates, IDs, notes, progress, sessions and recurrence identities',()=>{
 let s=base({actual:30,progress:25,progressSource:'manual',note:'Keep me'});
 s=run(s,'task.record',{id:'task',date:'2026-11-10',minutes:15});
 s.tasks[0].sourceTemplateId='source';s.tasks[0].templateDate='2026-11-10';
 const original=structuredClone(s),next=defer(s);
 assert.deepEqual(s,original);
 const {plans:_a,remainingEstimate:_b,...kept}=next.tasks[0],{plans:_c,...before}=s.tasks[0];assert.deepEqual(kept,before);
 assert.deepEqual(next.sessions,s.sessions);assert.deepEqual(next.life,s.life);
 // The worked slot stays on 11-10; only what the task still needs (120 − 45 = 75) moves, capped by task-level time.
 assert.deepEqual(next.tasks[0].plans.find(p=>p.id==='legacy'),{id:'legacy',date:'2026-11-10',start:'09:00',minutes:120,closed:true,endReason:'cancelled'});
 assert.deepEqual(taskPlans(next.tasks[0]),[{id:'defer:2026-11-11:0',date:'2026-11-11',start:'09:00',minutes:75}]);
 assert.deepEqual(next.tasks[0].remainingEstimate,{initialMinutes:120,minutes:75,actualAtSet:45});
 assert.equal(minutesInRange(investmentByTask(next).get('task'),'2026-11-10'),45);
 assert.equal(minutesInRange(investmentByTask(next).get('task'),'2026-11-11'),0);
 assert.equal(next.tasks.length,s.tasks.length);
});
test('defer moves all selected-day slots atomically but leaves other days alone',()=>{
 let s=base({minutes:180});s.tasks[0].plans=[{id:'a',date:'2026-11-10',start:'09:00',minutes:30},{id:'b',date:'2026-11-10',start:'',minutes:30},{id:'c',date:'2026-11-15',start:'10:00',minutes:120}];
 const next=defer(s);assert.deepEqual(taskPlans(next.tasks[0]).map(p=>[p.id,p.date]),[['b','2026-11-11'],['a','2026-11-11'],['c','2026-11-15']]);assert.equal(next.tasks[0].actual,null);
});
test('defer rejects unavailable, completed, active-focus and conflicting schedules without partial writes',()=>{
 assert.throws(()=>defer(base({date:'',start:''})),/没有可顺延/);
 assert.throws(()=>defer(base({progress:100})),/已完成/);
 assert.throws(()=>defer(base({deadline:'2026-11-10'})),/截止/);
 let s=run(base(),'focus.start',{taskId:'task',mode:'countup'});assert.throws(()=>defer(s),/结束当前专注/);
 s=base();s.tasks[0].plans=[{id:'a',date:'2026-11-10',start:'09:00',minutes:60},{id:'b',date:'2026-11-11',start:'09:30',minutes:60}];const original=structuredClone(s);assert.throws(()=>defer(s),/重叠/);assert.deepEqual(s,original);
});
test('defer supports undated clock time and zero estimates without inventing actual time',()=>{
 const s=defer(base({start:'',minutes:0}));assert.deepEqual(taskPlans(s.tasks[0]),[{id:'legacy',date:'2026-11-11',start:'',minutes:0}]);assert.equal(s.tasks[0].actual,null);assert.equal(s.sessions.length,0);
});

test('a partially recorded split slot remains visible tomorrow without moving its historical session',()=>{
 let s=base();s.tasks[0].plans=[{id:'slot',date:'2026-11-10',start:'09:00',minutes:120}];
 s=run(s,'task.record',{id:'task',date:'2026-11-10',minutes:30});
 const old=structuredClone(s.sessions),next=defer(s);
 assert.deepEqual(next.sessions,old);assert.equal(next.sessions[0].planId,'slot');
 assert.equal(next.tasks.length,1);assert.equal(next.tasks[0].actual,30);
 assert.equal(timelineItems(next,'2026-11-11',next.tasks).length,1);
 assert.equal(minutesInRange(investmentByTask(next).get('task'),'2026-11-10'),30);
});


test('planned 2h, worked 25m, unfinished: original stays on its day and only 2h − 25m moves; repeat keeps subtracting',()=>{
 let s=run(emptyState(),'task.save',{id:'task',task:{title:'Synthetic 2h study',date:'2026-11-10',start:'17:30',minutes:120}});
 s=applyCommand(s,{type:'task.record',payload:{id:'task',date:'2026-11-10',startedAt:'2026-11-10T16:30:00Z',endedAt:'2026-11-10T16:55:00Z'}},new Date('2026-11-10T20:00:00Z'));
 const sessions=structuredClone(s.sessions);let next=defer(s);
 assert.deepEqual(next.sessions,sessions);assert.equal(next.tasks.length,1);assert.equal(next.tasks[0].actual,25);
 assert.deepEqual(calendarTasks(next).map(t=>[t.date,t.start,t.minutes]),[['2026-11-11','17:30',95]]);assert.equal(remainingMinutes(next.tasks[0]),95);
 const day1=timelineItems(next,'2026-11-10',next.tasks);
 assert.deepEqual(day1.map(x=>[x.plannedStart||'actual',x.length,x.status||'']),[['actual',25,''],['17:30',120,'partial']]);
 assert.equal(planStatusLabel('partial'),'已做部分，此段已结束');assert.equal(timelineItems(next,'2026-11-10',next.tasks,'cancelled').length,0);
 assert.equal(dayPlanEntries(next,'2026-11-10')[0].minutes,120);assert.equal(minutesInRange(investmentByTask(next).get('task'),'2026-11-10'),25);
 next=applyCommand(next,{type:'task.record',payload:{id:'task',date:'2026-11-11',minutes:30}},new Date('2026-11-11T20:00:00Z'));
 next=applyCommand(next,{type:'task.defer',payload:{id:'task',from:'2026-11-11'}},new Date('2026-11-11T20:00:00Z'));
 assert.deepEqual(calendarTasks(next).map(t=>[t.date,t.minutes]),[['2026-11-12',65]]);assert.deepEqual(rawPlans(next.tasks[0]).filter(p=>p.closed).map(p=>[p.date,p.minutes]),[['2026-11-10',120],['2026-11-11',95]]);
});

test('editing a partial historical slot never stores the display-only partial status',()=>{
 let s=run(base(),'task.record',{id:'task',date:'2026-11-10',minutes:25});s=defer(s);
 const t=s.tasks[0],cmd={id:'task',planId:'legacy',expected:planningSignature(t),date:'2026-11-10',start:'09:15',minutes:120};
 s=run(s,'task.plan.history',cmd);const p=rawPlans(s.tasks[0]).find(x=>x.id==='legacy');
 assert.equal(p.endReason,'cancelled');assert.equal(p.start,'09:15');assert.equal(timelineItems(s,'2026-11-10',s.tasks)[0].status,'partial');
});

test('completing with a from–to range records a real timeline block once and marks the task done',()=>{
 let s=run(emptyState(),'task.save',{id:'task',task:{title:'Synthetic flexible errand',date:'2026-11-10',minutes:60}});
 const op={id:'task',date:'2026-11-10',startedAt:'2026-11-10T13:00:00Z',endedAt:'2026-11-10T13:40:00Z',progress:100};
 s=applyCommand(s,{type:'task.record',payload:op},new Date('2026-11-10T20:00:00Z'));
 assert.equal(s.tasks[0].progress,100);assert.equal(s.tasks[0].completedDate,'2026-11-10');assert.equal(s.tasks[0].actual,40);assert.equal(s.sessions.length,1);
 const block=timelineItems(s,'2026-11-10',s.tasks,'actual');assert.equal(block.length,1);assert.equal(block[0].length,40);
});
