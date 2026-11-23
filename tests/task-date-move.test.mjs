import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {datesSignature,completionDate} from '../lib/task-completion.ts';
import {investmentByTask} from '../lib/task-investment.ts';
import {calendarTasks,rawPlans} from '../lib/task-plans.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';

// Business "today" is 2026-11-23.
const now=new Date('2026-11-23T12:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
const doneOn=(s,date,extra={})=>run(s,'task.finish.on',{id:'t',expected:datesSignature(s.tasks[0]),date,...extra});
const byDay=s=>Object.fromEntries(investmentByTask(s).get('t')||[]);

test('"done on X" for an unfinished task sets completion and untimed-total dates together and closes open plans',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic errand',date:'2026-11-20',minutes:120}},new Date('2026-11-19T08:00:00Z'));
 s=doneOn(s,'2026-11-20',{actual:90});const t=s.tasks[0];
 assert.deepEqual([t.progress,t.completedDate,t.actualDate,t.actual],[100,'2026-11-20','2026-11-20',90]);
 assert.deepEqual(byDay(s),{'2026-11-20':90});assert.equal(calendarTasks(s).length,0);assert.equal(s.sessions.length,0);
 assert.deepEqual(doneOn(s,'2026-11-20'),s);assert.deepEqual(decodeState(encodeState(s)),s);
});

test('moving the completion date of a finished task moves an untimed total with it, without adding time',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic report',date:'2026-11-23',minutes:60}});
 s=run(s,'task.progress',{id:'t',date:'2026-11-23',progress:100,actual:60});
 s=doneOn(s,'2026-11-21');
 assert.equal(completionDate(s.tasks[0],s.settings.timezone),'2026-11-21');assert.equal(s.tasks[0].actualDate,'2026-11-21');
 assert.equal(s.tasks[0].actual,60);assert.deepEqual(byDay(s),{'2026-11-21':60});
});

test('focus and timed records stay on the days they happened; only the completion date moves',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic study',minutes:60}},new Date('2026-11-18T08:00:00Z'));
 s=run(s,'task.plan.save',{id:'t',planId:'p',date:'2026-11-19',start:'09:00',minutes:60},new Date('2026-11-18T08:00:00Z'));
 s=run(s,'task.record',{id:'t',date:'2026-11-19',startedAt:'2026-11-19T08:00:00Z',endedAt:'2026-11-19T08:40:00Z'},new Date('2026-11-19T12:00:00Z'));
 const sessions=structuredClone(s.sessions);s=doneOn(s,'2026-11-21');
 assert.equal(s.tasks[0].completedDate,'2026-11-21');assert.equal(s.tasks[0].actualDate,undefined);
 assert.deepEqual(s.sessions,sessions);assert.deepEqual(byDay(s),{'2026-11-19':40});assert.equal(rawPlans(s.tasks[0])[0].endReason,'completed');
});

test('future dates and stale versions are refused without writing',()=>{
 const s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic',date:'2026-11-23',minutes:30}}),before=structuredClone(s);
 assert.throws(()=>doneOn(s,'2026-11-24'),/未来日期/);
 assert.throws(()=>run(s,'task.finish.on',{id:'t',expected:'stale',date:'2026-11-22'}),/记录已更新/);
 assert.deepEqual(s,before);
});

test('Edit task opens with one "Which day?" control and ticking a past item asks for its completion date',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8'),move=fs.readFileSync('app/task-date-move.tsx','utf8');
 const top=wb.indexOf('{live&&<TaskDateMove'),classification=wb.indexOf('<TaskClassification state={state} task={t}');
 assert.ok(top>0&&top<classification,'"Which day?" sits above the other fields');
 assert.ok(wb.includes('dirty={dirty} onDone={close}/>'));assert.ok(move.includes("{dirty?<p className=\"tdm-hint\">{ui('请先保存或放弃下面的修改，再改日期。')}"));
 assert.ok(move.includes("type:'task.finish.on'"));assert.ok(move.includes("ui('改计划日期')")&&move.includes("ui('补记完成')"));assert.ok(move.includes("tr('记为 {0} 完成',md(date))")&&move.includes("tr('改到 {0}',md(date))"));
 // One action at a time: a single primary button whose handler follows the chosen mode.
 assert.equal((move.match(/className="primary"/g)||[]).length,1);assert.ok(move.includes("onClick={()=>void(mode==='plan'?move():finish())}"));
 assert.ok(move.includes("min={mode==='plan'?today:undefined} max={mode==='done'?today:undefined}"));
 assert.ok(wb.includes('||overduePlanDay(s,t,today)){setCompletion(t)'));assert.ok(wb.includes('setDoneDay(defaultCompletionDay(s,t,date,today))'));
 assert.ok(wb.includes('name="completedDate" type="date" required value={doneDay}'));
});

import {overduePlanDay,defaultCompletionDay} from '../lib/task-completion.ts';
test('completing two overdue items in a row: each dialog defaults to that item’s own planned day, whatever day is being viewed',()=>{
 let s=run(emptyState(),'task.save',{id:'a',task:{title:'Synthetic errand',date:'2026-11-20',minutes:30}},new Date('2026-11-15T08:00:00Z'));
 s=run(s,'task.save',{id:'b',task:{title:'Synthetic weekly review',date:'2026-11-22',minutes:30}},new Date('2026-11-15T08:00:00Z'));
 const today='2026-11-23',find=id=>s.tasks.find(t=>t.id===id);
 // First completion while viewing 11-20 (the reported sequence), then the next item is opened from the same view.
 for(const view of ['2026-11-20',today,'2026-11-21']){
  assert.equal(defaultCompletionDay(s,find('a'),view,today),'2026-11-20',view);
  assert.equal(defaultCompletionDay(s,find('b'),view,today),'2026-11-22',view);
 }
 s=run(s,'task.progress',{id:'a',date:defaultCompletionDay(s,find('a'),'2026-11-20',today),progress:100});
 assert.equal(find('a').completedDate,'2026-11-20');
 assert.equal(overduePlanDay(s,find('b'),today),'2026-11-22');assert.equal(defaultCompletionDay(s,find('b'),'2026-11-20',today),'2026-11-22');
 s=run(s,'task.progress',{id:'b',date:defaultCompletionDay(s,find('b'),'2026-11-20',today),progress:100});
 assert.equal(find('b').completedDate,'2026-11-22');
});

test('overdue split tasks use their latest unfinished segment; current and future items keep the viewed day',()=>{
 let s=run(emptyState(),'task.save',{id:'t',task:{title:'Synthetic split',minutes:90}},new Date('2026-11-15T08:00:00Z'));
 for(const [planId,date] of [['x','2026-11-18'],['y','2026-11-21']])s=run(s,'task.plan.save',{id:'t',planId,date,start:'',minutes:45},new Date('2026-11-15T08:00:00Z'));
 assert.equal(defaultCompletionDay(s,s.tasks[0],'2026-11-19','2026-11-23'),'2026-11-21');
 const due=run(emptyState(),'task.save',{id:'t',task:{title:'Due today',date:'2026-11-23',minutes:30}});
 assert.equal(overduePlanDay(due,due.tasks[0],'2026-11-23'),'');assert.equal(defaultCompletionDay(due,due.tasks[0],'2026-11-20','2026-11-23'),'2026-11-20');
 assert.equal(defaultCompletionDay(due,due.tasks[0],'2026-11-25','2026-11-23'),'2026-11-23');
});

test('both completion forms take the default from the shared rule, show Planned day / Today, and reset on every open',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8'),course=fs.readFileSync('app/course-completion.tsx','utf8');
 assert.equal((wb.match(/setCompletion\(t\)/g)||[]).length,1,'single entry point');assert.ok(wb.includes('setCompletion(t);setActual(t.actual);setDoneBy(\'duration\');setDoneStart(\'\');setDoneEnd(\'\');setDoneDay(defaultCompletionDay(s,t,date,today));'));
 assert.ok(wb.includes('{completion&&<Dialog key={completion.id} title='));
 assert.ok(wb.includes('<CourseCompletion key={completion.id} planDay={overduePlanDay(s,completion,today)}'));
 assert.ok(!wb.includes('pastPlanDay'));
 assert.ok(course.includes('[day,setDay]=useState(planDay||(date>today?today:date))'));
 for(const src of [wb,course])assert.ok(src.includes("tr('计划那天 {0}',")&&src.includes("ui('今天')"));
});

test('Edit task reads top-down: title, date, schedule/duration, then folded category and more settings',()=>{
 const wb=fs.readFileSync('app/workbench.tsx','utf8');
 const at=k=>{const i=wb.indexOf(k);assert.ok(i>0,k);return i;};
 const order=[at('<label>{ui("事项标题 *")}'),at('{live&&<TaskDateMove'),at('{live?.plans?<TaskScheduleSummary'),at('<details className="task-editor-extra task-editor-classify" open={entryKind!==\'once\'||undefined}>'),at('<details className="task-editor-extra">')];
 assert.deepEqual([...order].sort((a,b)=>a-b),order);
 assert.ok(at('<TaskClassification state={state} task={t}')>order[3]&&at("<label>{ui('任务类型')}")>order[3]);
 assert.ok(!wb.includes('日期在最上方「改到哪天」修改'));
});
