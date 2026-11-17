import type {State,Task} from './model.ts';
import {rawPlans,taskOnDate,planStatus} from './task-plans.ts';
import {localParts,investmentByTask,minutesInRange} from './task-investment.ts';
/** Completion dates describe the event, never the date of each invested segment. */
export function completionDate(t:Task,timezone:string){
 if(t.progress!==100)return '';
 if(t.completedDate)return t.completedDate;
 const stamp=Date.parse(t.completedAt||'');
 return Number.isFinite(stamp)?localParts(stamp,timezone).date:'';
}
export function closeCompletedPlans(t:Task,s?:State){
 if(t.progress!==100)return;
 if(t.plans)t.plans=rawPlans(t).map(p=>p.closed?p:{...p,closed:true,...(s?{endReason:planStatus(s,t,p) as 'completed'|'closed_with_task'}:{})});
 if(t.remainingEstimate)t.remainingEstimate={initialMinutes:t.remainingEstimate?.initialMinutes??t.minutes,minutes:0,actualAtSet:t.actual||0};
}
export function tasksForDay(s:State,date:string){
 const actual=investmentByTask(s);
 return s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly&&(minutesInRange(actual.get(t.id),date)>0||completionDate(t,s.settings.timezone)===date||taskOnDate(t,date,s)));
}
export function datesSignature(t:Task){return JSON.stringify([t.completedAt,t.completedDate,t.actualDate,t.actual,t.progress]);}
