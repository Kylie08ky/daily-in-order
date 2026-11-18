import {z} from 'zod';
import {type State,type Command,idString,dateString,offsetDate,liveTasks,finished,minuteOf,validateState} from './model.ts';
import {taskPlans,rawPlans,planSeconds,remainingMinutes} from './task-plans.ts';

/** Move only the selected day's plans. Keep legacy date as the actual-time anchor. */
export function deferTask(input:State,command:Command):State{
 const {id,from}=z.object({id:idString,from:dateString}).parse(command.payload);
 const s=structuredClone(input),t=liveTasks(s).find(t=>t.id===id);
 if(!t)throw Error('事项不存在。');
 if(finished(t))throw Error('已完成事项无需顺延。');
 if(s.focus?.taskId===id)throw Error('请先结束当前专注，再顺延安排。');
 if(t.parentId||liveTasks(s).some(x=>x.parentId===id))throw Error('关联时段请在日历中一起调整。');
 const next=offsetDate(from,1),plans=taskPlans(t);
 if(!plans.some(p=>p.date===from))throw Error('这一天没有可顺延的安排。');
 if(t.deadline&&next>t.deadline)throw Error('安排日期晚于事项截止日期。');
 const closed=rawPlans(t).filter(p=>p.closed),usedIds=new Set([...rawPlans(t).map(p=>p.id),...s.sessions.filter(x=>x.taskId===id).map(x=>x.planId)]);
 const fresh=()=>{let n=0,planId;do{planId=`defer:${next}:${n++}`;}while(usedIds.has(planId));usedIds.add(planId);return planId;};
 // Never schedule more than the task still needs (task-level time and other open days included).
 let budget=remainingMinutes(t)-plans.filter(p=>p.date!==from).reduce((n,p)=>n+p.minutes,0);
 const ended:typeof closed=[],moved=plans.flatMap(p=>{
  if(p.date!==from)return [{...p}];
  const seconds=planSeconds(s,t,p);
  if(seconds<=0)return [{...p,date:next}];
  // Worked slot: keep the original plan on its day (history) and move only the unfinished remainder.
  const left=Math.min(p.minutes-Math.round(Math.max(0,seconds-(p.accountedSeconds||0))/60),budget);
  if(left<=0)throw Error('这段安排的时间已用完；请用调整剩余计划设定还需多久。');
  budget-=left;
  ended.push({...p,closed:true,endReason:'cancelled'});
  return [{id:fresh(),date:next,start:p.start,minutes:left}];
 });
 for(let i=0;i<moved.length;i++)for(let j=i+1;j<moved.length;j++){
  const a=moved[i],b=moved[j];
  if(a.date===b.date&&a.start&&b.start&&minuteOf(a.start)<minuteOf(b.start)+b.minutes&&minuteOf(b.start)<minuteOf(a.start)+a.minutes)throw Error('同一任务的安排不能重叠。');
 }
 // Like "adjust remaining work": record what is left so the closed history no longer counts against the estimate.
 if(ended.length)t.remainingEstimate={initialMinutes:t.remainingEstimate?.initialMinutes??t.minutes,minutes:remainingMinutes(t),actualAtSet:t.actual||0};
 t.plans=[...closed,...ended,...moved].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 return validateState(s);
}
