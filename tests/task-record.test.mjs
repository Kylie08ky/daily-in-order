import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,validateState,projectMetrics} from '../lib/model.ts';import {applyCommand} from '../lib/commands.ts';import {investmentByTask,minutesInRange,localInstant,sessionBlocks} from '../lib/task-investment.ts';
const start=Date.parse('2026-11-04T10:00:00Z');const apply=(s,type,payload,mins=0)=>applyCommand(s,{type,payload},new Date(start+mins*60000));
const base=()=>{let s=apply(emptyState(),'project.save',{id:'p',project:{name:'项目'},modules:[]});return apply(s,'task.save',{id:'t',task:{title:'分段任务',projectId:'p',date:'2026-11-03',start:'08:00',minutes:120}});};
test('30 + 45 minute sessions retain real intervals, accumulate to 75 minutes / 63%, preserve plan',()=>{
 let s=base();s=apply(s,'focus.start',{taskId:'t',mode:'countup'});s=apply(s,'focus.finish',undefined,30);
 assert.equal(s.tasks[0].progress,25);assert.equal(s.tasks[0].actual,30);assert.equal(s.sessions[0].spans[0].startedAt,new Date(start).toISOString());
 s=apply(s,'focus.start',{taskId:'t',mode:'countup'},120);s=apply(s,'focus.finish',undefined,165);
 assert.equal(s.tasks[0].actual,75);assert.equal(s.tasks[0].progress,63);assert.equal(projectMetrics(s,'p').progress,63);assert.equal(projectMetrics(s,'p').spent,75);assert.equal(s.tasks[0].start,'08:00');assert.equal(s.tasks[0].date,'2026-11-03');assert.equal(s.tasks[0].minutes,120);
 assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-04'),75);assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-11-03'),0);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});
test('pause gap and late countdown settlement never become work time',()=>{
 let s=base();s=apply(s,'focus.start',{taskId:'t',mode:'countdown',minutes:30});s=apply(s,'focus.pause',undefined,10);s=validateState(JSON.parse(JSON.stringify(s)));s=apply(s,'focus.start',{taskId:'t'},60);s=apply(s,'focus.pause',undefined,200);s=apply(s,'focus.finish',undefined,300);
 assert.equal(s.tasks[0].actual,30);assert.equal(s.sessions[0].endedAt,new Date(start+80*60000).toISOString());assert.deepEqual(s.sessions[0].spans,[{startedAt:new Date(start).toISOString(),endedAt:new Date(start+10*60000).toISOString()},{startedAt:new Date(start+60*60000).toISOString(),endedAt:new Date(start+80*60000).toISOString()}]);assert.equal(apply(s,'focus.finish',undefined,400).sessions.length,1);
});
test('manual duration adds once, manual percentage survives focus, switching to time recalculates',()=>{
 let s=base();s=apply(s,'task.record',{id:'t',date:'2026-11-04',minutes:30});assert.equal(s.tasks[0].progress,25);
 s=apply(s,'task.record',{id:'t',date:'2026-11-04',progress:70});s=apply(s,'focus.start',{taskId:'t',mode:'countup'});s=apply(s,'focus.finish',undefined,45);assert.equal(s.tasks[0].actual,75);assert.equal(s.tasks[0].progress,70);
 s=apply(s,'task.record',{id:'t',date:'2026-11-04',progressSource:'time'},46);assert.equal(s.tasks[0].progress,63);
 s=apply(s,'task.record',{id:'t',date:'2026-11-04',minutes:60},60);assert.equal(s.tasks[0].actual,135);assert.equal(s.tasks[0].progress,99);assert.equal(s.tasks[0].completedAt,null);
 s=apply(s,'task.record',{id:'t',date:'2026-11-04',progress:100},61);assert.equal(s.tasks[0].progress,100);assert.ok(s.tasks[0].completedAt);
});
test('manual real times use configured timezone and split across midnight without double counting',()=>{
 let s=base();const startedAt=localInstant('2026-11-03T23:45','Europe/Berlin'),endedAt=localInstant('2026-11-04T00:30','Europe/Berlin');s=apply(s,'task.record',{id:'t',date:'2026-11-04',startedAt,endedAt});
 assert.equal(s.tasks[0].actual,45);const days=investmentByTask(s).get('t');assert.equal(minutesInRange(days,'2026-11-03'),15);assert.equal(minutesInRange(days,'2026-11-04'),30);assert.equal([...days.values()].reduce((a,b)=>a+b),45);
 assert.throws(()=>localInstant('2026-03-29T02:30','Europe/Berlin'),/不存在/);
 const session={...s.sessions[0],spans:[{startedAt:'2026-10-25T00:30:00.000Z',endedAt:'2026-10-25T02:30:00.000Z'}],seconds:7200};assert.equal(sessionBlocks(session,'Europe/Berlin').reduce((n,b)=>n+b.seconds,0),7200);
});
test('legacy actual and short fractional sessions remain exact after reload, no made-up timestamps',()=>{
 let s=base();s.tasks[0].actual=20;s=apply(s,'focus.start',{taskId:'t',mode:'countup'});s=apply(s,'focus.finish',undefined,0.4);s=apply(s,'focus.start',{taskId:'t',mode:'countup'},1);s=apply(s,'focus.finish',undefined,1.4);assert.equal(s.tasks[0].actual,21);const days=investmentByTask(s).get('t');assert.equal(minutesInRange(days,'2026-11-03'),20);assert.equal(minutesInRange(days,'2026-11-04'),1);
 let old=base();old.schemaVersion=4;old.focus={taskId:'t',startedAt:null,seconds:600,target:1500};old=validateState(old);old=apply(old,'focus.finish');assert.equal(old.sessions[0].seconds,600);assert.deepEqual(old.sessions[0].spans,[]);
});
test('bad manual records are rejected without changing the task',()=>{
 const s=base();for(const patch of [{minutes:-1},{minutes:1500},{progress:101},{date:'2026-11-05',minutes:5},{startedAt:'2026-11-04T12:00:00.000Z'},{startedAt:'2026-11-04T08:00:00.000Z',endedAt:'2026-11-04T07:00:00.000Z'},{startedAt:'2026-11-04T11:00:00.000Z',endedAt:'2026-11-04T12:00:00.000Z'}])assert.throws(()=>apply(s,'task.record',{id:'t',date:'2026-11-04',...patch}));assert.equal(s.tasks[0].actual,null);assert.equal(s.sessions.length,0);
});
test('fractional-second clocks stay one continuous interval, split midnight precisely',()=>{
 const session={id:'fraction',taskId:'t',date:'2026-11-04',seconds:90,growth:0,endedAt:'2026-11-04T10:02:00.597Z',spans:[{startedAt:'2026-11-04T10:00:30.597Z',endedAt:'2026-11-04T10:02:00.597Z'}]};
 const blocks=sessionBlocks(session,'Europe/Berlin');assert.equal(blocks.length,1);assert.equal(blocks[0].seconds,90);
 const midnight=sessionBlocks({...session,spans:[{startedAt:'2026-11-03T22:59:30.500Z',endedAt:'2026-11-03T23:00:30.500Z'}]},'Europe/Berlin');assert.equal(midnight.length,2);assert.equal(midnight[0].seconds,29.5);assert.equal(midnight[1].seconds,30.5);
});
