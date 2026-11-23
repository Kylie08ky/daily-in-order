import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {investmentByTask,localInstant} from '../lib/task-investment.ts';
import {rangesSummary} from '../lib/done-ranges.ts';

const now=new Date('2026-11-23T18:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
const tz=s=>s.settings.timezone,at=(s,day,time)=>localInstant(day+'T'+time,tz(s));
const fresh=()=>run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic essay',date:'2026-11-22',minutes:180}},new Date('2026-11-20T08:00:00Z'));

test('completing with several from–to ranges stores one record with every range, summed into actual time',()=>{
 let s=fresh();const day='2026-11-22';
 // Given out of order on purpose: stored sorted.
 const spans=[{startedAt:at(s,day,'14:00'),endedAt:at(s,day,'14:30')},{startedAt:at(s,day,'09:00'),endedAt:at(s,day,'10:00')}];
 s=run(s,'task.record',{id:'t',date:day,spans,progress:100});
 const t=s.tasks[0],rec=s.sessions.filter(x=>x.taskId==='t');
 assert.deepEqual([t.progress,t.completedDate,t.actual],[100,day,90]);
 assert.equal(rec.length,1);assert.equal(rec[0].seconds,5400);
 assert.deepEqual(rec[0].spans.map(x=>x.startedAt),[spans[1].startedAt,spans[0].startedAt]);assert.equal(rec[0].endedAt,spans[0].endedAt);
 assert.deepEqual(Object.fromEntries(investmentByTask(s).get('t')),{[day]:90});
});

test('a single range still works through both the old and the new payload',()=>{
 const day='2026-11-22';let a=fresh(),b=fresh();
 a=run(a,'task.record',{id:'t',date:day,startedAt:at(a,day,'09:00'),endedAt:at(a,day,'09:45'),progress:100});
 b=run(b,'task.record',{id:'t',date:day,spans:[{startedAt:at(b,day,'09:00'),endedAt:at(b,day,'09:45')}],progress:100});
 assert.deepEqual([a.tasks[0].actual,b.tasks[0].actual],[45,45]);assert.deepEqual(a.sessions[0].spans,b.sessions[0].spans);
});

test('overlapping, reversed, future or mixed ranges are refused without writing',()=>{
 const s=fresh(),before=structuredClone(s),day='2026-11-22';
 const r=(a,b)=>({startedAt:at(s,day,a),endedAt:at(s,day,b)});
 assert.throws(()=>run(s,'task.record',{id:'t',date:day,spans:[r('09:00','10:00'),r('09:30','11:00')],progress:100}),/重叠/);
 assert.throws(()=>run(s,'task.record',{id:'t',date:day,spans:[r('10:00','09:00')],progress:100}),/晚于开始/);
 assert.throws(()=>run(s,'task.record',{id:'t',date:'2026-11-23',spans:[{startedAt:at(s,'2026-11-23','23:00'),endedAt:at(s,'2026-11-23','23:30')}],progress:100},new Date('2026-11-23T08:00:00Z')),/未来/);
 assert.throws(()=>run(s,'task.record',{id:'t',date:day,startedAt:at(s,day,'08:00'),endedAt:at(s,day,'08:30'),spans:[r('09:00','10:00')]}),/一种方式/);
 assert.deepEqual(s,before);
});

test('the form summary adds up filled ranges and names the first problem',()=>{
 assert.deepEqual(rangesSummary([{start:'09:00',end:'10:00'},{start:'14:00',end:'14:30'}]),{minutes:90,problem:''});
 assert.deepEqual(rangesSummary([{start:'09:00',end:'10:00'},{start:'',end:''}]),{minutes:60,problem:''});
 assert.equal(rangesSummary([{start:'10:00',end:'09:00'}]).problem,'结束要晚于开始。');
 assert.equal(rangesSummary([{start:'09:00',end:'10:00'},{start:'09:30',end:'11:00'}]).problem,'几段时间有重叠。');
 assert.equal(rangesSummary([{start:'09:00',end:'10:00'},{start:'10:00',end:'11:00'}]).problem,'','back-to-back ranges are fine');
});

test('the completion dialog has a + beside the last range and sends every range in one command',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8'),ui=fs.readFileSync('app/done-ranges.tsx','utf8');
 assert.ok(wb.includes('<DoneRanges ranges={doneRanges} onChange={setDoneRanges}/>'));
 assert.ok(wb.includes("payload:{id:completion.id,date:day,spans,progress:100}"));assert.ok(wb.includes('if(rangesSummary(doneRanges).problem)return;'));
 assert.ok(ui.includes("i===ranges.length-1&&ranges.length<20&&<button type=\"button\" className=\"icon-btn done-range-add\" aria-label={ui('再加一段')}"));
 assert.ok(ui.includes("{many&&<button type=\"button\" className=\"icon-btn\" aria-label={tr('删除第 {0} 段',i+1)}"));
});
