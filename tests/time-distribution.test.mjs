import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,taskSchema,projectSchema,liveTasks} from '../lib/model.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {timeDistribution} from '../lib/time-distribution.ts';
const task=(id,extra={})=>taskSchema.parse({id,title:'Unrelated title',date:'2026-11-01',createdAt:'2026-11-01T10:00:00Z',...extra});
test('six top-level categories aggregate learning subtypes and preserve unknown actual effort',()=>{
 const classifications=[{domain:'language'},...['personal','skills','professional'].map(study=>({domain:'learning',study})),...['reading','fitness','work','life'].map(domain=>({domain})),undefined];
 const rows=classifications.map((classification,i)=>({task:task(String(i),{classification,actual:10}),minutes:10}));
 const a=timeDistribution(rows,[],'classification'),b=timeDistribution(rows,[],'project');
 assert.equal(a.rows.length,7);assert.equal(a.rows.find(r=>r.id==='learning').value,30);assert.equal(a.rows.find(r=>r.id==='unclassified').value,10);assert.equal(a.total,90);assert.equal(b.total,a.total);
});
test('actual-date ledger includes partial effort, excludes plans and avoids task/session double counting',()=>{
 const s=emptyState();s.tasks=[task('cross',{actual:105,projectId:'archived',classification:{domain:'language'},progress:50}),task('future',{estimate:500,date:'2026-12-01'}),task('manual',{actual:20,actualDate:'2026-11-14',projectId:'missing'})];
 s.sessions=[{id:'s1',taskId:'cross',date:'2026-11-07',seconds:3600,growth:0,endedAt:'2026-11-07T10:00:00Z'},{id:'s2',taskId:'cross',date:'2026-11-14',seconds:2700,growth:0,endedAt:'2026-11-14T10:00:00Z'}];
 s.projects=[projectSchema.parse({id:'archived',name:'Archived example',deletedAt:'2026-11-15T10:00:00Z'})];
 const before=structuredClone(s),ledger=investmentByTask(s),contributions=liveTasks(s).map(task=>({task,minutes:minutesInRange(ledger.get(task.id),'2026-11-09','2026-11-15')}));
 const a=timeDistribution(contributions,s.projects,'classification'),b=timeDistribution(contributions,s.projects,'project');
 assert.equal(a.total,65);assert.equal(a.rows.find(r=>r.id==='language').value,45);assert.equal(b.total,65);assert.equal(b.rows.find(r=>r.id==='archived').name,'Archived example');assert.equal(b.rows.find(r=>r.id==='missing').value,20);assert.deepEqual(s,before);
 const all=timeDistribution(liveTasks(s).map(task=>({task,minutes:minutesInRange(ledger.get(task.id),'2026-11-01','2026-11-30')})),s.projects,'classification');assert.equal(all.total,125);
});
test('empty, deleted, template and invalid contributions never enter distribution',()=>{
 const rows=[{task:task('deleted',{deletedAt:'2026-11-15T10:00:00Z'}),minutes:90},{task:task('template',{templateOnly:true}),minutes:100},{task:task('zero'),minutes:0},{task:task('nan'),minutes:NaN}];
 for(const mode of ['classification','project'])assert.deepEqual(timeDistribution(rows,[],mode),{rows:[],total:0});
});
