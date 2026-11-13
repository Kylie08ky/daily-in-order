import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,taskInput} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {parseAIPlan,plannerPrompt} from '../lib/quick-capture.ts';
import {aiReviewToken,selectedPlanningContext} from '../lib/ai-plan-apply.ts';
import {remainingMinutes,currentEstimate} from '../lib/task-plans.ts';
const at=new Date('2026-11-13T12:00Z');
const draft=x=>parseAIPlan(JSON.stringify(x));
const command=(s,plan,taskId='')=>({type:'ai.plan.apply',payload:{id:'batch-one',plan,taskId,expected:aiReviewToken(s,plan,taskId)}});
const execute=(s,c)=>applyCommand(s,c,at);
const project={key:'p',name:'Synthetic learning'};
const baseTask={title:'Build a portfolio',projectKey:'p',date:'',start:'',minutes:360};
test('AI month/week + one finite multi-day task remain plans, not actual time',()=>{
 const p=draft({projects:[project],tasks:[{...baseTask,plans:[{date:'2026-11-14',minutes:120},{date:'2026-11-20',minutes:240}]}],planning:{monthly:[{projectKey:'p',month:'2026-11',minutes:720}]}}),base=emptyState(),c=command(base,p),s=execute(base,c);
 assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].plans.length,2);assert.equal(s.tasks[0].plans[0].start,'');assert.equal(s.tasks[0].actual,null);assert.equal(s.sessions.length,0);
 assert.equal(Object.values(s.monthlyPlans[0].goals[0].weeks).reduce((a,b)=>a+b,0),720);assert.equal(base.projects.length,0);assert.deepEqual(execute(s,c),s);
});
test('resident learning paths reuse original entries; quantity is target only',()=>{
 const p=draft({projects:[project],tasks:[{...baseTask,title:'Podcast',minutes:30,kind:'long-term',learningKey:'l'}],planning:{modules:[{category:'Listening',weeklyMinutes:180}],learning:[{key:'l',projectKey:'p',category:'Listening',name:'A1',total:64,unit:'videos'}]}}),base=emptyState();let s=execute(base,command(base,p));
 assert.equal(s.tasks.length,0);assert.equal(s.templates.length,1);assert.equal(s.life.courses[0].initial,0);assert.equal(s.life.courses[0].total,64);assert.equal(s.life.entries.length,0);
 const course=s.life.courses[0];course.initial=4;
 const second=draft({...p,tasks:[{...p.tasks[0],date:'2026-11-14'}]});const c=command(s,second);c.payload.id='batch-two';s=execute(s,c);
 assert.equal(s.templates.length,1);assert.equal(s.life.courses.length,1);assert.equal(s.life.courses[0].initial,4);assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].sourceTemplateId,s.templates[0].id);assert.equal(s.tasks[0].activity.refId,course.id);
 const repeat=command(s,second);repeat.payload.id='batch-three';assert.throws(()=>execute(s,repeat),/当天已有/);
});
test('existing remaining estimate replacement preserves every historical field and stale review fails',()=>{
 let base=applyCommand(emptyState(),{type:'task.save',payload:{id:'t',task:taskInput.parse({title:'Original',date:'2026-11-11',minutes:120,note:'private note'})}},at);
 base=applyCommand(base,{type:'task.record',payload:{id:'t',date:'2026-11-11',minutes:62,note:'original session',progress:30}},at);
 const p=draft({planning:{remaining:{minutes:150,plans:[{date:'2026-11-14',minutes:60}]}}}),c=command(base,p,'t'),s=execute(base,c);
 assert.equal(currentEstimate(s.tasks[0]),212);assert.equal(remainingMinutes(s.tasks[0]),150);assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].actual,62);assert.equal(s.tasks[0].date,'2026-11-11');assert.equal(s.tasks[0].progress,30);assert.equal(s.tasks[0].note,'private note');assert.deepEqual(s.sessions,base.sessions);assert.deepEqual(s.life.entries,base.life.entries);assert.deepEqual(execute(s,c),s);
 const changed=structuredClone(base);changed.tasks[0].actual=63;assert.throws(()=>execute(changed,c),/计划已变化/);
 const context=selectedPlanningContext(base,'t');assert.equal(context.note,undefined);assert.equal(context.id,undefined);
});
test('invalid last action leaves projects and monthly targets unchanged, no partial application',()=>{
 const s=emptyState(),p=draft({projects:[project],tasks:[baseTask],planning:{monthly:[{projectKey:'p',month:'2026-11',minutes:60,weeks:{'2026-11-02':120}}]}});
 assert.throws(()=>execute(s,command(s,p)));assert.equal(s.projects.length,0);assert.equal(s.tasks.length,0);assert.equal(s.monthlyPlans.length,0);
 const missing=draft({planning:{remaining:{minutes:10,plans:[]}}});assert.throws(()=>execute(s,command(s,missing)),/选择/);
});
test('overallocated remaining and malformed learning links are rejected, actual records untouched',()=>{
 let s=applyCommand(emptyState(),{type:'task.save',payload:{id:'t',task:{title:'Original',minutes:120,actual:62}}},at);
 const p=draft({planning:{remaining:{minutes:30,plans:[{date:'2026-11-14',minutes:60}]}}});assert.throws(()=>execute(s,command(s,p,'t')),/超出/);assert.equal(s.tasks[0].actual,62);
 const wrong=draft({tasks:[{...baseTask,projectKey:'',learningKey:'missing'}]});assert.throws(()=>execute(s,command(s,wrong)),/学习子项/);
});
test('custom weeks and learning module targets can be reviewed without changing old actuals',()=>{
 const p=draft({projects:[project],planning:{monthly:[{projectKey:'p',month:'2026-11',minutes:180,weeks:{'2026-11-02':60,'2026-11-09':120}}],modules:[{category:'Speaking',weeklyMinutes:540}]}}),s=execute(emptyState(),command(emptyState(),p));
 assert.equal(s.monthlyPlans[0].goals[0].weeks['2026-11-09'],120);assert.equal(s.life.preferences.learningModuleWeekly.Speaking,540);assert.equal(s.tasks.length,0);
 const prompt=plannerPrompt('plan','2026-11-13','en',[],[],'2026-11-13',[],p.planning,{existingTask:{title:'Selected',remainingMinutes:60}});assert.match(prompt,/REPLACEMENT/);assert.match(prompt,/NEVER requires start/);
});
