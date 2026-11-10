import {z} from 'zod';
import {type State,type Command,idString,dateString,offsetDate,liveTasks,finished,minuteOf,validateState} from './model.ts';
import {taskPlans} from './task-plans.ts';

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
 const usedIds=new Set([...plans.map(p=>p.id),...s.sessions.filter(x=>x.taskId===id).map(x=>x.planId)]);
 const moved=plans.map(p=>{
  if(p.date!==from)return {...p};
  let planId=p.id;
  // A consumed slot is replaced by actual blocks on the timeline. Give its
  // deferred plan a fresh identity while retaining every historical session link.
  if(s.sessions.some(x=>x.taskId===id&&x.planId===p.id&&x.seconds>0&&!x.deletedAt)){
   let n=0;do{planId=`defer:${next}:${n++}`;}while(usedIds.has(planId));usedIds.add(planId);
  }
  return {...p,id:planId,date:next};
 });
 for(let i=0;i<moved.length;i++)for(let j=i+1;j<moved.length;j++){
  const a=moved[i],b=moved[j];
  if(a.date===b.date&&a.start&&b.start&&minuteOf(a.start)<minuteOf(b.start)+b.minutes&&minuteOf(b.start)<minuteOf(a.start)+a.minutes)throw Error('同一任务的安排不能重叠。');
 }
 t.plans=moved.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 return validateState(s);
}
