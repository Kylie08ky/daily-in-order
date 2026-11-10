import {investmentByTask,minutesInRange} from './task-investment.ts';
import type {State} from './model.ts';
import {offsetDate,startOfWeek} from './model.ts';
import {germanTarget} from './german-metrics.ts';
import {learningCategoryLabel} from './learning.ts';

export type LearningPeriod='week'|'month'|'year'|'all';
export function learningRange(date:string,period:LearningPeriod,weekStart:'monday'|'sunday'){
 if(period==='all')return {from:'0000-01-01',to:'9999-12-31'};
 if(period==='week'){const from=startOfWeek(date,weekStart);return {from,to:offsetDate(from,6)};}
 if(period==='year')return {from:date.slice(0,4)+'-01-01',to:date.slice(0,4)+'-12-31'};
 return {from:date.slice(0,7)+'-01',to:offsetDate(new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),1,12)).toISOString().slice(0,10),-1)};
}
// Count recorded investment even before a task is marked complete. Linked entries
// and focus sessions describe the same task actual, so never add them twice.
export function learningInvestment(s:State,from:string,to:string){
 const investment=investmentByTask(s);
 const courses=s.life.courses.filter(c=>!c.deletedAt);
 const minutes=new Map(courses.map(c=>[c.id,0]));
 for(const t of s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly)){
  const id=germanTarget(s,t)?.id;
  if(id&&minutes.has(id))minutes.set(id,minutes.get(id)!+minutesInRange(investment.get(t.id),from,to));
 }
 for(const e of s.life.entries.filter(e=>!e.deletedAt&&!e.taskId&&e.kind==='german'&&e.date>=from&&e.date<=to)){
  const id=e.timeRefId||e.refId;if(minutes.has(id))minutes.set(id,minutes.get(id)!+e.minutes);
 }
 const items=courses.map(c=>({...c,minutes:minutes.get(c.id)!}));
 const categories=[...new Set(courses.map(c=>c.category))].map(key=>({key,label:learningCategoryLabel(key),minutes:items.filter(c=>c.category===key).reduce((n,c)=>n+c.minutes,0)}));
 return {items,categories,total:items.reduce((n,c)=>n+c.minutes,0)};
}

// Categories are user-defined first-level modules. Preserve legacy course IDs and links.
export function learningModules(s:State,data:ReturnType<typeof learningInvestment>){
 const targets=s.life.preferences.learningModuleWeekly;
 return [...new Set([...Object.keys(targets),...data.items.map(c=>c.category)])].map(key=>({
  key,weeklyMinutes:targets[key]??0,items:data.items.filter(c=>c.category===key),
  minutes:data.items.filter(c=>c.category===key).reduce((n,c)=>n+c.minutes,0)
 }));
}
