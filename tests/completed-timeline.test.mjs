import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {timelineItems} from '../lib/timeline-items.ts';
import {planningMetrics,planningSignature,rawPlans,dayPlanEntries,calendarTasks} from '../lib/task-plans.ts';
import {calendarOccupancy} from '../lib/time-metrics.ts';
import {investmentByTask,minutesInRange} from '../lib/task-investment.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const day='2026-11-16',now=new Date('2026-11-17T10:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
const base=()=>run(emptyState(),'task.save',{id:'demo',task:{title:'Synthetic office day',date:day,start:'08:30',minutes:472,note:'Unchanged'}});
const items=(s,d=day,f='all')=>timelineItems(s,d,[],f);
const actual=(s,d=day)=>minutesInRange(investmentByTask(s).get('demo'),d);

test('duration-only completion retains original 08:30–16:22 plan without inventing an actual block',()=>{
 let s=base();assert.deepEqual(items(s).map(x=>[x.begin,x.length]),[[510,472]]);
 s=run(s,'task.save',{id:'demo',task:{...s.tasks[0],actual:480,actualDate:day}});
 s=run(s,'task.progress',{id:'demo',date:day,progress:100});
 const b=items(s)[0];assert.equal(items(s).length,1);assert.deepEqual([b.plannedStart,b.plannedEnd,b.length,b.status,b.untimedActual],['08:30','16:22',472,'completed',true]);
 assert.equal(items(s,day,'actual').length,0);assert.equal(s.sessions.length,0);assert.equal(actual(s),480);assert.equal(actual(s,'2026-11-17'),0);assert.equal(items(s,'2026-11-17').length,0);
 assert.equal(s.tasks[0].completedDate,day);assert.equal(s.tasks[0].note,'Unchanged');
 const m=planningMetrics(s,s.tasks[0]);assert.deepEqual([m.remaining,m.scheduled,m.unallocated],[0,0,0]);
 for(let n=0;n<2;n++){s=decodeState(encodeState(run(s,'task.progress',{id:'demo',date:day,progress:100})));assert.equal(actual(s),480);assert.equal(items(s).length,1);assert.equal(s.sessions.length,0);}
});

test('planned 08:30–10:30 and actual 09:00–10:00 coexist, while statistics count only 60 minutes',()=>{
 let s=run(base(),'task.save',{id:'demo',task:{...base().tasks[0],minutes:120}});
 s=run(s,'task.record',{id:'demo',date:day,minutes:60,start:'09:00',end:'10:00'});
 // Use the public session editor to attach verified real clock times.
 s=run(s,'session.update',{id:s.sessions[0].id,date:day,spans:[{startedAt:day+'T08:00:00.000Z',endedAt:day+'T09:00:00.000Z'}],untimedSeconds:0,note:''});
 const history=structuredClone(s.sessions);s=run(s,'task.progress',{id:'demo',date:day,progress:100});
 assert.deepEqual(items(s).map(x=>[x.begin,x.length,!!x.block]),[[510,120,false],[540,60,true]]);
 assert.equal(actual(s),60);assert.deepEqual(s.sessions,history);assert.equal(items(s,day,'planned').length,1);assert.equal(items(s,day,'actual').length,1);assert.deepEqual(items(s,day,'completed').map(x=>[x.begin,!!x.block]),[[510,false],[540,true]]);
});

test('multi-day completion preserves two executed segments and separately closes the unused third',()=>{
 let s=run(emptyState(),'task.save',{id:'demo',task:{title:'Synthetic split task',minutes:180}});
 for(const [id,date] of [['a','2026-11-14'],['b','2026-11-15'],['c','2026-11-18']])s=run(s,'task.plan.save',{id:'demo',planId:id,date,start:'09:00',minutes:60});
 for(const date of ['2026-11-14','2026-11-15'])s=run(s,'task.record',{id:'demo',date,minutes:60});
 const history=structuredClone(s.sessions);s=run(s,'task.progress',{id:'demo',date:'2026-11-15',progress:100});
 assert.deepEqual(s.tasks[0].plans.map(p=>p.endReason),['completed','completed','closed_with_task']);
 assert.equal(items(s,'2026-11-14')[0].status,'completed');assert.equal(items(s,'2026-11-15')[0].status,'completed');
 assert.equal(items(s,'2026-11-18').length,0);assert.equal(items(s,'2026-11-18','cancelled')[0].status,'closed_with_task');
 assert.deepEqual(s.sessions,history);assert.equal(s.tasks[0].actual,120);assert.equal(actual(s,'2026-11-14'),60);assert.equal(actual(s,'2026-11-15'),60);
});

test('a segment with partial real effort reads as completed with its original plan and real minutes intact',()=>{
 let s=run(emptyState(),'task.save',{id:'demo',task:{title:'Synthetic partial slot',date:day,start:'08:30',minutes:120}});
 s=run(s,'task.record',{id:'demo',date:day,minutes:60});s=run(s,'task.progress',{id:'demo',date:day,progress:100});
 const p=items(s)[0];assert.equal(p.status,'completed');assert.equal(p.actualMinutes,60);assert.equal(p.length,120);assert.equal(p.plannedStart,'08:30');
 assert.equal(actual(s),60);assert.equal(items(s,day,'completed').length,1);assert.equal(items(s,day,'cancelled').length,0);assert.equal(items(s,day,'actual').length,0);
});

test('stored v0.25.5 closed_with_task segments with effort read as completed without rewriting records',()=>{
 let s=run(emptyState(),'task.save',{id:'demo',task:{title:'Synthetic legacy partial',minutes:120}});
 s=run(s,'task.plan.save',{id:'demo',planId:'p',date:day,start:'17:30',minutes:120});
 s=run(s,'task.record',{id:'demo',date:day,minutes:60});s=run(s,'task.progress',{id:'demo',date:day,progress:100});
 assert.equal(rawPlans(s.tasks[0])[0].endReason,'completed');s.tasks[0].plans[0].endReason='closed_with_task';const before=structuredClone(s);
 assert.equal(items(s)[0].status,'completed');assert.equal(items(s,day,'cancelled').length,0);assert.deepEqual(s,before);
 // Without effort the stored reason is kept as an unexecuted closure.
 let idle=run(emptyState(),'task.save',{id:'idle',task:{title:'Synthetic idle',minutes:60}});
 idle=run(idle,'task.plan.save',{id:'idle',planId:'x',date:day,start:'20:00',minutes:30});idle=run(idle,'task.progress',{id:'idle',date:'2026-11-15',progress:100});
 assert.equal(rawPlans(idle.tasks[0])[0].endReason,'closed_with_task');assert.equal(items(idle,day,'cancelled')[0].status,'closed_with_task');
});

test('editing ended plans retains original identities, actual dates, completion and sessions; retries are no-ops',()=>{
 let s=run(base(),'task.save',{id:'demo',task:{...base().tasks[0],actual:480,actualDate:day,progress:100,completedDate:day}});
 const before=structuredClone(s),command={id:'demo',planId:'legacy',expected:planningSignature(s.tasks[0]),date:day,start:'08:45',minutes:472};
 s=run(s,'task.plan.history',command);assert.equal(rawPlans(s.tasks[0])[0].id,'legacy');assert.equal(items(s)[0].begin,525);assert.equal(actual(s),480);
 for(const k of ['id','date','actualDate','actual','completedDate','completedAt','note','progress'])assert.deepEqual(s.tasks[0][k],before.tasks[0][k],k);
 assert.deepEqual(s.sessions,before.sessions);assert.deepEqual(run(s,'task.plan.history',command),s);
 assert.throws(()=>run(s,'task.plan.history',{...command,start:'09:00'}),/已更新/);
 assert.deepEqual(decodeState(encodeState(s)),s);
});

test('legacy closed plans restore through a read-only projection; missing clocks never create blocks',()=>{
 const s=base();Object.assign(s.tasks[0],{actual:480,actualDate:day,progress:100,completedDate:day,plans:[{id:'old',date:day,start:'08:30',minutes:472,closed:true}]});
 const before=structuredClone(s);for(let n=0;n<2;n++){assert.equal(items(s)[0].status,'completed');assert.equal(items(s)[0].length,472);assert.equal(actual(s),480);}assert.deepEqual(s,before);
 s.tasks[0].plans[0].start='';assert.equal(items(s).length,0);assert.equal(actual(s),480);assert.equal(s.sessions.length,0);
});

test('explicit cancellation stays traceable and does not change actual effort or reopen capacity',()=>{
 let s=base();s=run(s,'task.plan.delete',{id:'demo',planId:'legacy'});
 assert.equal(items(s).length,0);assert.equal(items(s,day,'cancelled')[0].status,'cancelled');assert.equal(items(s,day,'planned').length,1);
 assert.equal(rawPlans(s.tasks[0])[0].start,'08:30');assert.equal(actual(s),0);assert.equal(s.tasks.length,1);assert.equal(s.sessions.length,0);
 assert.deepEqual(run(s,'task.plan.delete',{id:'demo',planId:'legacy'}),s);
});

test('day estimate keeps completed plans, excludes cancelled or unexecuted closures, and leaves scheduling capacity unchanged',()=>{
 let s=run(base(),'task.save',{id:'demo',task:{...base().tasks[0],actual:480,actualDate:day}});s=run(s,'task.progress',{id:'demo',date:day,progress:100});
 s=run(s,'task.save',{id:'study',task:{title:'Synthetic study',date:day,start:'17:30',minutes:120}});s=run(s,'task.record',{id:'study',date:day,minutes:60});s=run(s,'task.progress',{id:'study',date:day,progress:100});
 s=run(s,'task.save',{id:'off',task:{title:'Synthetic cancelled',date:day,start:'20:00',minutes:30}});s=run(s,'task.plan.delete',{id:'off',planId:'legacy'});
 s=run(s,'task.save',{id:'open',task:{title:'Synthetic open',date:day,start:'21:00',minutes:45}});
 s=run(s,'task.save',{id:'early',task:{title:'Synthetic early finish',minutes:60}});s=run(s,'task.plan.save',{id:'early',planId:'x',date:day,start:'22:00',minutes:30});s=run(s,'task.progress',{id:'early',date:'2026-11-15',progress:100});
 const before=structuredClone(s),entries=dayPlanEntries(s,day);
 assert.deepEqual(entries.map(t=>t.entryId).sort(),['demo:legacy','open:legacy','study:legacy']);
 assert.equal(calendarOccupancy(entries).effort,472+120+45);
 assert.deepEqual(calendarTasks(s).filter(t=>t.date===day).map(t=>t.entryId),['open:legacy']);assert.deepEqual(s,before);
});
