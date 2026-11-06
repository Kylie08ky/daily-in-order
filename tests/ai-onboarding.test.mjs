import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,projectSchema} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {parseAIPlan,prepareQuickBatch,plannerPrompt} from '../lib/quick-capture.ts';
const now=new Date('2026-11-06T12:00:00Z');
const raw={projects:[{key:'photo',name:'学习摄影',note:'练习构图',start:'',deadline:''}],tasks:[{title:'练习构图',projectKey:'photo',date:'2026-11-07',start:'19:00',minutes:30},{title:'整理作品',projectKey:'photo',date:'',start:'',minutes:0}],notes:'请确认'};
const plan=()=>parseAIPlan(JSON.stringify(raw));
const ids=()=>{let n=0;return ()=>`synthetic-${++n}`;};
const commit=(s,b)=>applyCommand(s,{type:'quick.add',payload:{...b,firstLogin:true}},now);
const undo=(s,tasks=s.tasks,projects=s.projects)=>applyCommand(s,{type:'quick.undo',payload:{tasks,projects}},now);

test('AI projects have only draft references; questions and project-only drafts are valid',()=>{
 const parsed=parseAIPlan(JSON.stringify({...raw,projects:[{...raw.projects[0],id:'real-secret',goals:[{current:100}],status:'completed'}],tasks:[{...raw.tasks[0],id:'task-secret',projectId:'real-secret',actual:100,progress:100}]}));
 assert.equal(parsed.projects[0].id,undefined);assert.equal(parsed.projects[0].status,undefined);assert.equal(parsed.tasks[0].projectId,undefined);assert.equal(parsed.tasks[0].progress,undefined);
 assert.equal(parseAIPlan('{"notes":"你想学什么？"}').tasks.length,0);
 assert.equal(parseAIPlan(JSON.stringify({...raw,tasks:[]})).projects.length,1);
 assert.throws(()=>parseAIPlan('{}'));
 assert.throws(()=>parseAIPlan(JSON.stringify({...raw,tasks:[{...raw.tasks[0],projectKey:'missing'}]})));
 assert.throws(()=>parseAIPlan(JSON.stringify({...raw,projects:[raw.projects[0],raw.projects[0]]})));
 assert.throws(()=>parseAIPlan(JSON.stringify({...raw,projects:[{...raw.projects[0],start:'2026-12-01',deadline:'2026-11-01'}]})));
});

test('one confirmation atomically creates linked projects, tasks and optional schedules',()=>{
 const original=emptyState(),batch=prepareQuickBatch(original,plan(),ids()),saved=commit(original,batch);
 assert.equal(original.projects.length,0);assert.equal(original.tasks.length,0);
 assert.equal(saved.projects.length,1);assert.equal(saved.tasks.length,2);assert.equal(saved.onboarding,'completed');
 assert.equal(saved.tasks[0].projectId,saved.projects[0].id);assert.equal(saved.tasks[0].start,'19:00');assert.equal(saved.tasks[1].date,'');
 assert.equal(saved.tasks[0].actual,null);assert.equal(saved.tasks[0].progress,0);assert.equal(saved.sessions.length,0);
 assert.deepEqual(saved.settings,original.settings);assert.deepEqual(saved.life,original.life);
 const bad={...batch,items:[batch.items[0],{...batch.items[1],start:'23:30',date:'2026-11-07',minutes:60}]};
 assert.throws(()=>commit(original,bad));assert.equal(original.projects.length,0);
 assert.throws(()=>commit(saved,batch));
 const projectOnly=commit(emptyState(),prepareQuickBatch(emptyState(),{...plan(),tasks:[]},ids()));assert.equal(projectOnly.projects.length,1);assert.equal(projectOnly.tasks.length,0);
});

test('returning users reuse a single active name locally without overwriting or undoing it',()=>{
 const base=emptyState();base.onboarding='completed';base.projects.push(projectSchema.parse({id:'existing',name:'学习摄影',note:'KEEP ME',goals:[{id:'goal',title:'Original',current:2,target:10,unit:'次'}]}));
 const batch=prepareQuickBatch(base,plan(),ids());assert.equal(batch.projects.length,0);assert.equal(batch.items[0].projectId,'existing');
 const saved=commit(base,batch);assert.deepEqual(saved.projects,base.projects);
 const reverted=undo(saved,saved.tasks,[]);assert.deepEqual(reverted.projects,base.projects);assert.ok(reverted.tasks.every(t=>t.deletedAt));
 const archived=structuredClone(base);archived.projects[0].status='archived';assert.throws(()=>prepareQuickBatch(archived,plan(),ids()),/同名/);
 const ambiguous=structuredClone(base);ambiguous.projects.push({...base.projects[0],id:'other'});assert.throws(()=>prepareQuickBatch(ambiguous,plan(),ids()),/同名/);
});

test('undo protects changed projects, new links and started tasks; untouched batch can be restored',()=>{
 const saved=commit(emptyState(),prepareQuickBatch(emptyState(),plan(),ids()));
 const reverted=undo(saved);assert.ok(reverted.projects[0].deletedAt);assert.ok(reverted.tasks.every(t=>t.deletedAt));
 const restored=applyCommand(reverted,{type:'project.restore',payload:{id:saved.projects[0].id}},now);assert.equal(restored.projects[0].deletedAt,null);assert.ok(restored.tasks.every(t=>!t.deletedAt));
 const changed=structuredClone(saved);changed.projects[0].note='later change';assert.throws(()=>undo(changed,saved.tasks,saved.projects),/项目已有/);
 const linked=structuredClone(saved);linked.life.books.push({projectId:saved.projects[0].id});assert.throws(()=>undo(linked,saved.tasks,saved.projects),/项目已有/);
 const extra=applyCommand(saved,{type:'quick.add',payload:{items:[{id:'extra',title:'New',date:'',start:'',minutes:0,projectId:saved.projects[0].id}]}},now);assert.throws(()=>undo(extra,saved.tasks,saved.projects),/项目已有/);
 const focused=applyCommand(saved,{type:'focus.start',payload:{taskId:saved.tasks[0].id}},now);assert.throws(()=>undo(focused,saved.tasks,saved.projects),/开始专注/);
});

test('follow-up prompt carries bounded conversation and reviewed draft, strips real IDs',()=>{
 const prompt=plannerPrompt('只安排到明晚','', 'zh',[{...raw.tasks[0],projectId:'NEVER_SEND'}],[{...raw.projects[0],id:'NEVER_SEND'}],'2026-11-06',[{role:'user',text:'我想学摄影'},{role:'assistant',text:'你什么时候有空？'}]);
 assert.match(prompt,/我想学摄影/);assert.match(prompt,/你什么时候有空/);assert.match(prompt,/2026-11-06/);assert.doesNotMatch(prompt,/NEVER_SEND/);
 const long=Array.from({length:10},(_,i)=>({role:'user',text:'turn'+i}));const short=plannerPrompt('next','2026-11-06','en',[],[],'2026-11-06',long);assert.doesNotMatch(short,/turn0/);assert.match(short,/turn9/);
});
