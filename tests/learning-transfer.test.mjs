import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,taskSchema,validateState} from '../lib/model.ts';
import {courseSchema,entrySchema} from '../lib/life-schema.ts';
import {applyCommand} from '../lib/commands.ts';
import {previewTransfer,learningRows} from '../lib/learning-transfer.ts';
import {learningInvestment} from '../lib/learning-overview.ts';
import {germanRecords} from '../lib/german-metrics.ts';
import {workoutSchema} from '../lib/life-schema.ts';
const now=new Date('2026-11-08T12:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function fixture(){
 const s=emptyState();s.onboarding='completed';s.life.preferences.learningModuleWeekly={listening:360,speaking:540,vocabulary:300};
 for(const [id,category,mode] of [['old-listening','listening','practice'],['old-speaking','speaking','practice'],['news','listening','practice'],['podcast','listening','practice'],['commute','listening','practice'],['a1','speaking','course'],['topic','speaking','practice'],['shadow','speaking','practice'],['translate','speaking','practice'],['words','vocabulary','practice']])s.life.courses.push(courseSchema.parse({id,name:id,category,mode,total:mode==='course'?64:null,initial:mode==='course'?4:0}));
 // Synthetic acceptance fixture: 25 existing A1 minutes + only 70 to transfer.
 for(const [id,owner,minutes,weekly] of [['news','old-listening',180,60],['podcast','old-listening',75,30],['commute','old-listening',60,0],['eg-old','old-listening',70,20],['eg-existing','a1',25,25],['topic','old-speaking',105,30],['shadow','old-speaking',60,30],['translate','old-speaking',15,15],['words','words',463,53]]){
  const c=s.life.courses.find(c=>c.id===owner),t=taskSchema.parse({id,title:id,activity:{kind:'german',refId:owner,category:c.category},actual:minutes,minutes:120,progress:50,progressSource:'manual',date:'2026-10-29',createdAt:now.toISOString(),note:'original note'});s.tasks.push(t);
  for(const [suffix,date,m] of [['old','2026-10-29',minutes-weekly],['week','2026-11-06',weekly]])if(m)s.sessions.push({id:id+'-'+suffix,taskId:id,date,seconds:m*60,growth:m,endedAt:date+'T18:00:00Z',note:'original session',source:'focus'});
  s.life.entries.push(entrySchema.parse({id:'log-'+id,taskId:id,kind:'german',refId:owner,date:'2026-10-29',minutes,units:0,note:'original outcome'}));
 }
 s.tasks.push(taskSchema.parse({id:'missing',title:'unknown actual',date:'2026-11-06',minutes:180,actual:null,activity:{kind:'german',refId:'old-listening',category:'listening'},createdAt:now.toISOString()}));
 return validateState(s);
}
function transfer(s,ids,toId,id='batch-'+toId){const keys=ids.map(x=>({kind:'task',id:x})),p=previewTransfer(s,keys,toId);return run(s,'learning.transfer',{keys,toId,token:p.token,id});}
const total=(s,from='0000-01-01',to='9999-12-31')=>learningInvestment(s,from,to);
const exceptActivity=t=>{const {activity,...rest}=t;return rest;};
test('acceptance totals, dates, quantities and original entities are preserved across migration and undo',()=>{
 let s=fixture(),before=structuredClone(s);assert.equal(total(s).total,1053);assert.equal(total(s,'2026-11-02','2026-11-08').total,263);
 for(const [id,target] of [['news','news'],['podcast','podcast'],['commute','commute'],['eg-old','a1'],['topic','topic'],['shadow','shadow'],['translate','translate']])s=transfer(s,[id],target);
 const result=total(s);assert.deepEqual(Object.fromEntries(result.categories.map(x=>[x.key,x.minutes])),{listening:315,speaking:275,vocabulary:463});
 for(const [id,minutes] of [['news',180],['podcast',75],['commute',60],['a1',95],['topic',105],['shadow',60],['translate',15],['words',463]])assert.equal(result.items.find(x=>x.id===id).minutes,minutes);
 assert.equal(result.total,1053);assert.equal(total(s,'2026-11-02','2026-11-08').total,263);
 assert.deepEqual(s.tasks.map(exceptActivity),before.tasks.map(exceptActivity));assert.deepEqual(s.sessions,before.sessions);assert.deepEqual(s.life.entries,before.life.entries);assert.deepEqual(s.life.courses,before.life.courses);assert.deepEqual(s.life.preferences,before.life.preferences);
 assert.equal(s.life.courses.find(c=>c.id==='a1').initial+germanRecords(s,'a1').units,4);assert.equal(s.tasks.find(t=>t.id==='missing').actual,null);
 assert.equal(learningRows(s).find(x=>x.id==='eg-old').owner,'a1');
 for(const batch of [...s.learningTransfers].reverse())s=run(s,'learning.undo',{id:batch.id});assert.deepEqual(s.tasks,before.tasks);assert.deepEqual(s.sessions,before.sessions);assert.equal(total(s).total,1053);
});
test('stale preview, invalid target and invalid selection fail atomically; undo rejects newer ownership',()=>{
 const s=fixture(),keys=[{kind:'task',id:'eg-old'},{kind:'task',id:'news'}],p=previewTransfer(s,keys,'a1');
 const edited=structuredClone(s);edited.sessions[0].note='edited';assert.throws(()=>run(edited,'learning.transfer',{keys,toId:'a1',token:p.token}));assert.deepEqual(s,fixture());
 assert.throws(()=>previewTransfer(s,[...keys,{kind:'task',id:'missing-id'}],'a1'));assert.throws(()=>previewTransfer(s,keys,'invalid'));
 let next=transfer(s,['eg-old'],'a1','first');next=transfer(next,['eg-old'],'news','second');assert.throws(()=>run(next,'learning.undo',{id:'first'}));next=run(next,'learning.undo',{id:'second'});next=run(next,'learning.undo',{id:'first'});assert.deepEqual(next.tasks,s.tasks);
});
test('linked entry resolves to original task; standalone time ownership does not move quantity',()=>{
 let s=fixture();const keys=[{kind:'entry',id:'log-eg-old'},{kind:'task',id:'eg-old'}],p=previewTransfer(s,keys,'a1');assert.equal(p.keys.length,1);assert.equal(p.minutes,70);s=run(s,'learning.transfer',{keys,toId:'a1',token:p.token});assert.equal(total(s).items.find(x=>x.id==='a1').minutes,95);
 s.life.entries.push(entrySchema.parse({id:'standalone',kind:'german',refId:'a1',date:'2026-11-06',minutes:10,units:2}));const before=structuredClone(s.life.entries.at(-1));const keys2=[{kind:'entry',id:'standalone'}],p2=previewTransfer(s,keys2,'news');s=run(s,'learning.transfer',{keys:keys2,toId:'news',token:p2.token});
 assert.deepEqual({...s.life.entries.at(-1),timeRefId:undefined},{...before,timeRefId:undefined});assert.equal(germanRecords(s,'a1').units,2);assert.equal(germanRecords(s,'news').units,0);assert.equal(total(s).total,1063);
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.life.entries.at(-1).timeRefId,'news');assert.equal(restored.learningTransfers.length,2);
});
test('series and templates preserve rules and only propagate to unstarted tasks, no materialization',()=>{
 let s=fixture();const template=structuredClone(s.tasks[0]);s.templates.push({id:'template',task:template});s.series.push({id:'series',from:'2026-01-01',rule:{frequency:'daily',days:[],until:''},template,active:true});
 s.tasks[0].seriesId='series';s.tasks[0].occurrence='2026-10-29';s.tasks.push(taskSchema.parse({...template,id:'future',seriesId:'series',occurrence:'2026-11-09',date:'2026-11-09',actual:null,progress:0}));s=validateState(s);const count=s.tasks.length,oldRules=structuredClone(s.series[0].rule),oldSessions=structuredClone(s.sessions);
 const keys=[{kind:'series',id:'series'},{kind:'template',id:'template'}],p=previewTransfer(s,keys,'a1');s=run(s,'learning.transfer',{keys,toId:'a1',token:p.token});assert.equal(s.tasks.length,count);assert.equal(s.tasks[0].activity.refId,'old-listening');assert.equal(s.tasks.at(-1).activity.refId,'a1');assert.equal(s.series[0].template.activity.refId,'a1');assert.equal(s.templates[0].task.activity.refId,'a1');assert.deepEqual(s.series[0].rule,oldRules);assert.deepEqual(s.sessions,oldSessions);
});
test('explicit ownership wins over mapping and project fallback, no planned time credited; hide requires empty',()=>{
 let s=fixture();assert.throws(()=>run(s,'learning.hide',{id:'old-listening',hidden:true}));
 s.projects.push({id:'p',name:'P',note:'',color:'#a7bb91',start:'',deadline:'',status:'active',goals:[],order:0,deletedAt:null});s.modules.push({id:'m',projectId:'p',name:'Module',order:0});s.life.courses.find(c=>c.id==='old-listening').projectId='p';s.life.courses.find(c=>c.id==='old-listening').includeProject=true;s.life.courses.find(c=>c.id==='news').projectId='p';s.life.courses.find(c=>c.id==='news').moduleIds=['m'];s.tasks.find(t=>t.id==='missing').activity=null;Object.assign(s.tasks.find(t=>t.id==='missing'),{projectId:'p',moduleId:'m'});
 assert.equal(learningRows(s).find(x=>x.id==='missing').owner,'news');s=transfer(s,['missing'],'a1');assert.equal(learningRows(s).find(x=>x.id==='missing').owner,'a1');assert.equal(total(s).total,1053);assert.equal(s.tasks.find(t=>t.id==='missing').actual,null);
 s=run(s,'learning.hide',{id:'shadow',hidden:true});assert.equal(s.life.courses.find(c=>c.id==='shadow').hidden,true);assert.throws(()=>previewTransfer(s,[{kind:'task',id:'eg-old'}],'shadow'));s=run(s,'learning.hide',{id:'shadow',hidden:false});assert.equal(s.life.courses.find(c=>c.id==='shadow').hidden,false);
});
test('a learning log attached to fitness can move without stealing fitness ownership or duplicating time',()=>{
 let s=fixture();s.life.workouts.push(workoutSchema.parse({id:'walk',name:'Walk'}));s.tasks[0].activity={kind:'fitness',refId:'walk',category:'other'};
 const before=structuredClone(s.tasks[0]),keys=[{kind:'entry',id:'log-news'}],p=previewTransfer(s,keys,'a1');assert.equal(p.minutes,180);s=run(s,'learning.transfer',{keys,toId:'a1',token:p.token});assert.deepEqual(s.tasks[0],before);assert.equal(s.life.entries[0].refId,'old-listening');assert.equal(s.life.entries[0].timeRefId,'a1');assert.equal(total(s).total,1053);assert.equal(total(s).items.find(x=>x.id==='a1').minutes,205);
});
test('cross-midnight focus spans retain exact dates and seconds through assignment and undo',()=>{
 let s=fixture();const t=s.tasks.find(t=>t.id==='eg-old');t.actual=30;s.sessions=s.sessions.filter(x=>x.taskId!==t.id);s.sessions.push({id:'midnight',taskId:t.id,date:'2026-11-02',seconds:1800,growth:30,endedAt:'2026-11-01T23:15:00.000Z',spans:[{startedAt:'2026-11-01T22:45:00.000Z',endedAt:'2026-11-01T23:15:00.000Z'}]});
 const before=structuredClone(s),amount=total(s,'2026-11-02','2026-11-08').total;s=transfer(s,['eg-old'],'a1');assert.equal(total(s,'2026-11-02','2026-11-08').total,amount);assert.deepEqual(s.sessions,before.sessions);s=run(s,'learning.undo',{id:'batch-a1'});assert.deepEqual(s.tasks,before.tasks);assert.deepEqual(s.sessions,before.sessions);
});

test('schema 7 upgrades without losing records; schema 9 retains transfer history and rejects future formats',()=>{
 const old=fixture();old.schemaVersion=7;const upgraded=validateState(old);assert.equal(upgraded.schemaVersion,9);assert.deepEqual(upgraded.tasks,old.tasks);
 const next=transfer(upgraded,['eg-old'],'a1');assert.deepEqual(validateState(JSON.parse(JSON.stringify(next))),next);assert.throws(()=>validateState({...next,schemaVersion:10}));
});
