import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,validateState,projectMetrics} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';import {applyOperation} from '../lib/operation.ts';
import {planningMetrics,planningSignature,calendarTasks,remainingMinutes} from '../lib/task-plans.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-12T12:00:00Z'),run=(s,type,payload,instant=now)=>applyCommand(s,{type,payload},instant,()=> 'synthetic-'+s.sessions.length);
function base(actual=62){let s=emptyState();s=run(s,'project.save',{id:'p',project:{name:'Synthetic course'},modules:[]});s=run(s,'task.save',{id:'t',task:{title:'Synthetic lesson',projectId:'p',date:'2026-11-11',minutes:120}});s=run(s,'task.record',{id:'t',date:'2026-11-11',minutes:actual,note:'Keep this note'});return s;}
const plan=(id,minutes,date='2026-11-13')=>({id,date,start:'',minutes});
const estimate=(s,remaining,plans)=>run(s,'task.plan.reestimate',{id:'t',expected:planningSignature(s.tasks[0]),remaining,plans});
function unchanged(before,after){assert.deepEqual(after.sessions,before.sessions);assert.deepEqual(after.life,before.life);const a={...before.tasks[0]},b={...after.tasks[0]};delete a.plans;delete b.plans;delete a.remainingEstimate;delete b.remainingEstimate;assert.deepEqual(a,b);assert.deepEqual(investmentByTask(after),investmentByTask(before));}
test('re-estimate replaces remainder, schedules across days, preserves original history and codec',()=>{
 const old=base();let s=estimate(old,150,[plan('next',60)]);unchanged(old,s);let m=planningMetrics(s,s.tasks[0],'2026-11-12');assert.deepEqual([m.initial,m.actual,m.remaining,m.total,m.scheduled,m.unallocated],[120,62,150,212,60,90]);
 s=estimate(s,150,[plan('next',60),plan('later',90,'2026-11-20')]);m=planningMetrics(s,s.tasks[0],'2026-11-12');assert.equal(m.unallocated,0);assert.equal(calendarTasks(s).length,2);assert.ok(calendarTasks(s).every(x=>x.start===''));assert.equal(projectMetrics(s,'p').total,212);assert.equal(s.tasks.length,1);assert.deepEqual(decodeState(encodeState(s)),s);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-11'),62);
});
test('new actual time reduces both remaining estimate and its slot once, corrections and reload remain consistent',()=>{
 let s=estimate(base(),150,[plan('next',150)]);s=run(s,'task.record',{id:'t',date:'2026-11-13',minutes:30},new Date('2026-11-13T18:00Z'));let m=planningMetrics(s,s.tasks[0],'2026-11-13');assert.deepEqual([m.actual,m.remaining,m.total,m.scheduled,m.unallocated],[92,120,212,120,0]);assert.equal(s.sessions.at(-1).planId,'next');assert.equal(calendarTasks(s)[0].minutes,120);
 s=run(s,'session.delete',{id:s.sessions.at(-1).id});assert.equal(remainingMinutes(s.tasks[0]),150);assert.equal(calendarTasks(s)[0].minutes,150);s=run(s,'session.restore',{id:s.sessions.at(-1).id});assert.equal(remainingMinutes(s.tasks[0]),120);
 const before=structuredClone(s);s=estimate(s,120,[plan('replacement',120,'2026-11-20')]);unchanged(before,s);assert.equal(calendarTasks(s).length,1);assert.equal(calendarTasks(s)[0].date,'2026-11-20');assert.ok(s.tasks[0].plans.find(p=>p.id==='next').closed);assert.equal(s.sessions.at(-1).planId,'next');
});
test('over-allocation and stale drafts fail atomically, hours beyond original estimate do not complete task',()=>{
 const s=base(180),before=structuredClone(s);assert.throws(()=>estimate(s,60,[plan('next',90)]),/30m/);assert.deepEqual(s,before);const changed=estimate(s,60,[plan('next',60)]);assert.ok(changed.tasks[0].progress<100);assert.equal(planningMetrics(changed,changed.tasks[0]).total,240);
 assert.throws(()=>run(changed,'task.plan.reestimate',{id:'t',expected:planningSignature(s.tasks[0]),remaining:60,plans:[]}),/记录已更新/);
});
test('synthetic 63-minute history + one-hour flexible plan retains IDs and needs no extra task',()=>{
 const old=base(63),s=estimate(old,60,[plan('next',60)]);unchanged(old,s);const m=planningMetrics(s,s.tasks[0],'2026-11-12');assert.deepEqual([m.actual,m.remaining,m.total,m.scheduled,m.unallocated],[63,60,123,60,0]);assert.equal(calendarTasks(s).length,1);assert.equal(s.tasks[0].completedAt,null);
});
test('unknown legacy actual time is flagged rather than dated or completed by migration',()=>{
 let s=base();s.sessions=[];const before=structuredClone(s);s=validateState({...s,schemaVersion:15});assert.deepEqual(s.tasks,before.tasks);assert.deepEqual(s.sessions,[]);assert.equal(planningMetrics(s,s.tasks[0],'2026-11-12').review.length,1);assert.equal(s.tasks[0].completedAt,null);
});
