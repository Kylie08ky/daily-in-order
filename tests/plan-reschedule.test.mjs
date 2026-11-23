import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {rawPlans,calendarTasks,remainingMinutes,planningSignature,planningMetrics,taskPlans} from '../lib/task-plans.ts';
import {timelineItems} from '../lib/timeline-items.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';

// Business "today" is 2026-11-23 (UTC settings in emptyState).
const now=new Date('2026-11-23T12:00:00Z'),today='2026-11-23';
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
const split=(plans,minutes=180)=>{let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic split task',minutes}},new Date('2026-11-10T08:00:00Z'));for(const [planId,date,start,m] of plans)s=run(s,'task.plan.save',{id:'t',planId,date,start,minutes:m},new Date('2026-11-10T08:00:00Z'));return s;};
const move=(s,date,at=now)=>run(s,'task.plan.reschedule',{id:'t',expected:planningSignature(s.tasks[0]),date},at);
const open=s=>calendarTasks(s).map(t=>[t.date,t.start,t.minutes]);

test('single unworked segment: only its date changes; id, start and length stay; retry is a no-op',()=>{
 const s=split([['a','2026-11-25','09:00',60]],60),before=structuredClone(s);
 const next=move(s,'2026-11-27');
 assert.deepEqual(rawPlans(next.tasks[0]),[{id:'a',date:'2026-11-27',start:'09:00',minutes:60}]);
 assert.equal(next.tasks[0].minutes,60);assert.equal(next.tasks[0].remainingEstimate,undefined);assert.deepEqual(s,before);
 assert.deepEqual(move(next,'2026-11-27'),next);assert.deepEqual(decodeState(encodeState(next)),next);
});

test('several unworked segments merge into one on the chosen day; old zero-effort segments disappear entirely',()=>{
 const s=split([['a','2026-11-24','09:00',60],['b','2026-11-26','',30],['c','2026-11-28','14:00',45]],180);
 const next=move(s,'2026-11-25');
 assert.deepEqual(rawPlans(next.tasks[0]).map(p=>[p.date,p.start,p.minutes,!!p.closed]),[['2026-11-25','',135,false]]);
 assert.deepEqual(open(next),[['2026-11-25','',135]]);assert.equal(next.tasks[0].plans.length,1);
 assert.equal(next.tasks[0].minutes,180);assert.equal(next.sessions.length,0);assert.equal(next.tasks[0].actual,null);
 for(const d of ['2026-11-24','2026-11-26','2026-11-28'])assert.equal(timelineItems(next,d,next.tasks,'cancelled').length,0,d);
});

test('overdue segments move to today and leave the "needs rescheduling" condition; past dates are refused',()=>{
 const s=split([['a','2026-11-18','10:00',60],['b','2026-11-20','',30]],90);
 const late=t=>taskPlans(t,s).length>0&&taskPlans(t,s).every(p=>p.date<today);assert.ok(late(s.tasks[0]));
 assert.throws(()=>move(s,'2026-11-22'),/今天或以后/);
 const single=split([['a','2026-11-18','10:00',60]],60),moved=move(single,today);
 assert.deepEqual(rawPlans(moved.tasks[0]),[{id:'a',date:today,start:'10:00',minutes:60}]);
 const merged=move(s,today);assert.deepEqual(open(merged),[[today,'',90]]);assert.ok(!(taskPlans(merged.tasks[0],merged).every(p=>p.date<today)));
});

test('partly worked task: worked part stays on its day, only the remainder moves, no double counting',()=>{
 let s=split([['a','2026-11-20','17:30',120]],120);
 s=run(s,'task.record',{id:'t',date:'2026-11-20',startedAt:'2026-11-20T17:30:00Z',endedAt:'2026-11-20T17:55:00Z'},new Date('2026-11-20T20:00:00Z'));
 const sessions=structuredClone(s.sessions),next=move(s,'2026-11-24');
 assert.deepEqual(rawPlans(next.tasks[0]).map(p=>[p.date,p.minutes,p.endReason||'']),[['2026-11-20',120,'cancelled'],['2026-11-24',95,'']]);
 assert.deepEqual(open(next),[['2026-11-24','17:30',95]]);assert.equal(remainingMinutes(next.tasks[0]),95);
 assert.deepEqual(next.sessions,sessions);assert.equal(next.tasks[0].actual,25);
 assert.equal(minutesInRange(investmentByTask(next).get('t'),'2026-11-20'),25);assert.equal(minutesInRange(investmentByTask(next).get('t'),'2026-11-24'),0);
 assert.equal(timelineItems(next,'2026-11-20',next.tasks)[1]?.status??timelineItems(next,'2026-11-20',next.tasks)[0].status,'partial');
 const m=planningMetrics(next,next.tasks[0]);assert.deepEqual([m.actual,m.remaining,m.scheduled,m.unallocated],[25,95,95,0]);
});

test('merge with one worked and two unworked segments never exceeds what the task still needs',()=>{
 let s=split([['a','2026-11-20','09:00',60],['b','2026-11-26','',60],['c','2026-11-27','',60]],180);
 s=run(s,'task.record',{id:'t',date:'2026-11-20',minutes:40},new Date('2026-11-20T20:00:00Z'));
 const next=move(s,'2026-11-25');
 assert.deepEqual(rawPlans(next.tasks[0]).map(p=>[p.date,p.minutes,!!p.closed]),[['2026-11-20',60,true],['2026-11-25',140,false]]);
 assert.equal(remainingMinutes(next.tasks[0]),140);assert.equal(next.tasks[0].plans.length,2);
});

test('stale sync version, completed tasks, deadlines and empty plans are refused without writing',()=>{
 const s=split([['a','2026-11-24','',60],['b','2026-11-25','',60]],120),before=structuredClone(s);
 assert.throws(()=>run(s,'task.plan.reschedule',{id:'t',expected:'stale',date:'2026-11-26'}),/记录已更新/);
 const done=run(s,'task.progress',{id:'t',date:today,progress:100});assert.throws(()=>move(done,'2026-11-26'),/未完成/);
 const due=structuredClone(s);due.tasks[0].deadline='2026-11-25';assert.throws(()=>move(due,'2026-11-26'),/截止/);
 assert.throws(()=>move(run(emptyState(),'task.save',{id:'t',task:{title:'No plan',minutes:30}}),'2026-11-26'),/没有可改期/);
 assert.deepEqual(s,before);
});

test('the editor and the "needs rescheduling" list both reschedule through the same versioned command',async()=>{
 const fs=await import('node:fs'),ui=fs.readFileSync('app/plan-reschedule.tsx','utf8'),wb=fs.readFileSync('app/workbench.tsx','utf8');
 assert.match(ui,/type:'task\.plan\.reschedule',payload:\{id:task\.id,expected:planningSignature\(task\),date\}/);
 assert.match(wb,/<PlanReschedule key=\{planningSignature\(live\)\} task=\{live\}/);
 assert.match(wb,/\{taskFilter==='late'&&<QuickReschedule task=\{t\}/);
 for(const label of ["ui('今天')","ui('明天')","ui('选日期')","ui('安排日期')","ui('合并到一天')"])assert.ok(ui.includes(label),label);
});
