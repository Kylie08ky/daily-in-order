import {z} from 'zod';
import {type State,type Task,type Command,capacity,liveTasks,finished,offsetDate,minuteOf,validateState,assertTask,dateString} from './model.ts';
import {calendarOccupancy} from './time-metrics.ts';
import {refreshTimeProgress} from './task-investment.ts';
import {monthlyMetrics} from './monthly-planning.ts';
export function previousMonth(month:string){const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);return d.toISOString().slice(0,7);}
export function monthReview(s:State,month:string){
 const previous=previousMonth(month),plan=s.monthlyPlans.find(p=>p.month===previous),metrics=plan?monthlyMetrics(s,plan):null;
 const tasks=liveTasks(s).filter(t=>!finished(t)&&t.date.startsWith(previous));
 const projects=s.projects.filter(p=>!p.deletedAt&&(tasks.some(t=>t.projectId===p.id)||metrics?.goals.some(g=>g.projectId===p.id&&g.actual<g.minutes))).map(p=>{const goal=metrics?.goals.find(g=>g.projectId===p.id),items=tasks.filter(t=>t.projectId===p.id);return {project:p,tasks:items,remaining:goal?Math.max(0,goal.minutes-goal.actual):items.reduce((n,t)=>n+remainingTask(t),0),target:goal?.minutes??0,actual:goal?.actual??0};});
 return {previous,projects,independent:tasks.filter(t=>!t.projectId)};
}
export function remainingTask(t:Task){return Math.max(0,t.progressSource==='manual'?Math.round(t.minutes*(1-t.progress/100)):t.minutes-(t.actual||0));}
export function planningDays(s:State,from:string,to:string,exclude=''){
 if(!dateString.safeParse(from).success||!dateString.safeParse(to).success||from>to)return [];
 const result=[];for(let date=from;date<=to;date=offsetDate(date,1)){const tasks=liveTasks(s).filter(t=>t.date===date&&(!exclude||(t.id!==exclude&&t.parentId!==exclude))),used=calendarOccupancy(tasks),budget=capacity(s,date)*60;result.push({date,tasks:tasks.sort((a,b)=>(a.start||'99').localeCompare(b.start||'99')),budget,...used,remaining:Math.max(0,budget-used.total),over:Math.max(0,used.total-budget)});}return result;
}
export function recommendSlot(s:State,task:Task,from:string,to:string,minutes:number,windowStart='09:00',windowEnd='21:00',notBefore?:{date:string;minute:number}){
 const start=minuteOf(windowStart),end=minuteOf(windowEnd);if(!Number.isInteger(minutes)||minutes<=0||!/^([01]\d|2[0-3]):[0-5]\d$/.test(windowStart)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(windowEnd)||start>=end||task.parentId)return null;
 const days=planningDays(s,from,to,task.id).filter(d=>(!notBefore||d.date>=notBefore.date)&&d.remaining>=minutes&&(!task.deadline||d.date<=task.deadline)).sort((a,b)=>b.remaining-a.remaining||a.date.localeCompare(b.date));
 for(const day of days){let cursor=Math.max(start,notBefore?.date===day.date?Math.ceil(notBefore.minute/5)*5:0);const intervals=day.tasks.filter(t=>t.start).map(t=>[minuteOf(t.start),minuteOf(t.start)+t.minutes]).sort((a,b)=>a[0]-b[0]);for(const [a,b] of [...intervals,[end,end]]){if(cursor+minutes<=Math.min(a,end))return {date:day.date,start:String(Math.floor(cursor/60)).padStart(2,'0')+':'+String(cursor%60).padStart(2,'0'),remaining:day.remaining-minutes};cursor=Math.max(cursor,b);if(cursor+minutes>end)break;}}
 return null;
}
export function scheduleIssue(s:State,t:Task,date:string,start:string,minutes:number){
 if(!dateString.safeParse(date).success)return '请选择有效日期。';
 if(!Number.isInteger(minutes)||minutes<=0||minutes>1440)return '请输入有效预计时长。';
 if(start&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))return '请选择有效开始时间。';
 if(t.deadline&&date>t.deadline)return '安排日期晚于事项截止日期。';
 if(t.parentId||liveTasks(s).some(x=>x.parentId===t.id))return '关联时段请在日历中调整。';
 if((t.actual||0)>Math.round(s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0)/60)&&t.date!==date)return '此事项有未分段的历史投入，请保留原日期并新建下一步。';
 const day=planningDays(s,date,date,t.id)[0];if(minutes>day.remaining)return '当天剩余容量不足，请调整日期、时长或当天可安排总时长。';
 if(start){const a=minuteOf(start),b=a+minutes;if(b>1440)return '安排不能跨越当天。';if(day.tasks.some(x=>x.start&&minuteOf(x.start)<b&&minuteOf(x.start)+x.minutes>a))return '与已有固定事项重叠，请调整开始时间。';}
 return '';
}
export function applyPlanningSchedule(input:State,command:Command){
 const p=z.object({id:z.string(),date:dateString,start:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),minutes:z.number().int().min(1).max(1440)}).parse(command.payload),s=structuredClone(input),t=s.tasks.find(t=>t.id===p.id&&!t.deletedAt&&!finished(t));if(!t)throw Error('请选择未完成事项。');const issue=scheduleIssue(s,t,p.date,p.start,p.minutes);if(issue)throw Error(issue);
 t.date=p.date;t.start=p.start;t.minutes=p.minutes;refreshTimeProgress(t);assertTask(s,t);return validateState(s);
}
