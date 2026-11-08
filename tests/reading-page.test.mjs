import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {bookProgress,activityStats,activeEntries} from '../lib/life-metrics.ts';
import {readingPositions} from '../lib/reading-progress.ts';
const now=new Date('2026-11-08T12:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
const save=(s,table,record)=>run(s,'life.save',{table,record});
function base(){return save(emptyState(),'books',{id:'book',title:'Example book',total:200,initial:40});}
const log=(s,id,page,date='2026-11-08')=>save(s,'entries',{...s.life.entries.find(e=>e.id===id),id,kind:'reading',refId:'book',date,minutes:20,page});

test('page checkpoints replace the current position, including corrections and rereads',()=>{
 let s=log(base(),'a',65);s=log(s,'b',90);
 assert.equal(bookProgress(s,'book').pages,90);assert.equal(activityStats(s,'reading').units,50);
 s=log(s,'b',80);assert.equal(bookProgress(s,'book').pages,80);assert.equal(s.tasks.length,2);
 s=log(s,'c',70);assert.equal(bookProgress(s,'book').pages,70);
 s=log(s,'d',70);assert.equal(bookProgress(s,'book').pages,70);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});
test('legacy increments and dated checkpoints coexist without rewriting old records',()=>{
 let s=save(base(),'entries',{id:'old',kind:'reading',refId:'book',date:'2026-11-06',minutes:15,units:10});
 const old=structuredClone(s.life.entries[0]);s=log(s,'new',80,'2026-11-08');s=log(s,'backfill',60,'2026-11-07');
 assert.equal(bookProgress(s,'book').pages,80);assert.deepEqual(s.life.entries[0],old);
 const points=readingPositions(s,activeEntries(s));assert.equal(points.get('old').page,50);assert.equal(points.get('new').units,20);
 s=run(s,'life.remove',{table:'entries',id:'new'});assert.equal(bookProgress(s,'book').pages,60);
 s=run(s,'life.restore',{table:'entries',id:'new'});assert.equal(bookProgress(s,'book').pages,80);
});
test('completing a reading task upserts a checkpoint without duplicating task or focus time',()=>{
 let s=run(base(),'task.save',{id:'daily',task:{title:'Read',date:'2026-11-08',minutes:30,activity:{kind:'reading',refId:'book'}}});
 s=run(s,'task.record',{id:'daily',date:'2026-11-08',minutes:30});
 const sessions=structuredClone(s.sessions);
 s=run(s,'task.progress',{id:'daily',progress:100,actual:30,readingPage:65});
 assert.equal(s.tasks.length,1);assert.deepEqual(s.sessions,sessions);assert.equal(activityStats(s,'reading').minutes,30);assert.equal(bookProgress(s,'book').pages,65);
 s=run(s,'task.progress',{id:'daily',progress:100,readingPage:70});assert.equal(s.life.entries.length,1);assert.equal(bookProgress(s,'book').pages,70);
 s=run(s,'task.progress',{id:'daily',progress:0});assert.equal(bookProgress(s,'book').pages,40);
 s=run(s,'task.progress',{id:'daily',progress:100});assert.equal(bookProgress(s,'book').pages,70);
});
test('blank page leaves progress alone; invalid page rejects the complete operation',()=>{
 let s=run(base(),'task.save',{id:'daily',task:{title:'Read',activity:{kind:'reading',refId:'book'}}});
 for(const page of [-1,201,2.5])assert.throws(()=>run(s,'task.progress',{id:'daily',progress:100,readingPage:page}));
 assert.equal(s.tasks[0].progress,0);assert.equal(s.life.entries.length,0);
 s=run(s,'task.progress',{id:'daily',progress:100,actual:null});assert.equal(bookProgress(s,'book').pages,40);assert.equal(s.tasks[0].actual,null);
 s=run(s,'task.progress',{id:'daily',progress:100,readingPage:60});assert.equal(activityStats(s,'reading').missing,1);assert.equal(bookProgress(s,'book').pages,60);
 assert.throws(()=>log(s,'bad',201));
 const malformed=structuredClone(s);malformed.life.entries[0].page=201;assert.throws(()=>validateState(malformed));
});
test('finish date follows the final checkpoint and recalculates on correction',()=>{
 let s=log(base(),'end',200);assert.equal(bookProgress(s,'book').finished,'2026-11-08');
 s=log(s,'end',190);assert.equal(bookProgress(s,'book').finished,'');assert.equal(bookProgress(s,'book').pages,190);
});
