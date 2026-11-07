import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,aggregateProgress,projectMetrics,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const instant=new Date('2026-11-07T12:00:00Z');
const apply=(s,type,payload)=>applyCommand(s,{type,payload},instant);
const base=()=>{let s=apply(emptyState(),'project.save',{id:'p',project:{name:'Demo'},modules:[{id:'m',name:'Module'}]});
 for(const [id,minutes,actual,progress] of [['a',30,30,100],['b',90,0,0]])s=apply(s,'task.save',{id,task:{title:id,projectId:'p',moduleId:'m',minutes,actual,progress}});return s;};
test('time ratio uses recorded time, completion uses average; changing mode preserves records and other totals',()=>{
 const initial=base(),before=projectMetrics(initial,'p');assert.equal(before.progress,50);
 const s=apply(initial,'project.progress-basis',{id:'p',basis:'time'}),after=projectMetrics(s,'p');
 assert.equal(after.progress,25);assert.equal(aggregateProgress(s.tasks,'time').progress,25);
 assert.deepEqual(s.tasks,initial.tasks);assert.deepEqual(s.sessions,initial.sessions);assert.deepEqual(s.modules,initial.modules);
 for(const key of ['done','total','remaining','scheduled','spent'])assert.equal(after[key],before[key]);
 assert.equal(projectMetrics(apply(s,'project.progress-basis',{id:'p',basis:'tasks'}),'p').progress,50);
 assert.equal(projectMetrics(initial,'p').basis,'tasks');
});
test('no estimates, deleted tasks and overtime cannot produce NaN or silently mark tasks complete',()=>{
 let s=base();s=apply(s,'task.save',{id:'no-estimate',task:{title:'No estimate',projectId:'p',minutes:0,actual:900,progress:0}});
 s=apply(s,'project.progress-basis',{id:'p',basis:'time'});assert.equal(projectMetrics(s,'p').progress,25);assert.equal(projectMetrics(s,'p').unestimated,1);
 s.tasks.find(t=>t.id==='a').actual=300;assert.equal(projectMetrics(s,'p').progress,100);assert.equal(s.tasks.find(t=>t.id==='b').progress,0);
 s.tasks.find(t=>t.id==='a').deletedAt=instant.toISOString();assert.equal(projectMetrics(s,'p').progress,0);
 const noEstimate=aggregateProgress(s.tasks.filter(t=>t.minutes===0),'time');assert.equal(noEstimate.progressReady,false);assert.equal(noEstimate.progress,0);
 assert.equal(aggregateProgress([],'time').progress,0);
});
test('legacy state and serialized backup preserve choices; unrelated project edits do not reset the choice',()=>{
 let s=base();assert.equal(projectMetrics(validateState(s),'p').basis,'tasks');
 s=apply(s,'project.progress-basis',{id:'p',basis:'time'});
 s=apply(s,'project.save',{id:'p',project:{name:'Renamed'},modules:[{id:'m',name:'Module'}]});
 const restored=decodeState(encodeState(validateState(JSON.parse(JSON.stringify(s)))));
 assert.equal(projectMetrics(restored,'p').basis,'time');assert.equal(projectMetrics(restored,'p').progress,25);
 assert.throws(()=>apply(s,'project.progress-basis',{id:'p',basis:'invalid'}));
 assert.throws(()=>apply(s,'project.progress-basis',{id:'missing',basis:'time'}));
});
test('editing and deleting individual time entries recalculates time progress while manual percentages stay intact',()=>{
 let s=base();s=apply(s,'project.progress-basis',{id:'p',basis:'time'});
 s=apply(s,'task.progress',{id:'b',progress:70});
 s=apply(s,'task.record',{id:'b',date:'2026-11-07',minutes:30});assert.equal(projectMetrics(s,'p').progress,50);
 const id=s.sessions[0].id;
 s=apply(s,'session.update',{id,date:'2026-11-07',spans:[],untimedSeconds:15*60,note:''});assert.equal(projectMetrics(s,'p').progress,38);
 s=apply(s,'session.delete',{id});assert.equal(projectMetrics(s,'p').progress,25);assert.equal(s.tasks.find(t=>t.id==='b').progress,70);
 s=apply(s,'session.restore',{id});assert.equal(projectMetrics(s,'p').progress,38);
});
