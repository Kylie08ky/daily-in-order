import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {taskPlans} from '../lib/task-plans.ts';
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
 assert.deepEqual({...next.tasks[0],plans:undefined},{...s.tasks[0],plans:undefined});
 assert.deepEqual(next.sessions,s.sessions);assert.deepEqual(next.life,s.life);
 assert.deepEqual(taskPlans(next.tasks[0]),[{id:'legacy',date:'2026-11-11',start:'09:00',minutes:120}]);
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

