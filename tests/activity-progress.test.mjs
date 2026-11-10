import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,taskSchema,validateState} from '../lib/model.ts';
import {courseSchema,bookSchema,entrySchema} from '../lib/life-schema.ts';
import {applyCommand} from '../lib/commands.ts';
import {activityStats,bookProgress,allActivityMinutes} from '../lib/life-metrics.ts';
import {learningInvestment} from '../lib/learning-overview.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-10T14:00Z');
function base(minutes=31){const s=emptyState();s.life.courses=[courseSchema.parse({id:'eg',name:'A1',total:64,initial:4,unit:'视频',category:'speaking'}),courseSchema.parse({id:'vocab',name:'Recitation',mode:'practice',category:'vocabulary'}),courseSchema.parse({id:'listen',name:'Listening',mode:'practice',category:'listening'})];s.life.books=[bookSchema.parse({id:'a',title:'Book A',total:258}),bookSchema.parse({id:'b',title:'Book B',total:100})];s.tasks.push(taskSchema.parse({id:'t',title:'Demo',date:'2026-11-07',minutes:120,actual:minutes,progress:20,note:'Keep this',createdAt:now.toISOString(),activity:{kind:'german',refId:'eg'}}));s.sessions.push({id:'s',taskId:'t',date:'2026-11-09',seconds:minutes*60,growth:minutes,endedAt:'2026-11-09T15:00:00Z',spans:[{startedAt:new Date(Date.parse('2026-11-09T15:00Z')-minutes*60000).toISOString(),endedAt:'2026-11-09T15:00:00Z'}]});return s;}
const entry=(extra={})=>entrySchema.parse({id:'e',kind:'german',refId:'eg',date:'2026-11-09',minutes:0,units:2,quantityKnown:true,...extra});
const run=(s,entries,outcomes=[],sessionId='s')=>applyCommand(s,{type:'activity.progress',payload:{taskId:'t',sessionId:sessionId||undefined,date:'2026-11-09',recordType:outcomes.length?'project':'activity',entries,outcomes}},now);
test('31 minutes +2 videos; edit 2→3; retries/codec preserve IDs, time, date and completion',()=>{
 let s=base(),before=structuredClone(s);s=run(s,[entry()]);assert.equal(activityStats(s,'german','eg').units,2);assert.equal(activityStats(s,'german','eg').minutes,31);assert.equal(activityStats(s,'german','eg','2026-11-07','2026-11-07').minutes,0);
 s=run(s,[{...s.life.entries[0],units:3}]);s=run(decodeState(encodeState(s)),[{...s.life.entries[0],units:3}]);assert.equal(s.life.entries.length,1);assert.equal(activityStats(s,'german','eg').units,3);assert.equal(s.tasks[0].actual,31);assert.equal(s.tasks[0].date,before.tasks[0].date);assert.equal(s.tasks[0].progress,20);assert.equal(s.tasks[0].note,'Keep this');assert.deepEqual(s.sessions,before.sessions);assert.equal(learningInvestment(s,'2026-11-09','2026-11-09').total,31);
});
test('progress removal and restore preserve underlying time, including generated legacy tasks',()=>{
 let s=run(base(),[entry()]);s=applyCommand(s,{type:'life.remove',payload:{table:'entries',id:'e'}},now);assert.equal(activityStats(s,'german','eg').units,0);assert.equal(s.tasks[0].actual,31);assert.equal(s.sessions.length,1);s=applyCommand(s,{type:'life.restore',payload:{table:'entries',id:'e'}},now);assert.equal(activityStats(s,'german','eg').units,2);
});
test('video IDs deduplicate across sessions and dates; rewatch never increases quantities',()=>{
 let s=run(base(),[entry({videoIds:['5','6']})]);s=applyCommand(s,{type:'task.record',payload:{id:'t',date:'2026-11-10',minutes:10}},now,()=> 's2');s=run(s,[entry({id:'e2',date:'2026-11-10',videoIds:['6','7']})],[],'s2');assert.equal(activityStats(s,'german','eg').units,3);s=run(s,[{...s.life.entries[1],rewatch:true}],[],'s2');assert.equal(activityStats(s,'german','eg').units,2);assert.equal(s.tasks[0].actual,41);assert.equal(s.life.courses[0].initial,4);
});
test('page149 is a checkpoint; older backfill cannot regress it; start page is required to derive pages',()=>{
 let s=base(30);s.tasks[0].activity={kind:'reading',refId:'a',category:'other'};s=run(s,[entry({kind:'reading',refId:'a',page:149})]);assert.equal(bookProgress(s,'a').pages,149);assert.equal(activityStats(s,'reading','a').minutes,30);assert.equal(activityStats(s,'reading','a').units,0);
 s.tasks.push(taskSchema.parse({id:'old',title:'Old',date:'2026-11-02',createdAt:now.toISOString(),actual:20}));s=applyCommand(s,{type:'activity.progress',payload:{taskId:'old',date:'2026-11-02',recordType:'activity',entries:[entry({id:'old-page',kind:'reading',refId:'a',page:40,startPage:20})],outcomes:[]}},now);assert.equal(bookProgress(s,'a').pages,149);assert.equal(activityStats(s,'reading','a').units,20);assert.equal(s.tasks[0].actual,30);
});
test('two books split 10+20 from one 30 minute session; over-allocation rejects atomically',()=>{
 let s=base(30);s.tasks[0].activity={kind:'reading',refId:'a',category:'other'};const entries=[entry({kind:'reading',refId:'a',page:149,allocation:10}),entry({id:'e2',kind:'reading',refId:'b',page:30,allocation:20})];s=run(s,entries);assert.equal(activityStats(s,'reading','a').minutes,10);assert.equal(activityStats(s,'reading','b').minutes,20);assert.equal(activityStats(s,'reading').minutes,30);assert.equal(allActivityMinutes(s,'2026-11-01','2026-11-30'),30);assert.throws(()=>run(s,[{...entries[0],allocation:20},entries[1]]),/不能超过/);assert.equal(s.life.entries[0].allocation,10);
});
test('one development investment supports three outcomes with no duplicated tasks or time',()=>{
 let s=base(120);s.tasks[0].activity=null;for(const id of ['p1','p2','p3'])s=applyCommand(s,{type:'project.save',payload:{id,project:{name:id},modules:[]}},now);const outcomes=['p1','p2','p3'].map((projectId,i)=>({id:'o'+i,projectId,date:'2026-11-09',version:'v0.5',status:'milestone',result:'Route editor'}));s=run(s,[],outcomes);s=run(s,[],outcomes);assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].actual,120);assert.equal(s.sessions.length,1);assert.equal(s.tasks[0].outcomes.length,3);assert.ok(s.projects.every(p=>p.status==='active'));assert.equal(s.tasks[0].progress,20);
});
test('23 minute recitation reassigned to vocabulary; tags do not duplicate German total',()=>{
 let s=base(23);s.tasks[0].activity={kind:'german',refId:'listen',category:'listening'};s=run(s,[entry({refId:'vocab',units:0,directions:['speaking','vocabulary']})]);const stats=learningInvestment(s,'2000-01-01','2100-12-31');assert.equal(stats.total,23);assert.equal(stats.items.find(c=>c.id==='vocab').minutes,23);assert.equal(stats.items.find(c=>c.id==='listen').minutes,0);assert.equal(s.sessions[0].seconds,23*60);
});
test('explicit learning allocation conserves time; invalid allocations rejected',()=>{
 const entries=[entry({refId:'listen',units:0,allocation:10}),entry({id:'e2',refId:'vocab',units:0,allocation:21})];const s=run(base(),entries),stats=learningInvestment(s,'2000-01-01','2100-12-31');assert.equal(stats.total,31);assert.equal(stats.items.find(c=>c.id==='listen').minutes,10);assert.throws(()=>run(s,[{...entries[0],allocation:9},entries[1]]),/必须等于/);
});
test('unknown quantities remain unknown; correcting total does not duplicate sessions; schema roundtrip',()=>{
 let s=base();s.tasks[0].actual=null;s=run(s,[entry({quantityKnown:false})]);assert.equal(s.tasks[0].actual,null);assert.equal(s.life.entries[0].quantityKnown,false);assert.equal(activityStats(s,'german','eg').units,0);s=applyCommand(s,{type:'activity.time.correct',payload:{taskId:'t',actual:25}},now);assert.equal(s.tasks[0].actual,25);assert.equal(activityStats(s,'german','eg').minutes,25);assert.equal(s.sessions[0].seconds,1860);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});


test('legacy module removal preserves original task and missing actual time when explicitly requested',()=>{
 let s=base();s.life.entries=[entry({...entry(),taskId:'t',minutes:31})];const before=structuredClone(s.tasks[0]);s=applyCommand(s,{type:'life.remove',payload:{table:'entries',id:'e',preserveTime:true}},now);assert.deepEqual(s.tasks[0],before);assert.equal(s.life.entries[0].progressOnly,true);assert.equal(s.sessions[0].seconds,1860);s=applyCommand(s,{type:'life.restore',payload:{table:'entries',id:'e'}},now);assert.equal(activityStats(s,'german','eg').units,2);
});
test('correcting actual time rescales multi-book allocations consistently without touching progress or sessions',()=>{
 let s=base(30);s.tasks[0].activity={kind:'reading',refId:'a',category:'other'};s=run(s,[entry({kind:'reading',refId:'a',page:149,allocation:10}),entry({id:'e2',kind:'reading',refId:'b',page:20,allocation:20})]);s=applyCommand(s,{type:'activity.time.correct',payload:{taskId:'t',actual:15}},now);assert.equal(activityStats(s,'reading','a').minutes,5);assert.equal(activityStats(s,'reading','b').minutes,10);assert.equal(bookProgress(s,'a').pages,149);assert.equal(s.sessions[0].seconds,1800);
});

test('rewatch with explicit video IDs can be saved repeatedly without inflating count',()=>{
 let s=run(base(),[entry({videoIds:['5','6'],rewatch:true})]);s=run(s,[s.life.entries[0]]);assert.equal(activityStats(s,'german','eg').units,0);assert.equal(s.tasks[0].actual,31);
});
test('same-day backfill orders page checkpoints by actual session end, not insertion order',()=>{
 let s=base(30);s.tasks[0].activity={kind:'reading',refId:'a',category:'other'};s=run(s,[entry({kind:'reading',refId:'a',page:149})]);s=applyCommand(s,{type:'task.record',payload:{id:'t',date:'2026-11-09',minutes:20,startedAt:'2026-11-09T08:00:00Z',endedAt:'2026-11-09T08:20:00Z'}},now,()=> 'early');s=run(s,[entry({id:'early-page',kind:'reading',refId:'a',page:120})],[],'early');assert.equal(bookProgress(s,'a').pages,149);
});

test('editing legacy reading notes preserves incremental pages until an explicit checkpoint is entered',()=>{
 let s=base(30);s.tasks[0].activity={kind:'reading',refId:'a',category:'other'};s.tasks[0].progress=100;s.life.entries=[entry({kind:'reading',refId:'a',taskId:'t',units:15,minutes:30,date:'2026-11-07'})];s=run(s,[{...s.life.entries[0],note:'Preserved pages'}],[],'');assert.equal(s.life.entries[0].units,15);assert.equal(bookProgress(s,'a').pages,15);assert.equal(s.tasks[0].actual,30);
});
