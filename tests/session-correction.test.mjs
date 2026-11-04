import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,projectMetrics,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {investmentByTask,minutesInRange,sessionBlocks} from '../lib/task-investment.ts';
import {timelineItems} from '../lib/timeline-items.ts';
const now=new Date('2026-11-04T18:00:00Z'),apply=(s,type,payload)=>applyCommand(s,{type,payload},now);
const base=()=>{let s=emptyState();s=apply(s,'project.save',{id:'p',project:{name:'作品集'},modules:[]});s=apply(s,'task.save',{id:'t',task:{title:'作品集内容',projectId:'p',date:'2026-11-03',start:'08:00',minutes:120}});s.tasks[0].actual=20;for(const minutes of [30,45])s=apply(s,'task.record',{id:'t',date:'2026-11-04',minutes});return s;};
const update=(s,id,minutes,extra={})=>apply(s,'session.update',{id,date:'2026-11-04',spans:[],untimedSeconds:minutes*60,note:'更正',...extra});
test('correct, remove and restore one session recalculates totals, progress and project stats; legacy time retained',()=>{
 let s=base(),id=s.sessions[0].id;s=update(s,id,15);assert.equal(s.tasks[0].actual,80);assert.equal(s.tasks[0].progress,67);assert.equal(projectMetrics(s,'p').spent,80);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-04'),60);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-03'),20);
 s=apply(s,'session.delete',{id});assert.equal(s.tasks[0].actual,65);assert.equal(s.tasks[0].progress,54);assert.equal(s.sessions.length,2);assert.ok(s.sessions[0].deletedAt);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-04'),45);
 s=apply(s,'session.delete',{id});assert.equal(s.tasks[0].actual,65);s=apply(s,'session.restore',{id});s=apply(s,'session.restore',{id});assert.equal(s.tasks[0].actual,80);assert.equal(s.sessions[0].deletedAt,null);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
 s=apply(s,'session.delete',{id});s=apply(s,'task.record',{id:'t',date:'2026-11-04',minutes:30});assert.equal(s.tasks[0].actual,95);
});
test('manual percentage and explicit completion survive session corrections',()=>{
 let s=base(),id=s.sessions[0].id;s=apply(s,'task.progress',{id:'t',progress:70});s=update(s,id,5);assert.equal(s.tasks[0].progress,70);s=apply(s,'session.delete',{id});assert.equal(s.tasks[0].progress,70);s=apply(s,'task.progress',{id:'t',progress:100});s=apply(s,'session.restore',{id});assert.equal(s.tasks[0].progress,100);assert.ok(s.tasks[0].completedAt);
});
test('same calendar renders real segments instead of duplicate original plan; moving one interval keeps pauses and duration',()=>{
 let s=base(),id=s.sessions[0].id;const spans=[{startedAt:'2026-11-04T08:00:00.000Z',endedAt:'2026-11-04T08:15:00.000Z'},{startedAt:'2026-11-04T10:00:00.000Z',endedAt:'2026-11-04T10:15:00.000Z'}];s=update(s,id,0,{spans});
 assert.equal(timelineItems(s,'2026-11-03',s.tasks).length,0);let items=timelineItems(s,'2026-11-04',s.tasks);assert.equal(items.length,2);assert.equal(items[0].begin,540);assert.equal(items[1].begin,660);
 s=apply(s,'session.move',{id,spanIndex:1,startedAt:'2026-11-03T22:45:00.000Z'});assert.equal(s.tasks[0].actual,95);assert.equal(s.tasks[0].start,'08:00');assert.equal(s.sessions[0].seconds,1800);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-03'),35);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-04'),60);
 assert.deepEqual(s.sessions[0].spans[1],spans[0]);assert.equal(timelineItems(s,'2026-11-03',s.tasks).length,1);
 s=apply(s,'session.delete',{id});assert.equal(sessionBlocks(s.sessions[0],s.settings.timezone).length,0);assert.equal(timelineItems(s,'2026-11-03',s.tasks).length,0); // another duration-only record still has no clock position
});
test('unknown times remain unknown; midnight corrections distribute statistics to real dates',()=>{
 let s=base(),id=s.sessions[0].id;assert.equal(timelineItems(s,'2026-11-03',s.tasks).length,0);s=update(s,id,0,{spans:[{startedAt:'2026-11-03T22:45:00.000Z',endedAt:'2026-11-03T23:15:00.000Z'}]});assert.equal(timelineItems(s,'2026-11-03',s.tasks).length,1);assert.equal(timelineItems(s,'2026-11-04',s.tasks).length,1);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-03'),35);
});
test('invalid corrections fail atomically, deleted records must first be restored',()=>{
 const s=base(),id=s.sessions[0].id;
 for(const spans of [[{startedAt:'2026-11-04T19:00:00.000Z',endedAt:'2026-11-04T20:00:00.000Z'}],[{startedAt:'2026-11-04T10:00:00.000Z',endedAt:'2026-11-04T09:00:00.000Z'}],[{startedAt:'2026-11-04T08:00:00.000Z',endedAt:'2026-11-04T09:00:00.000Z'},{startedAt:'2026-11-04T08:30:00.000Z',endedAt:'2026-11-04T10:00:00.000Z'}]])assert.throws(()=>update(s,id,0,{spans}));
 assert.throws(()=>update(s,id,1500));assert.throws(()=>apply(s,'session.move',{id,spanIndex:0,startedAt:now.toISOString()}));assert.equal(s.tasks[0].actual,95);assert.equal(s.sessions[0].seconds,1800);
 const deleted=apply(s,'session.delete',{id});assert.throws(()=>update(deleted,id,5));
});
test('focus wealth uses original rate and fractional seconds round across all live sessions',()=>{
 let s=base();s.settings.growthRate=120;s=applyCommand(s,{type:'focus.start',payload:{taskId:'t',mode:'countup'}},new Date('2026-11-04T10:00:00Z'));s=applyCommand(s,{type:'focus.finish'},new Date('2026-11-04T10:00:24Z'));let id=s.sessions.at(-1).id;s.settings.growthRate=600;s=update(s,id,10);assert.equal(s.sessions.at(-1).growth,20);assert.equal(s.tasks[0].actual,105);s=apply(s,'session.delete',{id});assert.equal(s.tasks[0].actual,95);s=apply(s,'session.restore',{id});assert.equal(s.tasks[0].actual,105);
});

test('restoring a deletion preserves a historical manually reduced actual total',()=>{let s=base();s.tasks[0].actual=10;const id=s.sessions[0].id;s=apply(s,'session.delete',{id});assert.equal(s.tasks[0].actual,0);s=apply(s,'session.restore',{id});assert.equal(s.tasks[0].actual,10);});
