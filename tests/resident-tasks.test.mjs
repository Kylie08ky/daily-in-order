import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,validateState,liveTasks,projectMetrics,initializeDay} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {residentKind,residentStatus,residentOccurrence,residentAvailable} from '../lib/resident-tasks.ts';
import {activityStats} from '../lib/life-metrics.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-10T12:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
function base(){let s=run(emptyState(),'project.save',{id:'p',project:{name:'Demo'},modules:[{id:'m',name:'Practice'}]});return run(s,'life.save',{table:'courses',record:{id:'course',name:'Demo course',category:'practice',projectId:'p',total:64,initial:4}});}
const input={title:'Vibe coding',projectId:'p',moduleId:'m',minutes:60,activity:{kind:'german',refId:'course',category:'practice'}};
test('long-term and stage entries are not executions; daily use records once without completing course quantities',()=>{
 let s=run(base(),'template.save',{id:'entry',task:input,kind:'long-term'});
 const empty=structuredClone(s);s=initializeDay(s,now);assert.equal(s.tasks.length,0);assert.equal(projectMetrics(s,'p').total,0);assert.equal(s.series.length,0);
 s=run(s,'template.use',{id:'entry',newId:'day1',date:'2026-11-10',minutes:60,start:''});
 s=run(s,'task.record',{id:'day1',date:'2026-11-10',minutes:60,progress:100});
 const first=structuredClone(s.tasks[0]),sessions=structuredClone(s.sessions);
 s=run(s,'template.use',{id:'entry',newId:'day2',date:'2026-11-11',minutes:45,start:'14:00'});
 assert.equal(s.templates.length,1);assert.equal(s.tasks.length,2);assert.equal(s.tasks[1].sourceTemplateId,'entry');assert.deepEqual(s.tasks[1].activity,input.activity);assert.equal(s.tasks[1].moduleId,'m');assert.equal(s.tasks[1].actual,null);assert.equal(s.tasks[1].progress,0);
 assert.equal(activityStats(s,'german','course').minutes,60);assert.equal(activityStats(s,'german','course').units,0);assert.equal(s.life.courses[0].initial,4);
 s=run(s,'template.save',{id:'entry',kind:'stage',task:{...s.templates[0].task,minutes:90}});
 s=run(s,'template.status',{id:'entry',status:'archived'});
 assert.deepEqual(s.tasks[0],first);assert.deepEqual(s.sessions,sessions);assert.equal(s.tasks[1].minutes,45);assert.equal(activityStats(s,'german','course').minutes,60);
 assert.throws(()=>run(s,'template.use',{id:'entry',newId:'bad',date:'2026-11-12'}),/暂停|归档/);
 s=run(s,'template.status',{id:'entry',status:'active'});assert.equal(residentKind(s.templates[0]),'stage');assert.ok(residentAvailable(s,s.templates[0]));
 assert.deepEqual(decodeState(encodeState(s)),s);assert.equal(empty.tasks.length,0);
});
test('same-entry same-day duplicates including completed tasks and dated split slots are rejected atomically',()=>{
 let s=run(base(),'template.save',{id:'entry',task:input});s=run(s,'template.use',{id:'entry',newId:'first',date:'2026-11-10'});
 s=run(s,'task.progress',{id:'first',progress:100});const before=JSON.stringify(s);
 assert.equal(residentOccurrence(s,s.templates[0],'2026-11-10').id,'first');assert.throws(()=>run(s,'template.use',{id:'entry',newId:'second',date:'2026-11-10'}),/当天已有/);assert.equal(JSON.stringify(s),before);
 s=run(s,'task.plan.save',{id:'first',planId:'legacy',date:'2026-11-12',minutes:60,start:''});assert.equal(residentOccurrence(s,s.templates[0],'2026-11-12').id,'first');
 s=run(s,'task.delete',{id:'first'});s=run(s,'template.use',{id:'entry',newId:'replacement',date:'2026-11-10'});assert.equal(liveTasks(s).length,1);
});
test('legacy templates keep IDs and infer only named stage courses; reclassification does not rewrite histories',()=>{
 let s=base();s.templates=[{id:'hf',task:{...input,title:'Hugging Face AI Agents Course'}},{id:'neo',task:{...input,title:'Neo4j & Generative AI Certification'}},{id:'avf',task:{...input,title:'AVF K2 复习'}},{id:'de',task:{...input,title:'德语新闻泛听'}}];s.schemaVersion=9;s=validateState(s);
 assert.deepEqual(s.templates.map(residentKind),['stage','stage','stage','long-term']);assert.deepEqual(s.templates.map(t=>t.id),['hf','neo','avf','de']);assert.equal(s.tasks.length,0);
 s=run(s,'template.save',{id:'neo',task:s.templates[1].task,kind:'long-term'});assert.equal(residentKind(s.templates[1]),'long-term');
 s=run(s,'template.status',{id:'neo',status:'paused'});assert.equal(residentStatus(s.templates[1]),'paused');assert.throws(()=>run(s,'template.use',{id:'neo',newId:'bad',date:'2026-11-10'}));
 s=run(s,'template.delete',{id:'neo'});assert.equal(residentStatus(s.templates[1]),'archived');assert.equal(s.templates.length,4);
});
test('promoting a never-used placeholder retains original ID while removing it from all pending estimates',()=>{
 let s=run(base(),'task.save',{id:'placeholder',task:input});assert.equal(projectMetrics(s,'p').total,60);
 s=run(s,'template.save',{id:'placeholder',sourceTaskId:'placeholder',task:s.tasks[0],kind:'stage'});
 assert.equal(s.tasks[0].id,'placeholder');assert.equal(s.tasks[0].templateOnly,true);assert.equal(liveTasks(s).length,0);assert.equal(projectMetrics(s,'p').total,0);assert.equal(projectMetrics(s,'p').tasks.length,0);assert.equal(s.sessions.length,0);
 assert.throws(()=>run(s,'task.record',{id:'placeholder',date:'2026-11-10',minutes:30}),/入口不能/);
 s=run(s,'template.save',{id:'new-id',sourceTaskId:'placeholder',task:s.tasks[0],kind:'long-term'});assert.equal(s.templates.length,1);assert.equal(s.templates[0].id,'placeholder');
 s=run(s,'template.use',{id:'placeholder',newId:'real',date:'2026-11-10',minutes:30});assert.equal(liveTasks(s).length,1);assert.equal(projectMetrics(s,'p').total,30);
});
test('promoting historical task reuses equivalent template and preserves raw seconds, partial progress, dates and counts',()=>{
 let s=run(base(),'task.save',{id:'history',task:{...input,date:'2026-11-09',note:'Keep me'}});
 s=run(s,'focus.start',{taskId:'history',mode:'countup'},new Date('2026-11-09T09:00:00Z'));
 s=run(s,'focus.finish',{},new Date('2026-11-09T09:31:05Z'));
 const task=structuredClone(s.tasks[0]),sessions=structuredClone(s.sessions),life=structuredClone(s.life);
 s=run(s,'template.save',{id:'old-entry',task:input});
 s=run(s,'template.save',{id:'would-duplicate',sourceTaskId:'history',task,kind:'stage'});
 assert.equal(s.templates.length,1);assert.equal(s.templates[0].id,'old-entry');assert.deepEqual(s.tasks[0],{...task,sourceTemplateId:'old-entry'});assert.deepEqual(s.sessions,sessions);assert.deepEqual(s.life,life);assert.equal(s.tasks.length,1);
 s=run(s,'template.status',{id:'old-entry',status:'archived'});assert.deepEqual(s.sessions,sessions);assert.equal(liveTasks(s).length,1);
});
