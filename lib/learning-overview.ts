import {learningSources} from './learning-sources.ts';
import {taskActivityMinutes} from './progress-records.ts';
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
/** Step to the previous (-1) or next (+1) week/month/year; returns a date inside that period. Never past the period containing today. */
export function shiftLearningPeriod(date:string,period:LearningPeriod,dir:-1|1,today:string,weekStart:'monday'|'sunday'){
 if(period==='all')return date;
 const start=learningRange(date,period,weekStart).from;
 const next=period==='week'?offsetDate(start,7*dir):period==='year'?String(Number(start.slice(0,4))+dir)+'-01-01'
  :new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7))-1+dir,1,12)).toISOString().slice(0,10);
 return next>=learningRange(today,period,weekStart).from?today:next;
}
/** True when the shown period is the one containing today ("This week"/"This month"). */
export function isCurrentLearningPeriod(date:string,period:LearningPeriod,today:string,weekStart:'monday'|'sunday'){
 return period==='all'||learningRange(date,period,weekStart).from===learningRange(today,period,weekStart).from;
}
// Count recorded investment even before a task is marked complete. Linked entries
// and focus sessions describe the same task actual, so never add them twice.
export function learningInvestment(s:State,from:string,to:string){
 const courses=s.life.courses.filter(c=>!c.deletedAt);
 const items=courses.map(c=>({...c,minutes:learningSources(s,c.id,from,to).total}));
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
