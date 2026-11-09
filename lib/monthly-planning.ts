import {taskPlans} from './task-plans.ts';
import {z} from 'zod';
import type {State,Command} from './model.ts';
import {capacity,liveTasks,offsetDate} from './model.ts';
import {monthKey,monthlyGoalSchema,assertMonthlyPlan,monthWeeks,type MonthlyPlan} from './monthly-plan-schema.ts';
import {investmentByTask,minutesInRange} from './task-investment.ts';

export function applyMonthlyCommand(s:State,command:Command){
 if(command.type==='monthly.goal.save'){
  const p=z.object({month:monthKey,weekStart:z.enum(['monday','sunday']),goal:monthlyGoalSchema}).parse(command.payload);
  if(!s.projects.some(x=>x.id===p.goal.projectId&&!x.deletedAt))throw Error('项目不存在或已删除。');
  const existing=s.monthlyPlans.find(x=>x.month===p.month);
  if(existing&&existing.weekStart!==p.weekStart)throw Error('本月周起始日已变化，请重新打开目标。');
  const next:MonthlyPlan={month:p.month,weekStart:existing?.weekStart??p.weekStart,goals:existing?[...existing.goals]:[]};
  const index=next.goals.findIndex(g=>g.projectId===p.goal.projectId);
  if(index<0)next.goals.push(p.goal);else next.goals[index]=p.goal;
  assertMonthlyPlan(next);
  if(existing)existing.goals=next.goals;
  else {if(s.monthlyPlans.length>=120)throw Error('最多保留 120 个月度计划。');s.monthlyPlans.push(next);}
 }else if(command.type==='monthly.goal.remove'){
  const p=z.object({month:monthKey,projectId:z.string().min(1).max(100)}).parse(command.payload);
  const plan=s.monthlyPlans.find(x=>x.month===p.month);if(plan)plan.goals=plan.goals.filter(g=>g.projectId!==p.projectId);
 }else throw Error('未知月度目标操作。');
}
export function monthlyMetrics(s:State,plan:MonthlyPlan){
 const weeks=monthWeeks(plan.month,plan.weekStart),tasks=liveTasks(s),investment=investmentByTask(s);
 const range=(projectId:string,from:string,to:string)=>{
  const projectTasks=tasks.filter(t=>t.projectId===projectId);
  return {scheduled:projectTasks.flatMap(taskPlans).filter(p=>p.date>=from&&p.date<=to).reduce((n,p)=>n+p.minutes,0),actual:projectTasks.reduce((n,t)=>n+minutesInRange(investment.get(t.id),from,to),0)};
 };
 const goals=plan.goals.map(goal=>({...goal,...range(goal.projectId,weeks[0].from,weeks.at(-1)!.to),allocated:Object.values(goal.weeks).reduce((a,b)=>a+b,0),weekly:weeks.map(w=>({...w,target:goal.weeks[w.key]??0,...range(goal.projectId,w.from,w.to)}))}));
 return {goals,target:goals.reduce((n,g)=>n+g.minutes,0),allocated:goals.reduce((n,g)=>n+g.allocated,0),scheduled:goals.reduce((n,g)=>n+g.scheduled,0),actual:goals.reduce((n,g)=>n+g.actual,0),weeks:weeks.map(w=>{
  let available=0;for(let d=w.from;d<=w.to;d=offsetDate(d,1))available+=capacity(s,d)*60;
  return {...w,available,target:goals.reduce((n,g)=>n+(g.weeks[w.key]??0),0),scheduled:goals.reduce((n,g)=>n+(g.weekly.find(x=>x.key===w.key)?.scheduled??0),0),actual:goals.reduce((n,g)=>n+(g.weekly.find(x=>x.key===w.key)?.actual??0),0)};
 })};
}
