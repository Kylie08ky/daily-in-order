import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {planningDays,recommendSlot,scheduleIssue,monthReview,previousMonth} from '../lib/planning-workflow.ts';
import {monthlyMetrics} from '../lib/monthly-planning.ts';
const now=new Date('2026-11-09T08:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function base(){const s=emptyState();s.settings.weekly=Array(7).fill(8);return run(s,'project.save',{id:'p',project:{name:'Demo project'},modules:[]});}
const task=(s,id,v={})=>run(s,'task.save',{id,task:{title:id,projectId:'p',date:'2026-11-09',minutes:60,...v}});
test('month review keeps original records, excludes completed tasks and uses remaining monthly budget',()=>{
 let s=task(base(),'old',{date:'2026-10-25',actual:30,minutes:120});s=task(s,'done',{date:'2026-10-26',progress:100,actual:60});s=task(s,'independent',{date:'2026-10-20',projectId:'',minutes:45});
 const before=structuredClone(s),review=monthReview(s,'2026-11');assert.equal(review.projects[0].remaining,90);assert.deepEqual(review.projects[0].tasks.map(t=>t.id),['old']);assert.equal(review.independent.length,1);assert.deepEqual(s,before);
 s=run(s,'monthly.goal.save',{month:'2026-10',weekStart:'monday',goal:{projectId:'p',minutes:600,outcome:'',weeks:{}}});assert.equal(monthReview(s,'2026-11').projects[0].remaining,510);assert.equal(previousMonth('2026-01'),'2025-12');
});
test('capacity counts fixed interval union and flexible tasks, excluding only the rescheduled task',()=>{
 let s=task(base(),'fixed',{start:'09:00',minutes:120});s=task(s,'overlap',{start:'10:00',minutes:120});s=task(s,'flex',{minutes:60});const d=planningDays(s,'2026-11-09','2026-11-09')[0];assert.equal(d.fixed,180);assert.equal(d.flexible,60);assert.equal(d.remaining,240);assert.equal(planningDays(s,d.date,d.date,'flex')[0].remaining,300);assert.equal(planningDays(s,'','').length,0);
});
test('suggestions respect continuous gaps, deadline, available daily budget and exact adjacent boundaries',()=>{
 let s=task(base(),'fixed',{start:'09:00',minutes:120});s=task(s,'pending',{date:'',deadline:'2026-11-09'});const t=s.tasks.find(t=>t.id==='pending');const slot=recommendSlot(s,t,'2026-11-09','2026-11-15',60,'09:00','13:00');assert.equal(slot.date,'2026-11-09');assert.equal(slot.start,'11:00');assert.equal(scheduleIssue(s,t,slot.date,slot.start,60),'');
 assert.equal(recommendSlot(s,t,'2026-11-10','2026-11-15',60),null);assert.equal(recommendSlot(s,t,'2026-11-09','2026-11-15',180,'09:00','13:00'),null);assert.equal(recommendSlot(s,t,'2026-11-09','2026-11-15',60,'',''),null);
 s.capacity['2026-11-09']=2;assert.equal(recommendSlot(s,t,'2026-11-09','2026-11-15',60),null);
});
test('recommendations prefer the day with more remaining capacity and never mutate state',()=>{
 let s=task(base(),'fixed',{start:'09:00',minutes:120});s=task(s,'pending',{date:''});const before=structuredClone(s);assert.equal(recommendSlot(s,s.tasks[1],'2026-11-09','2026-11-10',60).date,'2026-11-10');assert.deepEqual(s,before);
});
test('confirmed scheduling preserves task identity, actual dates, records and manual progress',()=>{
 let s=task(base(),'t',{date:'2026-10-30',minutes:120});s=run(s,'task.record',{id:'t',date:'2026-10-30',minutes:30});s=run(s,'task.progress',{id:'t',progress:35});s=run(s,'monthly.goal.save',{month:'2026-11',weekStart:'monday',goal:{projectId:'p',minutes:600,outcome:'',weeks:{}}});
 const old=structuredClone(s),next=run(s,'planning.schedule',{id:'t',date:'2026-11-09',start:'11:00',minutes:45});assert.equal(next.tasks.length,old.tasks.length);assert.deepEqual(next.sessions,old.sessions);assert.deepEqual(next.tasks[0],{...old.tasks[0],date:'2026-11-09',start:'11:00',minutes:45});assert.deepEqual(s,old);assert.equal(monthlyMetrics(next,next.monthlyPlans[0]).actual,0);assert.equal(monthlyMetrics(next,next.monthlyPlans[0]).scheduled,45);
});
test('resizing recalculates time-derived progress without marking completion',()=>{
 let s=task(base(),'t',{minutes:120});s=run(s,'task.record',{id:'t',date:'2026-11-09',minutes:30});const next=run(s,'planning.schedule',{id:'t',date:'2026-11-09',start:'',minutes:60});assert.equal(next.tasks[0].actual,30);assert.equal(next.tasks[0].progress,50);assert.equal(next.tasks[0].completedAt,null);
});
test('scheduling rejects stale conflicts and legacy undated investment atomically',()=>{
 let s=task(base(),'t',{date:'2026-10-30',actual:30});const before=structuredClone(s);assert.throws(()=>run(s,'planning.schedule',{id:'t',date:'2026-11-09',start:'11:00',minutes:60}),/历史投入/);assert.deepEqual(s,before);
 s=task(base(),'fixed',{start:'09:00',minutes:120});s=task(s,'t',{date:''});const payload={id:'t',date:'2026-11-09',start:'10:30',minutes:60};assert.throws(()=>run(s,'planning.schedule',payload),/重叠/);assert.throws(()=>run(s,'planning.schedule',{...payload,date:'2026-11-31'}));assert.throws(()=>run(s,'planning.schedule',{...payload,start:'23:30'}),/跨越/);assert.throws(()=>run(s,'planning.schedule',{...payload,start:'',minutes:500}),/容量/);assert.equal(s.tasks[1].date,'');
 assert.ok(scheduleIssue(s,s.tasks[1],'','',60));assert.ok(scheduleIssue(s,s.tasks[1],'2026-11-09','',0));
});
test('suggestions start after now in the user timezone and round up to a five minute slot',()=>{
 const s=task(base(),'t',{date:''}),t=s.tasks[0];assert.equal(recommendSlot(s,t,'2026-11-09','2026-11-09',60,'09:00','21:00',{date:'2026-11-09',minute:901.2}).start,'15:05');assert.equal(recommendSlot(s,t,'2026-11-08','2026-11-09',60,'09:00','21:00',{date:'2026-11-09',minute:1250}),null);
});
