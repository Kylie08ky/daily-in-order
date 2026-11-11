import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {concreteOutcomes} from '../lib/development-projects.ts';
import {readingPositions} from '../lib/reading-progress.ts';
import {bookProgress,activityStats} from '../lib/life-metrics.ts';
import {investmentByTask} from '../lib/task-investment.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-11T12:00:00Z'),run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function fixture(){let s=run(emptyState(),'project.save',{id:'dev',project:{name:'Development'},modules:[]});s=run(s,'task.save',{id:'task',task:{title:'Shared effort',projectId:'dev',date:'2026-11-06',minutes:120}});s=run(s,'task.record',{id:'task',date:'2026-11-06',minutes:120});return s;}
function protectedData(s){return {tasks:s.tasks.map(({outcomes,recordType,...t})=>t),sessions:s.sessions,investment:[...investmentByTask(s)].map(([k,v])=>[k,[...v]]),focus:s.focus};}
const outcome=(id,child='')=>({id,date:'2026-11-06',projectId:'dev',developmentId:child,version:'v0.5',status:'milestone',result:'Synthetic result',next:'Next step'});
const saveOutcomes=(s,outcomes)=>run(s,'activity.progress',{taskId:'task',date:'2026-11-06',recordType:'project',entries:[],outcomes});
test('120 minutes shared by three concrete projects; bidirectional edit, rename and pause keep original time',()=>{
 let s=fixture(),before=protectedData(s);
 for(const id of ['alpha','beta','gamma'])s=run(s,'development.save',{id,projectId:'dev',name:id});
 s=saveOutcomes(s,['alpha','beta','gamma'].map(id=>outcome('o-'+id,id)));
 for(const id of ['alpha','beta','gamma'])assert.equal(concreteOutcomes(s,'dev',id).length,1);
 assert.deepEqual(protectedData(s),before);assert.equal(s.tasks[0].actual,120);assert.equal(s.tasks.length,1);
 const original=concreteOutcomes(s,'dev','beta')[0];
 s=saveOutcomes(s,s.tasks[0].outcomes.map(o=>o.id===original.outcome.id?{...o,version:'v0.6',result:'Edited from detail'}:o));
 s=saveOutcomes(decodeState(encodeState(s)),s.tasks[0].outcomes);
 assert.equal(s.tasks[0].outcomes.length,3);assert.equal(concreteOutcomes(s,'dev','beta')[0].outcome.version,'v0.6');
 for(const status of ['paused','ended','ongoing']){s=run(s,'development.save',{id:'beta',projectId:'dev',name:'Renamed project',status});assert.equal(concreteOutcomes(s,'dev','beta')[0].outcome.id,original.outcome.id);}
 assert.deepEqual(protectedData(s),before);assert.equal(s.projects[0].status,'active');assert.equal(s.developmentProjects[0].status,'ongoing');
});
test('legacy outcomes remain unassigned until explicit association; invalid associations reject atomically',()=>{
 let s=saveOutcomes(fixture(),[outcome('old')]);const before=protectedData(s),date=s.tasks[0].outcomes[0].date;
 assert.equal(concreteOutcomes(s,'dev','').length,1);
 s=run(s,'development.save',{id:'alpha',projectId:'dev',name:'Demo'});
 assert.throws(()=>saveOutcomes(s,[outcome('old','missing')]));
 s=saveOutcomes(s,[{...s.tasks[0].outcomes[0],developmentId:'alpha',date:'2026-11-11'}]);
 assert.equal(s.tasks[0].outcomes[0].date,date);assert.equal(concreteOutcomes(s,'dev','').length,0);assert.deepEqual(protectedData(s),before);
 assert.throws(()=>run(s,'development.save',{id:'other',projectId:'dev',name:'Demo'}));
 assert.throws(()=>validateState({...s,developmentProjects:[]}));
});
test('legacy schema 11 upgrades without matching names or adding concrete projects',()=>{
 const old=fixture();old.schemaVersion=11;delete old.developmentProjects;
 const next=decodeState([JSON.stringify(old)]);assert.equal(next.schemaVersion,13);assert.deepEqual(next.developmentProjects,[]);assert.deepEqual(next.tasks,old.tasks);assert.deepEqual(next.sessions,old.sessions);
});
test('97 and 149 are per-record checkpoints; edits preserve exact tasks, dates, sessions and daily totals',()=>{
 let s=run(emptyState(),'life.save',{table:'books',record:{id:'book',title:'Synthetic book',total:258,initial:149}});
 for(const [id,date,minutes] of [['old','2026-11-06',20],['new','2026-11-08',30],['unknown','2026-11-09',10]])s=run(s,'life.save',{table:'entries',record:{id,kind:'reading',refId:'book',date,minutes,note:'Keep original'}});
 const before=protectedData(s),entries=structuredClone(s.life.entries),beforeStats=['2026-11-06','2026-11-08','2026-11-09'].map(d=>activityStats(s,'reading','book',d,d).minutes);
 for(const [id,page] of [['new',149],['old',97],['old',97]])s=run(s,'reading.checkpoint',{id,page});
 assert.deepEqual(protectedData(s),before);assert.equal(bookProgress(s,'book').pages,149);
 for(const e of s.life.entries){const {page,...rest}=e;assert.deepEqual(rest,entries.find(x=>x.id===e.id));}
 assert.deepEqual(['2026-11-06','2026-11-08','2026-11-09'].map(d=>activityStats(s,'reading','book',d,d).minutes),beforeStats);
 const points=readingPositions(s,s.life.entries);assert.equal(points.get('old').page,97);assert.equal(points.get('new').page,149);assert.equal(points.get('unknown').page,undefined);assert.equal(points.get('new').units,0);
 s=run(s,'reading.checkpoint',{id:'unknown',page:160});assert.equal(bookProgress(s,'book').pages,160);
 s=run(s,'reading.checkpoint',{id:'old',page:95});assert.equal(bookProgress(s,'book').pages,160);assert.equal(s.life.entries.find(e=>e.id==='new').page,149);
 assert.throws(()=>run(s,'reading.checkpoint',{id:'old',page:259}));assert.deepEqual(protectedData(s),before);
});
test('explicit start/end calculate pages, missing page stays unknown, clearing retains underlying effort',()=>{
 let s=run(emptyState(),'life.save',{table:'books',record:{id:'book',title:'Demo',total:258}});
 s=run(s,'life.save',{table:'entries',record:{id:'entry',kind:'reading',refId:'book',date:'2026-11-06',minutes:20}});
 const before=protectedData(s);s=run(s,'reading.checkpoint',{id:'entry',page:97,startPage:80});assert.equal(activityStats(s,'reading').units,17);
 s=run(s,'reading.checkpoint',{id:'entry',page:null,startPage:null});assert.equal(readingPositions(s,s.life.entries).get('entry').page,undefined);assert.deepEqual(protectedData(s),before);
});
