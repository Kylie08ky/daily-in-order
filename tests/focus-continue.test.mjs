import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {focusSeconds} from '../lib/focus-clock.ts';
const start=Date.parse('2026-11-15T10:00:00Z');
const run=(s,type,payload,sec=0)=>applyCommand(s,{type,payload},new Date(start+sec*1000));
function setup(){let s=run(emptyState(),'task.save',{id:'t',task:{title:'Test focus',minutes:25}});return run(s,'focus.start',{taskId:'t',mode:'countdown',minutes:25});}
const continuation=s=>({taskId:'t',target:s.focus.target,anchor:s.focus.spans?.[0]?.startedAt||s.focus.startedAt||null});

test('continue an expired countdown from its target; waiting excluded, one final investment',()=>{
 let s=setup(),p=continuation(s);
 assert.throws(()=>run(s,'focus.continue',p,1499),/尚未结束/);
 s=run(s,'focus.continue',p,1800);
 assert.equal(s.focus.mode,'countup');assert.equal(s.focus.seconds,1500);
 assert.equal(s.focus.spans[0].endedAt,'2026-11-15T10:25:00.000Z');
 assert.equal(s.sessions.length,0);assert.equal(s.tasks[0].actual,null);
 s=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(focusSeconds(s.focus,start+1860000),1560);
 const f=JSON.stringify(s.focus);s=run(s,'focus.continue',p,1860);assert.equal(JSON.stringify(s.focus),f);
 s=run(s,'focus.pause',{expectedMode:'countdown'},1861);assert.equal(s.focus.startedAt,'2026-11-15T10:30:00.000Z');
 s=run(s,'focus.pause',undefined,1920);s=run(s,'focus.start',{taskId:'t'},1980);
 s=run(s,'focus.finish',{sessionId:'one'},2040);
 assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].seconds,1680);
 assert.equal(s.tasks[0].actual,28);assert.notEqual(s.tasks[0].progress,100);
 assert.equal(s.sessions[0].spans.reduce((n,x)=>n+(Date.parse(x.endedAt)-Date.parse(x.startedAt))/1000,0),1680);
 assert.equal(run(s,'focus.finish',{sessionId:'one'},2100).sessions.length,1);
});

test('auto-paused countdown can continue; stale controls cannot affect a new session',()=>{
 let s=setup(),p=continuation(s);s=run(s,'focus.pause',{expectedMode:'countdown'},1600);
 s=run(s,'focus.continue',p,1700);assert.equal(s.focus.seconds,1500);
 s=run(s,'focus.finish',undefined,1760);assert.equal(s.tasks[0].actual,26);
 s=run(s,'focus.start',{taskId:'t',mode:'countdown',minutes:25},1800);
 assert.throws(()=>run(s,'focus.continue',p,3400),/已变化/);
});
