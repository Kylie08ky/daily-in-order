import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {learningInvestment,learningModules,learningRange} from '../lib/learning-overview.ts';
import {germanRecords} from '../lib/german-metrics.ts';
const now=new Date('2026-11-08T12:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function base(){let s=emptyState();for(const [id,name,mode] of [['news','News','practice'],['video','A1 videos','course']])s=run(s,'life.save',{table:'courses',record:{id,name,mode,category:'listening',total:mode==='course'?64:null,initial:mode==='course'?4:0,weeklyMinutes:120,targetMinutes:1200}});return run(s,'life.learning.module',{previous:'listening',category:'listening',weeklyMinutes:360});}
function recorded(s,id,refId,date,minutes){s=run(s,'task.save',{id,task:{title:id,date,minutes:60,activity:{kind:'german',refId,category:'listening'}}});return run(s,'task.record',{id,date,minutes});}
test('modules sum child actual time with independent weekly and quantity goals',()=>{
 let s=recorded(base(),'news-t','news','2026-11-08',30);s=recorded(s,'video-t','video','2026-11-08',45);
 const data=learningInvestment(s,'2026-11-02','2026-11-08'),group=learningModules(s,data)[0];
 assert.equal(group.minutes,75);assert.equal(group.weeklyMinutes,360);assert.equal(group.items.reduce((n,x)=>n+x.minutes,0),75);
 assert.equal(germanRecords(s,'video').units,0);assert.equal(s.life.courses.find(c=>c.id==='video').initial,4);
 s=run(s,'life.save',{table:'entries',record:{id:'video-log',kind:'german',refId:'video',taskId:'video-t',date:'2026-11-08',minutes:45,units:2}});
 assert.equal(learningInvestment(s,'2026-11-02','2026-11-08').total,75);assert.equal(germanRecords(s,'video').units,2);
 assert.equal(s.life.courses.find(c=>c.id==='video').total,64);
});
test('week month and all use dated actuals; correcting sessions recalculates module totals',()=>{
 let s=recorded(base(),'old','news','2026-10-31',60);s=recorded(s,'earlier','news','2026-11-01',40);s=recorded(s,'current','news','2026-11-08',30);
 const amount=p=>{const r=learningRange('2026-11-08',p,'monday');return learningModules(s,learningInvestment(s,r.from,r.to))[0].minutes;};
 assert.equal(amount('week'),30);assert.equal(amount('month'),70);assert.equal(amount('all'),130);
 const id=s.sessions.find(x=>x.taskId==='current').id;
 s=run(s,'session.update',{id,date:'2026-11-08',spans:[],untimedSeconds:20*60,note:''});assert.equal(amount('week'),20);
 s=run(s,'session.delete',{id});assert.equal(amount('week'),0);assert.equal(amount('all'),100);
 s=run(s,'session.restore',{id});assert.equal(amount('week'),20);
});
test('module rename preserves children and records; empty custom modules and old backups work',()=>{
 let s=recorded(base(),'t','news','2026-11-08',30),before=structuredClone(s.sessions);
 s=run(s,'life.learning.module',{previous:'listening',category:'Language input',weeklyMinutes:300});
 assert.equal(s.life.courses[0].category,'Language input');assert.equal(s.tasks[0].activity.category,'Language input');assert.deepEqual(s.sessions,before);
 assert.equal(learningModules(s,learningInvestment(s,'2000-01-01','2100-01-01'))[0].minutes,30);
 s=run(s,'life.learning.module',{category:'Speaking',weeklyMinutes:120});assert.equal(learningModules(s,learningInvestment(s,'2000-01-01','2100-01-01'))[1].items.length,0);
 assert.throws(()=>run(s,'life.learning.module',{previous:'Speaking',category:'Language input',weeklyMinutes:120}));
 assert.throws(()=>run(s,'life.learning.module',{category:'__proto__',weeklyMinutes:0}));
 const legacy=JSON.parse(JSON.stringify(s));delete legacy.life.preferences.learningModuleWeekly;for(const c of legacy.life.courses){delete c.weeklyMinutes;delete c.targetMinutes;}
 const restored=validateState(legacy);assert.deepEqual(restored.life.preferences.learningModuleWeekly,{});assert.equal(restored.life.courses[0].weeklyMinutes,0);assert.equal(learningInvestment(restored,'2000-01-01','2100-01-01').total,30);
});

