import {icsExport} from '../lib/files.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,validateState,projectMetrics} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {taskPlans,calendarTasks} from '../lib/task-plans.ts';
import {planningDays} from '../lib/planning-workflow.ts';
import {monthlyMetrics} from '../lib/monthly-planning.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {timelineItems} from '../lib/timeline-items.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-30T12:00:00Z');
const run=(s,type,payload,at=now)=>applyCommand(s,{type,payload},at);
function base(v={}){let s=emptyState();s=run(s,'project.save',{id:'p',project:{name:'Demo',progressBasis:'time'},modules:[]});s=run(s,'task.save',{id:'t',task:{title:'A single task',projectId:'p',minutes:360,...v}});return run(s,'monthly.goal.save',{month:'2026-11',weekStart:'monday',goal:{projectId:'p',minutes:360,weeks:{},outcome:''}});}
const slot=(s,planId,date,minutes,start='')=>run(s,'task.plan.save',{id:'t',planId,date,start,minutes});
test('six-hour task allocates two hours this week and four next week without copies or estimate changes',()=>{
 let s=slot(base(),'a','2026-11-09',120,'09:00');s=slot(s,'b','2026-11-16',240,'10:00');
 const ics=icsExport(s,s.tasks);assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2);assert.ok(ics.includes('UID:t:a@'));assert.ok(ics.includes('20261116T100000'));assert.equal(s.tasks.length,1);assert.equal(s.tasks[0].minutes,360);assert.equal(s.tasks[0].actual,null);assert.equal(s.sessions.length,0);assert.equal(s.tasks[0].date,'');
 const m=monthlyMetrics(s,s.monthlyPlans[0]);assert.equal(m.weeks.find(w=>w.key==='2026-11-09').scheduled,120);assert.equal(m.weeks.find(w=>w.key==='2026-11-16').scheduled,240);assert.equal(m.scheduled,360);assert.equal(m.actual,0);
 assert.equal(projectMetrics(s,'p').total,360);assert.equal(calendarTasks(s).length,2);assert.equal(planningDays(s,'2026-11-09','2026-11-09')[0].total,120);
 assert.equal(timelineItems(s,'2026-11-16',s.tasks)[0].length,240);assert.deepEqual(decodeState(encodeState(s)),validateState(s));
});
test('converting, resizing and removing legacy plan preserves all actual history and task progress',()=>{
 let s=base({date:'2026-10-31',start:'09:00',actual:60,progress:25,progressSource:'manual'}),original=structuredClone(s.tasks[0]);
 s=slot(s,'legacy','2026-11-09',120,'');s=slot(s,'b','2026-11-16',240);assert.deepEqual({...s.tasks[0],plans:undefined},{...original,plans:undefined});
 assert.equal(minutesInRange(investmentByTask(s).get('t'),'2026-10-31'),60);assert.equal(calendarTasks(s).some(t=>t.date==='2026-10-31'),false);
 s=run(s,'task.plan.delete',{id:'t',planId:'legacy'});s=run(s,'task.plan.delete',{id:'t',planId:'b'});assert.deepEqual(taskPlans(s.tasks[0]),[]);assert.equal(s.tasks[0].actual,60);assert.equal(s.tasks[0].progress,25);assert.equal(s.tasks[0].date,'2026-10-31');assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).scheduled,0);
});
test('focus and manual actuals accumulate on original task, replacing only the linked calendar slot',()=>{
 let s=slot(base(),'a','2026-11-09',120,'09:00');s=slot(s,'b','2026-11-16',240,'10:00');
 s=run(s,'focus.start',{taskId:'t',planId:'a',mode:'countup'},new Date('2026-11-10T10:00:00Z'));
 s=run(s,'focus.finish',{},new Date('2026-11-10T10:30:00Z'));assert.equal(s.tasks[0].actual,30);assert.equal(s.sessions[0].planId,'a');assert.equal(s.sessions[0].date,'2026-11-10');assert.equal(timelineItems(s,'2026-11-09',s.tasks).length,0);assert.equal(timelineItems(s,'2026-11-16',s.tasks).length,1);
 s=run(s,'task.record',{id:'t',date:'2026-11-16',minutes:90});assert.equal(s.tasks[0].actual,120);assert.equal(s.tasks[0].progress,33);assert.equal(s.tasks[0].minutes,360);assert.equal(s.tasks.length,1);assert.equal(s.sessions.length,2);assert.equal(s.sessions[1].planId,'b');assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).actual,120);
 const session=s.sessions[0];s=run(s,'session.delete',{id:session.id});assert.equal(s.tasks[0].actual,90);assert.equal(timelineItems(s,'2026-11-09',s.tasks).length,1);
 s=run(s,'session.restore',{id:session.id});s=run(s,'task.plan.delete',{id:'t',planId:'a'});assert.equal(s.tasks[0].actual,120);assert.equal(s.sessions.length,2);assert.equal(timelineItems(s,'2026-11-10',s.tasks).length,1);
});
test('invalid segment changes and legacy commands cannot silently destroy split schedules',()=>{
 let s=slot(base(),'a','2026-11-09',120,'09:00'),before=structuredClone(s);
 assert.throws(()=>slot(s,'b','2026-11-16',241),/总预计/);assert.throws(()=>slot(s,'b','2026-11-09',30,'10:00'),/重叠/);assert.throws(()=>slot(s,'b','2026-11-16',120,'23:00'),/跨越/);
 assert.throws(()=>run(s,'task.schedule',{id:'t',date:'2026-11-17',start:''}),/已拆分/);assert.throws(()=>run(s,'tasks.arrange',{ids:['t'],from:'2026-11-17',mode:'today'}),/已拆分/);assert.throws(()=>run(s,'task.save',{id:'t',task:{...s.tasks[0],minutes:60}}),/总预计/);assert.deepEqual(s,before);
 s=run(s,'task.save',{id:'t',task:{...s.tasks[0],title:'Renamed',minutes:480}});assert.equal(s.tasks[0].plans[0].minutes,120);assert.equal(s.tasks[0].title,'Renamed');
 s=run(s,'tasks.unschedule',{ids:['t']});assert.equal(calendarTasks(s).length,0);assert.equal(s.tasks[0].minutes,480);
});
test('same-day segments preserve independent identities and legacy snapshots upgrade without invented actuals',()=>{
 let s=slot(base(),'a','2026-11-09',60,'09:00');s=slot(s,'b','2026-11-09',60,'10:00');assert.equal(timelineItems(s,'2026-11-09',s.tasks).length,2);assert.equal(planningDays(s,'2026-11-09','2026-11-09')[0].total,120);
 s=slot(s,'a','2026-11-10',90,'11:00');assert.equal(calendarTasks(s).find(t=>t.planId==='b').start,'10:00');assert.equal(s.tasks[0].minutes,360);
 const old=base({date:'2026-11-09',minutes:60});old.schemaVersion=8;const upgraded=validateState(old);assert.equal(upgraded.schemaVersion,16);assert.equal(upgraded.tasks[0].plans,undefined);assert.equal(taskPlans(upgraded.tasks[0]).length,1);assert.equal(upgraded.tasks[0].actual,null);
});

test('automatic arrangement respects existing split slots when allocating a different task',()=>{
 let s=base();s.settings.weekly=Array(7).fill(2);s=slot(s,'a','2026-11-09',120,'09:00');s=run(s,'task.save',{id:'other',task:{title:'Another task',minutes:60}});s=run(s,'tasks.arrange',{ids:['other'],from:'2026-11-09',mode:'balanced'});assert.equal(s.tasks.find(t=>t.id==='other').date,'2026-11-10');assert.equal(s.tasks[0].minutes,360);
});
