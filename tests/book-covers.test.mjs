import test from 'node:test';
import assert from 'node:assert/strict';
import {bookCoverSchema,coverSearchUrl,parseCoverResults} from '../lib/book-covers.ts';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {bookProgress} from '../lib/life-metrics.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';

test('catalog searches are explicit, encoded and ISBN requests identify an edition',()=>{
 const title=new URL(coverSearchUrl('虚构书名 & Geschichte'));assert.equal(title.searchParams.get('q'),'虚构书名 & Geschichte');assert.equal(title.searchParams.get('limit'),'12');
 const isbn=new URL(coverSearchUrl('978-0-123456-78-9'));assert.equal(isbn.searchParams.get('bibkeys'),'ISBN:9780123456789');
 const results=parseCoverResults({docs:[{key:'/works/OL1W',title:'Synthetic Book',author_name:['Example Author'],cover_i:42,first_publish_year:2020},{key:'/works/OL2W',title:'Missing cover'},{key:'javascript:bad',cover_i:52}]},'Synthetic');
 assert.equal(results.length,1);assert.equal(results[0].cover.url,'https://covers.openlibrary.org/b/id/42-L.jpg?default=false');assert.equal(results[0].cover.isbn,'');
 assert.deepEqual(parseCoverResults({},'9780123456789'),[]);
 const edition=parseCoverResults({'ISBN:9780123456789':{title:'Exact edition',cover:{large:'http://covers.openlibrary.org/b/id/80-L.jpg'},publish_date:'2025'}},'9780123456789');assert.equal(edition[0].cover.isbn,'9780123456789');assert.ok(edition[0].cover.url.startsWith('https:'));
});
test('cover metadata rejects executable, insecure and oversized images',()=>{
 for(const url of ['javascript:alert(1)','http://example.org/a.jpg','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,'+'A'.repeat(180001),'https://name:password@example.org/a.jpg'])assert.equal(bookCoverSchema.safeParse({url,source:'url'}).success,false);
 assert.equal(bookCoverSchema.safeParse({url:'https://example.org/cover.jpg',source:'url'}).success,true);
 assert.equal(bookCoverSchema.safeParse({url:'data:image/jpeg;base64,AAAA',source:'upload'}).success,true);
});
test('adding, replacing and removing covers preserves reading history, task IDs and time through cloud round trips',()=>{
 const now=new Date('2026-11-12T12:00:00Z');let s=emptyState();
 const save=(state,table,record)=>applyCommand(state,{type:'life.save',payload:{table,record}},now);
 s=save(s,'books',{id:'sample-book',title:'A fictional book',total:258,initial:42});
 s=save(s,'entries',{id:'sample-reading',kind:'reading',refId:'sample-book',date:'2026-11-10',minutes:30,page:97,units:0});
 const original=structuredClone(s),progress=bookProgress(s,'sample-book');
 for(const cover of [{url:'https://example.org/edition-a.jpg',source:'url'},{url:'data:image/jpeg;base64,AAAA',source:'upload'},undefined]){
  s=save(s,'books',{...s.life.books[0],cover});s=decodeState(encodeState(s));assert.deepEqual(s.tasks,original.tasks);assert.deepEqual(s.sessions,original.sessions);assert.deepEqual(s.life.entries,original.life.entries);assert.deepEqual(bookProgress(s,'sample-book'),progress);assert.equal(s.life.books[0].id,'sample-book');
 }
 const old={...original,schemaVersion:13};assert.equal(validateState(old).schemaVersion,14);assert.deepEqual(old,original.schemaVersion===13?original:{...original,schemaVersion:13});
});
