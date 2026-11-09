import {z} from 'zod';
import {type Task,type State,type Command,dateString,idString,optionalTime,minuteOf,liveTasks,validateState} from './model.ts';
export type TaskPlan={id:string;date:string;start:string;minutes:number};
/** Undefined preserves the old single-date plan; [] explicitly means unplanned. */
export function taskPlans(t:Task):TaskPlan[]{return t.plans??(t.date?[{id:'legacy',date:t.date,start:t.start,minutes:t.minutes}]:[]);}
export function allocatedMinutes(t:Task){return taskPlans(t).reduce((n,p)=>n+p.minutes,0);}
export function calendarTasks(s:State){return liveTasks(s).flatMap(t=>taskPlans(t).map(p=>({...t,date:p.date,start:p.start,minutes:p.minutes,planId:p.id,entryId:t.id+':'+p.id})));}
export function taskOnDate(t:Task,date:string){return taskPlans(t).some(p=>p.date===date);}
export function planForDate(t:Task,date:string){const plans=t.plans?.filter(p=>p.date===date);return plans?.length===1?plans[0].id:undefined;}
export function applyTaskPlan(input:State,command:Command){
 const p=z.object({id:idString,planId:idString,date:dateString.optional(),start:optionalTime.optional(),minutes:z.number().int().min(1).max(1440).optional()}).parse(command.payload);
 const s=structuredClone(input),t=s.tasks.find(t=>t.id===p.id&&!t.deletedAt);if(!t)throw Error('事项不存在。');
 if(t.parentId||liveTasks(s).some(x=>x.parentId===t.id))throw Error('请先解除包含或并行关系，再拆分安排。');
 const plans=taskPlans(t).map(p=>({...p})),index=plans.findIndex(x=>x.id===p.planId);
 if(command.type==='task.plan.delete'){if(index<0)throw Error('这段安排已不存在，请刷新后重试。');plans.splice(index,1);}
 else if(command.type==='task.plan.save'){
  if(!p.date||p.start===undefined||!p.minutes)throw Error('请填写本段日期和时长。');
  if(t.deadline&&p.date>t.deadline)throw Error('安排日期晚于事项截止日期。');
  if(p.start&&minuteOf(p.start)+p.minutes>1440)throw Error('安排不能跨越当天。');
  const next={id:p.planId,date:p.date,start:p.start,minutes:p.minutes};if(index<0)plans.push(next);else plans[index]=next;
  if(plans.reduce((n,x)=>n+x.minutes,0)>t.minutes)throw Error('分段合计超过任务总预计，请先调整总预计时长。');
  // Same-task slots cannot overlap. Other commitments may intentionally run in parallel.
  if(p.start&&plans.some(x=>x.id!==p.planId&&x.date===p.date&&x.start&&minuteOf(x.start)<minuteOf(p.start!)+p.minutes!&&minuteOf(x.start)+x.minutes>minuteOf(p.start!)))throw Error('同一任务的安排不能重叠。');
 }else throw Error('未知安排操作。');
 t.plans=plans.sort((a,b)=>a.date.localeCompare(b.date)||(a.start||'99').localeCompare(b.start||'99'));
 // date/start remain the legacy actual-time anchor; never rewrite history when planning.
 return validateState(s);
}
