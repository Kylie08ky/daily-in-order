import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {datesSignature,completionDate} from '../lib/task-completion.ts';
import {investmentByTask} from '../lib/task-investment.ts';
import {calendarTasks,rawPlans} from '../lib/task-plans.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';

// Business "today" is 2026-11-23.
const now=new Date('2026-11-23T12:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
const doneOn=(s,date,extra={})=>run(s,'task.finish.on',{id:'t',expected:datesSignature(s.tasks[0]),date,...extra});
const byDay=s=>Object.fromEntries(investmentByTask(s).get('t')||[]);

test('"done on X" for an unfinished task sets completion and untimed-total dates together and closes open plans',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic errand',date:'2026-11-20',minutes:120}},new Date('2026-11-19T08:00:00Z'));
 s=doneOn(s,'2026-11-20',{actual:90});const t=s.tasks[0];
 assert.deepEqual([t.progress,t.completedDate,t.actualDate,t.actual],[100,'2026-11-20','2026-11-20',90]);
 assert.deepEqual(byDay(s),{'2026-11-20':90});assert.equal(calendarTasks(s).length,0);assert.equal(s.sessions.length,0);
 assert.deepEqual(doneOn(s,'2026-11-20'),s);assert.deepEqual(decodeState(encodeState(s)),s);
});

test('moving the completion date of a finished task moves an untimed total with it, without adding time',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic report',date:'2026-11-23',minutes:60}});
 s=run(s,'task.progress',{id:'t',date:'2026-11-23',progress:100,actual:60});
 s=doneOn(s,'2026-11-21');
 assert.equal(completionDate(s.tasks[0],s.settings.timezone),'2026-11-21');assert.equal(s.tasks[0].actualDate,'2026-11-21');
 assert.equal(s.tasks[0].actual,60);assert.deepEqual(byDay(s),{'2026-11-21':60});
});

test('focus and timed records stay on the days they happened; only the completion date moves',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic study',minutes:60}},new Date('2026-11-18T08:00:00Z'));
 s=run(s,'task.plan.save',{id:'t',planId:'p',date:'2026-11-19',start:'09:00',minutes:60},new Date('2026-11-18T08:00:00Z'));
 s=run(s,'task.record',{id:'t',date:'2026-11-19',startedAt:'2026-11-19T08:00:00Z',endedAt:'2026-11-19T08:40:00Z'},new Date('2026-11-19T12:00:00Z'));
 const sessions=structuredClone(s.sessions);s=doneOn(s,'2026-11-21');
 assert.equal(s.tasks[0].completedDate,'2026-11-21');assert.equal(s.tasks[0].actualDate,undefined);
 assert.deepEqual(s.sessions,sessions);assert.deepEqual(byDay(s),{'2026-11-19':40});assert.equal(rawPlans(s.tasks[0])[0].endReason,'completed');
});

test('future dates and stale versions are refused without writing',()=>{
 const s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic',date:'2026-11-23',minutes:30}}),before=structuredClone(s);
 assert.throws(()=>doneOn(s,'2026-11-24'),/未来日期/);
 assert.throws(()=>run(s,'task.finish.on',{id:'t',expected:'stale',date:'2026-11-22'}),/记录已更新/);
 assert.deepEqual(s,before);
});

test('Edit task opens with one "Which day?" control and ticking a past item asks for its completion date',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8'),move=fs.readFileSync('app/task-date-move.tsx','utf8');
 const top=wb.indexOf('{live&&<TaskDateMove'),classification=wb.indexOf('<TaskClassification state={state} task={t}');
 assert.ok(top>0&&top<classification,'"Which day?" sits above the other fields');
 assert.ok(wb.includes('dirty={dirty} onDone={close}/>'));assert.ok(move.includes("{dirty?<p className=\"hint\">{ui('请先保存或放弃下面的修改，再改日期。')}"));
 assert.ok(move.includes("type:'task.finish.on'"));assert.ok(move.includes("ui('这件事是在这天做完的')"));
 assert.ok(wb.includes('||pastPlanDay(t)){setCompletion(t)'));assert.ok(wb.includes('setDoneDay(pastPlanDay(t)||(date>today?today:date))'));
 assert.ok(wb.includes('name="completedDate" type="date" required value={doneDay}'));
});
