import test from 'node:test';import assert from 'node:assert/strict';
import {layoutTimeline,timelineItems} from '../lib/timeline-items.ts';import {emptyState} from '../lib/model.ts';import {applyCommand} from '../lib/commands.ts';import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const block=(id,start,length)=>({id,task:{id},begin:start,length});
test('touching intervals and short sessions stay full-width; only real overlaps split lanes',()=>{
 const a=layoutTimeline([block('a',540,30),block('b',570,30),block('c',605,30)]);assert.deepEqual(a.map(x=>[x.lane,x.lanes]),[[0,1],[0,1],[0,1]]);
 const b=layoutTimeline([block('a',540,30),block('b',555,30),block('c',585,15)]);assert.deepEqual(b.map(x=>[x.lane,x.lanes]),[[0,2],[1,2],[0,1]]);
 const c=layoutTimeline([block('a',540,1),block('b',541,1),block('c',542,1)]);assert.ok(c.every(x=>x.lanes===1));
});
test('focus start, pause, reload, resume and finish retain actual spans through cloud codec',()=>{
 let s=emptyState();const run=(type,payload,instant)=>{s=decodeState(encodeState(applyCommand(s,{type,payload},new Date(instant))));};
 run('task.save',{id:'t',task:{title:'播客',date:'2026-11-04',start:'09:00',minutes:30}},'2026-11-04T06:00:00Z');
 run('focus.start',{taskId:'t',mode:'countup'},'2026-11-04T10:10:00Z');run('focus.pause',undefined,'2026-11-04T10:20:00Z');run('focus.start',{taskId:'t'},'2026-11-04T10:35:00Z');run('focus.finish',undefined,'2026-11-04T10:55:00Z');
 assert.equal(s.tasks[0].actual,30);assert.deepEqual(s.sessions[0].spans,[{startedAt:'2026-11-04T10:10:00.000Z',endedAt:'2026-11-04T10:20:00.000Z'},{startedAt:'2026-11-04T10:35:00.000Z',endedAt:'2026-11-04T10:55:00.000Z'}]);
 assert.deepEqual(timelineItems(s,'2026-11-04',s.tasks).map(x=>[x.begin,x.length]),[[670,10],[695,20]]);
});
