import {z} from 'zod';
import {type Task,type State,type Command,dateString,idString,optionalTime,minuteOf,liveTasks,validateState,businessDate,formatTime} from './model.ts';
export type TaskPlan=NonNullable<Task['plans']>[number];
export function rawPlans(t:Task):TaskPlan[]{return t.plans??(t.date?[{id:'legacy',date:t.date,start:t.start,minutes:t.minutes}]:[]);}
export function remainingMinutes(t:Task){return Math.max(0,t.remainingEstimate?t.remainingEstimate.minutes-((t.actual||0)-t.remainingEstimate.actualAtSet):t.minutes-(t.actual||0));}
export function currentEstimate(t:Task){return t.remainingEstimate?(t.actual||0)+remainingMinutes(t):t.minutes;}
export function planSeconds(s:State,t:Task,p:TaskPlan){return s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt&&(x.planId===p.id||!x.planId&&p.id==='legacy')).reduce((n,x)=>n+x.seconds,0);}
export function planLedger(s:State,t:Task,today=businessDate(s.settings)){
 const unlocated=Math.max(0,(t.actual||0)-Math.round(s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0)/60));
 return rawPlans(t).map(p=>{const seconds=planSeconds(s,t,p),used=Math.max(0,(seconds-(p.accountedSeconds||0))/60),left=Math.max(0,p.minutes-used);return {...p,seconds,used,left,needsReview:!p.closed&&left>0&&(p.date<today||!t.remainingEstimate&&unlocated>0)};});
}
/** Without state this is a structural lookup, with state it projects remaining planned work. */
export function taskPlans(t:Task,s?:State):TaskPlan[]{
 if(!s||!t.remainingEstimate)return rawPlans(t).filter(p=>!p.closed);
 return planLedger(s,t).filter(p=>!p.closed&&p.left>0).map(p=>({id:p.id,date:p.date,start:p.used>0?'':p.start,minutes:p.left}));
}
export function allocatedMinutes(t:Task,s?:State){return taskPlans(t,s).reduce((n,p)=>n+p.minutes,0);}
export function planningMetrics(s:State,t:Task,today=businessDate(s.settings)){
 const ledger=planLedger(s,t,today),scheduled=ledger.filter(p=>!p.closed&&!p.needsReview).reduce((n,p)=>n+p.left,0),remaining=remainingMinutes(t);
 return {initial:t.remainingEstimate?.initialMinutes??t.minutes,actual:t.actual||0,remaining,total:(t.actual||0)+remaining,scheduled,unallocated:remaining-scheduled,review:ledger.filter(p=>p.needsReview),ledger};
}
export function planningSignature(t:Task){return JSON.stringify({actual:t.actual,minutes:t.minutes,estimate:t.remainingEstimate,plans:rawPlans(t)});}
export function calendarTasks(s:State){return liveTasks(s).flatMap(t=>taskPlans(t,s).map(p=>({...t,date:p.date,start:p.start,minutes:p.minutes,planId:p.id,entryId:t.id+':'+p.id})));}
export function taskOnDate(t:Task,date:string,s?:State){return taskPlans(t,s).some(p=>p.date===date);}
export function planForDate(t:Task,date:string){const plans=t.plans?.filter(p=>!p.closed&&p.date===date);return plans?.length===1?plans[0].id:undefined;}
const slot=()=>z.object({id:idString,date:dateString,start:optionalTime,minutes:z.number().int().min(1).max(1440)});
function checkSlots(t:Task,plans:TaskPlan[]){for(const p of plans){if(t.deadline&&p.date>t.deadline)throw Error('安排日期晚于事项截止日期。');if(p.start&&minuteOf(p.start)+p.minutes>1440)throw Error('安排不能跨越当天。');if(p.start&&plans.some(x=>x.id!==p.id&&x.date===p.date&&x.start&&minuteOf(x.start)<minuteOf(p.start)+p.minutes&&minuteOf(x.start)+x.minutes>minuteOf(p.start)))throw Error('同一任务的安排不能重叠。');}}
export function applyTaskPlan(input:State,command:Command,instant=new Date()){
 const {id}=z.object({id:idString}).parse(command.payload),s=structuredClone(input),t=s.tasks.find(t=>t.id===id&&!t.deletedAt);if(!t)throw Error('事项不存在。');
 if(t.parentId||liveTasks(s).some(x=>x.parentId===t.id))throw Error('请先解除包含或并行关系，再拆分安排。');
 if(s.focus?.taskId===id)throw Error('请先结束当前专注，再调整剩余计划。');
 if(command.type==='task.plan.reestimate'){
  const p=z.object({id:idString,expected:z.string(),remaining:z.number().int().min(0).max(100000),plans:z.array(slot()).max(366)}).parse(command.payload);
  if(p.expected!==planningSignature(t))throw Error('记录已更新，请重新打开剩余计划后核对。');
  if(t.progress===100)throw Error('请先将任务改为未完成，再安排剩余工作。');
  const sum=p.plans.reduce((n,x)=>n+x.minutes,0);if(sum>p.remaining)throw Error('未做分段超出剩余计划 '+formatTime(sum-p.remaining)+'，请调整分段。');
  if(new Set(p.plans.map(x=>x.id)).size!==p.plans.length)throw Error('安排 ID 重复。');
  const old=rawPlans(t);for(const next of p.plans){const prior=old.find(x=>x.id===next.id);if(prior&&(prior.closed||planSeconds(s,t,prior)>0))throw Error('有投入的旧分段请结束剩余安排，再新建未做分段；原投入保留。');}
  if(p.plans.some(x=>x.date<businessDate(s.settings,instant)))throw Error('请将未做分段安排到今天或以后，或移除这段未做安排。');
  checkSlots(t,p.plans);
  t.remainingEstimate={initialMinutes:t.remainingEstimate?.initialMinutes??t.minutes,minutes:p.remaining,actualAtSet:t.actual||0};
  // Close old slots rather than deleting history. Submitted slots are the entire new plan, not an increment.
  t.plans=[...old.filter(x=>!p.plans.some(y=>y.id===x.id)).map(x=>({...x,closed:true})),...p.plans];
  return validateState(s);
 }
 const p=z.object({id:idString,planId:idString,date:dateString.optional(),start:optionalTime.optional(),minutes:z.number().int().min(1).max(1440).optional()}).parse(command.payload);
 const plans=rawPlans(t).map(p=>({...p})),index=plans.findIndex(x=>x.id===p.planId),old=plans[index];
 if(command.type==='task.plan.delete'){
  if(index<0||old.closed)return input;
  if(t.remainingEstimate)old.closed=true;else plans.splice(index,1);
 }else if(command.type==='task.plan.save'){
  if(!p.date||p.start===undefined||!p.minutes)throw Error('请填写本段日期和时长。');
  if(old?.closed)throw Error('这段安排已结束，请添加新的未做分段。');
  if(t.remainingEstimate&&old&&planSeconds(s,t,old)>0)throw Error('请使用调整剩余计划，只重新安排未做部分。');
  const next={id:p.planId,date:p.date,start:p.start,minutes:p.minutes};if(index<0)plans.push(next);else plans[index]=next;
  if(t.remainingEstimate){const total=plans.filter(x=>!x.closed).reduce((n,x)=>n+Math.max(0,x.minutes-Math.max(0,planSeconds(s,t,x)-(x.accountedSeconds||0))/60),0);if(total>remainingMinutes(t))throw Error('未做分段超出剩余计划 '+formatTime(total-remainingMinutes(t))+'，请调整分段。');}
  else if(plans.reduce((n,x)=>n+x.minutes,0)>t.minutes)throw Error('分段合计超过任务总预计，请使用调整剩余计划。');
  checkSlots(t,plans.filter(x=>!x.closed));
 }else throw Error('未知安排操作。');
 t.plans=plans.sort((a,b)=>a.date.localeCompare(b.date)||(a.start||'99').localeCompare(b.start||'99'));
 return validateState(s);
}
