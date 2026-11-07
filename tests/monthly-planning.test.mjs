import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {monthWeeks,distributeMonth} from '../lib/monthly-plan-schema.ts';
import {monthlyMetrics} from '../lib/monthly-planning.ts';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
const now=new Date('2026-11-30T12:00:00Z');
const run=(s,type,payload)=>applyCommand(s,{type,payload},now);
function base(){let s=emptyState();for(const id of ['p','q'])s=run(s,'project.save',{id,project:{name:id},modules:[]});return s;}
const goal=(projectId='p',month='2026-11',minutes=1800)=>({projectId,minutes,outcome:'Demo outcome',weeks:distributeMonth(minutes,monthWeeks(month))});
const save=(s,g=goal(),month='2026-11')=>run(s,'monthly.goal.save',{month,weekStart:'monday',goal:g});
test('weeks clip to the month, respect week start, leap days and year boundaries',()=>{
 const weeks=monthWeeks('2026-11');assert.equal(weeks.length,6);assert.equal(weeks[0].key,'2026-10-26');assert.equal(weeks[0].from,'2026-11-01');assert.equal(weeks[0].days,1);assert.equal(weeks.at(-1).days,1);assert.equal(weeks.reduce((n,w)=>n+w.days,0),30);
 assert.equal(monthWeeks('2026-11','sunday').length,5);
 assert.equal(monthWeeks('2024-02').reduce((n,w)=>n+w.days,0),29);
 assert.equal(monthWeeks('2000-01')[0].key,'1999-12-27');assert.equal(monthWeeks('2099-12').at(-1).to,'2099-12-31');
 assert.throws(()=>monthWeeks('2026-13'));
});
test('automatic distribution uses in-month days and preserves the exact total in whole minutes',()=>{
 const weeks=monthWeeks('2026-11');assert.deepEqual(Object.values(distributeMonth(1800,weeks)),[60,420,420,420,420,60]);
 for(const total of [0,1,7,17,1201,43200]){const values=Object.values(distributeMonth(total,weeks));assert.equal(values.reduce((a,b)=>a+b,0),total);assert.ok(values.every(Number.isInteger));}
 assert.throws(()=>distributeMonth(-1,weeks));assert.throws(()=>distributeMonth(1.5,weeks));
});
test('monthly saves are scoped per project, reject invalid allocations, and survive backup reload',()=>{
 let s=save(base());s=save(s,goal('q'));s=save(s,{...goal(),outcome:'Changed'});assert.equal(s.monthlyPlans[0].goals.length,2);assert.equal(s.monthlyPlans[0].goals[1].projectId,'q');
 assert.deepEqual(decodeState(encodeState(s)).monthlyPlans,s.monthlyPlans);
 assert.throws(()=>save(s,goal('missing')));
 assert.throws(()=>save(s,{...goal(),weeks:{'2026-12-07':1800}}));
 assert.throws(()=>save(s,{...goal(),weeks:{'2026-10-26':1801}}));
 assert.throws(()=>run(s,'monthly.goal.save',{month:'2026-11',weekStart:'sunday',goal:goal()}));
 const partial=save(s,{...goal(),weeks:{'2026-11-02':120}});assert.equal(monthlyMetrics(partial,partial.monthlyPlans[0]).goals[0].allocated,120);
 const legacy=base();delete legacy.monthlyPlans;assert.deepEqual(validateState(legacy).monthlyPlans,[]);
});
test('actuals follow session dates rather than planned dates, and edits/deletions update week and month totals',()=>{
 let s=save(base());s=run(s,'task.save',{id:'t',task:{title:'Demo task',projectId:'p',date:'2026-10-20',minutes:120}});
 s=run(s,'task.record',{id:'t',date:'2026-11-03',minutes:40});
 s=run(s,'task.record',{id:'t',date:'2026-11-10',minutes:20});
 let m=monthlyMetrics(s,s.monthlyPlans[0]);assert.equal(m.actual,60);assert.equal(m.scheduled,0);assert.equal(m.weeks[1].actual,40);assert.equal(m.weeks[2].actual,20);
 const first=s.sessions[0].id;s=run(s,'session.update',{id:first,date:'2026-11-03',spans:[],untimedSeconds:30*60,note:''});assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).actual,50);
 s=run(s,'session.delete',{id:first});assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).actual,20);
 s=run(s,'session.restore',{id:first});assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).actual,50);
 s=run(s,'task.schedule',{id:'t',date:'2026-11-05',start:'10:00'});m=monthlyMetrics(s,s.monthlyPlans[0]);assert.equal(m.scheduled,120);assert.equal(m.actual,50);assert.equal(m.weeks[1].scheduled,120);
 s=run(s,'task.delete',{id:'t'});assert.equal(monthlyMetrics(s,s.monthlyPlans[0]).actual,0);
});
test('cross-month focus spans credit only the actual time inside the month',()=>{
 let s=save(base());s.settings.timezone='UTC';s=run(s,'task.save',{id:'t',task:{title:'Over midnight',projectId:'p',minutes:60,actual:60}});
 s.sessions.push({id:'span',taskId:'t',date:'2026-11-01',seconds:3600,growth:0,endedAt:'2026-11-01T00:30:00Z',spans:[{startedAt:'2026-10-31T23:30:00Z',endedAt:'2026-11-01T00:30:00Z'}]});
 const m=monthlyMetrics(validateState(s),s.monthlyPlans[0]);assert.equal(m.actual,30);assert.equal(m.weeks[0].actual,30);
});
test('removing a monthly goal or changing its budget never changes project or task records',()=>{
 let s=save(base());s=run(s,'task.save',{id:'t',task:{title:'Keep this',projectId:'p',minutes:30}});
 const tasks=structuredClone(s.tasks),projects=structuredClone(s.projects);s=save(s,goal('p','2026-11',600));
 s=run(s,'monthly.goal.remove',{month:'2026-11',projectId:'p'});assert.deepEqual(s.tasks,tasks);assert.deepEqual(s.projects,projects);assert.equal(s.monthlyPlans[0].goals.length,0);
});
