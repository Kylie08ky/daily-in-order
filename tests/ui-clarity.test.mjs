import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {planningMetrics,planSummary} from '../lib/task-plans.ts';

const now=new Date('2026-11-23T08:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
const summary=s=>planSummary(s.tasks[0],planningMetrics(s,s.tasks[0],'2026-11-23'));

test('the schedule headline summarises what is left and when, in plain cases',()=>{
 const pool=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic pool task',minutes:45}});
 assert.deepEqual([summary(pool).kind,summary(pool).remaining],['unscheduled',45]);
 const fixed=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic fixed',date:'2026-11-24',start:'09:00',minutes:60}});
 assert.deepEqual([summary(fixed).kind,summary(fixed).first,summary(fixed).start],['one','2026-11-24','09:00']);
 const flexible=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic flexible',date:'2026-11-24',minutes:60}});
 assert.deepEqual([summary(flexible).kind,summary(flexible).start],['one','']);
 let split=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic split',minutes:120}});
 for(const [planId,date] of [['a','2026-11-24'],['b','2026-11-26']])split=run(split,'task.plan.save',{id:'t',planId,date,start:'',minutes:60});
 assert.deepEqual([summary(split).kind,summary(split).count,summary(split).first,summary(split).last],['many',2,'2026-11-24','2026-11-26']);
 let partly=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic partly',minutes:120}});
 partly=run(partly,'task.plan.save',{id:'t',planId:'a',date:'2026-11-24',start:'',minutes:60});
 assert.deepEqual([summary(partly).kind,summary(partly).scheduled,summary(partly).unallocated],['partly',60,60]);
});

test('overdue, completed and fully spent tasks get their own headline',()=>{
 const late=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic late',date:'2026-11-20',minutes:30}},new Date('2026-11-19T08:00:00Z'));
 assert.deepEqual([summary(late).kind,summary(late).review],['overdue',1]);
 const done=run(run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic done',date:'2026-11-23',minutes:30}}),'task.progress',{id:'t',date:'2026-11-23',progress:100});
 assert.equal(summary(done).kind,'done');
 const spent=run(run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic spent',date:'2026-11-23',minutes:30}}),'task.record',{id:'t',date:'2026-11-23',minutes:30});
 assert.equal(summary(spent).kind,'none');
});

test('row buttons show their names; Log progress opens on "Log time" with advanced controls folded',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8'),rec=fs.readFileSync('app/task-record.tsx','utf8');
 for(const label of ['记进展','专注','排时间','编辑','明天做'])assert.ok(wb.includes('<span className="action-label" aria-hidden="true">{ui('+(label==='明天做'?"'明天做'":'"'+label+'"')+')}</span>'),label);
 assert.ok(rec.includes("(initialTab||(initialSessionId||progressRef||task.activity?'progress':'add'))"));
 const tabs=rec.slice(rec.indexOf('<div className="detail-tabs">'),rec.indexOf('</div>',rec.indexOf('<div className="detail-tabs">')));
 assert.deepEqual([...tabs.matchAll(/setTab\('(\w+)'\)/g)].map(m=>m[1]),['add','progress','plans','history']);
 const adv=rec.indexOf("ui('高级：关联到某一次投入、修正累计用时')"),scope=rec.indexOf("ui('关联哪一次投入')");assert.ok(adv>0&&adv<scope);
});

test('schedule page leads with one sentence and folds the six figures; focus offers duration shortcuts',()=>{
 const plan=fs.readFileSync('app/task-plan-editor.tsx','utf8'),focus=fs.readFileSync('app/focus-panel.tsx','utf8');
 const head=plan.indexOf('<p className="task-plans-headline">{planHeadline(task,metrics)}</p>'),numbers=plan.indexOf("<details className=\"task-plans-numbers\"><summary>{ui('详细数字')}</summary>");
 assert.ok(head>0&&numbers>head);assert.ok(plan.indexOf("['已投入',metrics.actual]")>numbers);
 assert.ok(focus.includes('[25,45,60,90].map(n=><button key={n} type="button" aria-pressed={minutes===n} onClick={()=>setMinutes(n)}>'));
});
