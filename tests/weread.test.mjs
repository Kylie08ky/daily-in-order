import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
import {bookProgress,activityStats} from '../lib/life-metrics.ts';
import {parseWeReadShelf,parseWeReadProgress} from '../lib/weread.ts';
const now=new Date('2026-11-12T12:00:00Z');
const remote={bookId:'example123',title:'Fictional book',author:'Example',cover:{url:'https://example.org/real.jpg',source:'weread',sourceUrl:'https://weread.qq.com/'}};
const snapshot={bookId:'example123',progress:57,updatedAt:1794470000,syncedAt:now.toISOString(),readerLink:''};
const sync=(s,changes)=>applyCommand(s,{type:'reading.weread.sync',payload:changes},now);
const change=(extra={})=>({targetId:'weread:example123',create:true,book:remote,snapshot,...extra});

test('WeRead preserves 1% and strips remote time; no invented page totals',()=>{
 const books=parseWeReadShelf({books:[{...remote,cover:'http://example.org/real.jpg'}, {...remote,cover:'javascript:alert(1)'}],albums:[{}]});assert.equal(books.length,1);assert.equal(books[0].cover,undefined);
 const p=parseWeReadProgress({bookId:'example123',book:{progress:1,updateTime:123,recordReadingTime:900,chapterUid:4}},'example123',now.toISOString());assert.equal(p.progress,1);assert.equal(p.recordReadingTime,undefined);
 assert.throws(()=>parseWeReadProgress({bookId:'other',book:{progress:10,updateTime:123}},'example123',now.toISOString()));
 assert.throws(()=>parseWeReadProgress({book:{progress:101,updateTime:123}},'example123',now.toISOString()));
 let s=sync(emptyState(),[change()]);assert.equal(s.life.books[0].total,null);assert.equal(bookProgress(s,s.life.books[0].id).pages,0);assert.equal(bookProgress(s,s.life.books[0].id).percent,57);
 assert.equal(s.tasks.length,0);assert.equal(s.life.entries.length,0);assert.equal(s.sessions.length,0);
 s=sync(s,[change()]);assert.equal(s.life.books.length,1);assert.deepEqual(decodeState(encodeState(s)),s);
});
test('binding and retries leave original pages, dates, IDs, completion, time and sessions intact',()=>{
 let s=applyCommand(emptyState(),{type:'life.save',payload:{table:'books',record:{id:'existing',title:remote.title,total:258,initial:20}}},now);
 s=applyCommand(s,{type:'life.save',payload:{table:'entries',record:{id:'entry',kind:'reading',refId:'existing',date:'2026-11-08',minutes:30,page:149}}},now);
 const original=structuredClone(s),progress=bookProgress(s,'existing'),stats=activityStats(s,'reading');
 assert.throws(()=>sync(s,[change()]),/同名/);
 const archived=structuredClone(s);archived.life.books[0].deletedAt=now.toISOString();assert.throws(()=>sync(archived,[change()]),/同名/);
 for(let i=0;i<3;i++)s=sync(s,[change({targetId:'existing',create:false})]);
 assert.equal(s.life.books.length,1);assert.deepEqual(s.tasks,original.tasks);assert.deepEqual(s.sessions,original.sessions);assert.deepEqual(s.life.entries,original.life.entries);assert.deepEqual(bookProgress(s,'existing'),progress);assert.deepEqual(activityStats(s,'reading'),stats);
 const stale=sync(s,[change({targetId:'existing',create:false,snapshot:{...snapshot,progress:10,updatedAt:123,syncedAt:'2026-11-13T00:00:00.000Z'}})]);assert.equal(stale.life.books[0].weread.progress,57);
 assert.throws(()=>sync(s,[change({targetId:'wrong'})]),/已关联/);
 const before=structuredClone(s);assert.throws(()=>sync(s,[change({targetId:'existing',create:false}),change({targetId:'different'})]));assert.deepEqual(s,before);
 const bad=structuredClone(s);bad.life.books.push({...bad.life.books[0],id:'duplicate'});assert.throws(()=>validateState(bad));
});
test('unknown paper page count still permits real manual checkpoints and does not overwrite them on sync',()=>{
 let s=sync(emptyState(),[change()]);s=applyCommand(s,{type:'life.save',payload:{table:'entries',record:{id:'paper',kind:'reading',refId:s.life.books[0].id,date:'2026-11-10',minutes:20,page:97}}},now);
 assert.equal(bookProgress(s,s.life.books[0].id).pages,97);const before=structuredClone(s);
 s=sync(s,[change({snapshot:{...snapshot,progress:80,updatedAt:snapshot.updatedAt+100}})]);
 assert.deepEqual(s.life.entries,before.life.entries);assert.deepEqual(s.tasks,before.tasks);assert.equal(bookProgress(s,s.life.books[0].id).pages,97);
});
