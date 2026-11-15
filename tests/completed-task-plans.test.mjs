import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {completionDate,datesSignature,tasksForDay} from '../lib/task-completion.ts';
import {planningMetrics,calendarTasks} from '../lib/task-plans.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-15T09:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function base(){return run(emptyState(),'task.save',{id:'demo',task:{title:'Synthetic planning',date:'2026-11-14',minutes:120,note:'Preserve note'}});}
const mins=(s,day)=>minutesInRange(investmentByTask(s).get('demo'),day);
const plan=(s,id,date,minutes)=>run(s,'task.plan.save',{id:'demo',planId:id,date,start:'',minutes});

test('explicit completion closes all open slots, including partial and future, preserving actual segments',()=>{
 let s=plan(base(),'legacy','2026-11-14',60);s=plan(s,'later','2026-11-19',60);
 s=run(s,'task.record',{id:'demo',date:'2026-11-14',minutes:40});const sessions=structuredClone(s.sessions),slots=structuredClone(s.tasks[0].plans);
 s=run(s,'task.progress',{id:'demo',date:'2026-11-14',progress:100});
 assert.deepEqual(s.sessions,sessions);assert.deepEqual(s.tasks[0].plans,slots.map(p=>({...p,closed:true})));
 const m=planningMetrics(s,s.tasks[0]);assert.deepEqual([m.actual,m.remaining,m.scheduled,m.unallocated,m.review.length],[40,0,0,0,0]);
 assert.equal(calendarTasks(s).length,0);assert.equal(completionDate(s.tasks[0],'Europe/Berlin'),'2026-11-14');assert.equal(tasksForDay(s,'2026-11-19').length,0);
 assert.equal(s.tasks[0].note,'Preserve note');assert.equal(s.tasks.length,1);
});

test('cross-day completion counts 40 then 20; correcting only completion does not move either session',()=>{
 let s=plan(base(),'legacy','2026-11-14',60);s=plan(s,'second','2026-11-15',60);
 s=run(s,'task.record',{id:'demo',date:'2026-11-14',minutes:40});s=run(s,'task.record',{id:'demo',date:'2026-11-15',minutes:20,progress:100});
 const history=structuredClone(s.sessions);assert.deepEqual([mins(s,'2026-11-14'),mins(s,'2026-11-15'),s.tasks[0].actual],[40,20,60]);
 assert.equal(completionDate(s.tasks[0],'Europe/Berlin'),'2026-11-15');
 s=run(s,'task.dates.correct',{id:'demo',expected:datesSignature(s.tasks[0]),completedDate:'2026-11-14'});
 assert.deepEqual(s.sessions,history);assert.deepEqual([mins(s,'2026-11-14'),mins(s,'2026-11-15')],[40,20]);
 assert.deepEqual(decodeState(encodeState(s)),s);
});

test('confirmed legacy actual date fixes duplicate day without creating any activity or touching unrelated records',()=>{
 let s=base();Object.assign(s.tasks[0],{date:'2026-11-15',actual:30,progress:100,completedAt:'2026-11-14T21:41:12.442Z',remainingEstimate:{initialMinutes:30,minutes:30,actualAtSet:0},plans:[{id:'legacy',date:'2026-11-14',start:'',minutes:30}]});
 s=run(s,'task.save',{id:'other',task:{title:'Unrelated',date:'2026-11-20',minutes:90}});
 const before=structuredClone(s),original=s.tasks[0];
 s=run(s,'task.dates.correct',{id:'demo',expected:datesSignature(original),completedDate:'2026-11-14',actualDate:'2026-11-14'});
 assert.deepEqual([mins(s,'2026-11-14'),mins(s,'2026-11-15')],[30,0]);assert.equal(tasksForDay(s,'2026-11-15').length,0);assert.equal(tasksForDay(s,'2026-11-14')[0].id,'demo');
 for(const k of Object.keys(before))if(k!=='tasks')assert.deepEqual(s[k],before[k],k);
 assert.deepEqual(s.tasks[1],before.tasks[1]);for(const k of ['id','date','actual','progress','note','completedAt'])assert.deepEqual(s.tasks[0][k],original[k]);
 const m=planningMetrics(s,s.tasks[0]);assert.deepEqual([m.actual,m.remaining,m.scheduled,m.unallocated],[30,0,0,0]);
 const again=run(s,'task.dates.correct',{id:'demo',expected:datesSignature(s.tasks[0]),completedDate:'2026-11-14',actualDate:'2026-11-14'});assert.deepEqual(again,s);
 assert.throws(()=>run(s,'task.dates.correct',{id:'demo',expected:datesSignature(original),actualDate:'2026-11-13'}),/已更新/);
});

test('one completed segment and overtime do not complete the whole task or cancel later slots',()=>{
 let s=plan(base(),'legacy','2026-11-14',60);s=plan(s,'later','2026-11-17',60);
 s=run(s,'task.record',{id:'demo',date:'2026-11-14',minutes:150,progressSource:'time'});
 assert.ok(s.tasks[0].progress<100);assert.equal(s.tasks[0].plans.find(p=>p.id==='later').closed,undefined);assert.ok(calendarTasks(s).some(t=>t.date==='2026-11-17'));
});

test('completion-only with missing actual does not invent minutes and is visible solely on completion date',()=>{
 let s=base();s=run(s,'task.progress',{id:'demo',date:'2026-11-15',progress:100});
 assert.equal(s.tasks[0].actual,null);assert.equal(s.sessions.length,0);assert.equal(tasksForDay(s,'2026-11-14').length,0);assert.equal(tasksForDay(s,'2026-11-15').length,1);
 s=run(s,'task.progress',{id:'demo',date:'2026-11-15',progress:100});assert.equal(s.sessions.length,0);
});

test('Berlin completion date does not use UTC date or configurable day rollover',()=>{
 let s=base();s.settings.dayStart='04:00';
 s=applyCommand(s,{type:'task.progress',payload:{id:'demo',progress:100}},new Date('2026-11-14T23:30:00Z'));
 assert.equal(completionDate(s.tasks[0],'Europe/Berlin'),'2026-11-15');
});

test('schema upgrade preserves legacy records without speculative migration, and closed slots stay closed on reload',()=>{
 let s=base();s.schemaVersion=16;s.tasks[0].actual=30;const old=structuredClone(s.tasks[0]);s=validateState(s);
 assert.deepEqual(s.tasks[0],old);assert.equal(s.tasks[0].actualDate,undefined);
 s=run(s,'task.progress',{id:'demo',progress:100,date:'2026-11-14',actual:30});
 const restored=decodeState(encodeState(s));assert.equal(calendarTasks(restored).length,0);assert.equal(mins(restored,'2026-11-14'),30);
});
