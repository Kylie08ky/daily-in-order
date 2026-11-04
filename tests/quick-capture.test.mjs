import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {parseList,parseAIPlan,duplicates,plannerPrompt} from '../lib/quick-capture.ts';
const now=new Date('2026-11-04T12:00:00Z');
const add=(s,items,firstLogin=false)=>applyCommand(s,{type:'quick.add',payload:{items,firstLogin}},now);
const item={id:'test-one',title:'Read',date:'2026-11-04',start:'',minutes:0};
test('list mode preserves prose and only reads explicit time fields',()=>{
 const rows=parseList('- Prepare report\n2. Walk | 18:00 | 30\nRead tomorrow for 1 hour','2026-11-04');
 assert.equal(rows[0].minutes,0);assert.equal(rows[1].start,'18:00');assert.equal(rows[1].minutes,30);assert.equal(rows[2].title,'Read tomorrow for 1 hour');assert.equal(rows[2].start,'');assert.equal(rows[2].minutes,0);
 assert.throws(()=>parseList('x'.repeat(6001),'2026-11-04'));assert.throws(()=>parseList('x\n'.repeat(51),''));assert.throws(()=>parseList('x | 25:00 | 20',''));
});
test('AI output is untrusted: no actual time, completion or relationships can be imported',()=>{
 const p=parseAIPlan(JSON.stringify({tasks:[{...item,actual:99,progress:100,projectId:'private',start:''}],notes:'review'}));
 assert.equal(p.tasks[0].actual,undefined);assert.equal(p.tasks[0].id,undefined);assert.equal(p.tasks[0].projectId,undefined);
 const s=add(emptyState(),p.tasks.map((t,i)=>({...t,id:'draft-'+i})));assert.equal(s.tasks[0].actual,null);assert.equal(s.tasks[0].progress,0);assert.equal(s.sessions.length,0);
 assert.throws(()=>parseAIPlan('{not json'));assert.throws(()=>parseAIPlan('{"tasks":[{"title":"x","date":"2026-02-30","start":"","minutes":0}]}'));
});
test('batch add is atomic, blank schedule remains blank, does not change goals',()=>{
 const base=emptyState();const s=add(base,[item,{...item,id:'pool',title:'Unscheduled',date:''}],true);
 assert.equal(base.tasks.length,0);assert.equal(s.tasks[1].date,'');assert.equal(s.tasks[0].start,'');assert.equal(s.onboarding,'completed');assert.deepEqual(s.life,base.life);assert.deepEqual(s.settings,base.settings);
 assert.throws(()=>add(base,[item,{...item,id:'bad',title:'invalid',start:'23:50',minutes:60}]));assert.equal(base.tasks.length,0);
 assert.throws(()=>add(base,[{...item,start:'09:00'}]));
});
test('duplicate names on same date/time are rejected, distinct schedules are accepted',()=>{
 const s=add(emptyState(),[item]);assert.deepEqual(duplicates([{...item,title:' read '},{...item,date:'2026-11-05'}],s),[true,false]);
 assert.throws(()=>add(s,[{...item,id:'new'}]));assert.throws(()=>add(s,[{...item,title:'Another'}]));
 assert.equal(add(s,[{...item,id:'tomorrow',date:'2026-11-05'}]).tasks.length,2);
});
test('undo soft-deletes only its untouched batch and refuses later edits or focused tasks',()=>{
 const s=add(emptyState(),[item]);const expected=structuredClone(s.tasks);
 const undone=applyCommand(s,{type:'quick.undo',payload:expected},now);assert.ok(undone.tasks[0].deletedAt);assert.equal(s.tasks[0].deletedAt,null);
 const changed=applyCommand(s,{type:'task.progress',payload:{id:item.id,progress:30}},now);
 assert.throws(()=>applyCommand(changed,{type:'quick.undo',payload:expected},now));assert.equal(changed.tasks[0].progress,30);
 const focused=applyCommand(s,{type:'focus.start',payload:{taskId:item.id}},now);
 assert.throws(()=>applyCommand(focused,{type:'quick.undo',payload:expected},now));
});
test('AI prompt accepts only explicit input and current draft, with bounded size',()=>{
 const prompt=plannerPrompt('move to tomorrow','2026-11-04','en',[item]);assert.ok(prompt.includes('move to tomorrow'));assert.ok(prompt.includes('NEVER invent'));assert.ok(!prompt.includes('private-account'));
 assert.throws(()=>plannerPrompt('x'.repeat(6001),'2026-11-04','en'));
});
