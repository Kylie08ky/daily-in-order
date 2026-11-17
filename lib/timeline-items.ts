import {taskPlans,rawPlans,planStatus,planSeconds,type PlanStatus} from './task-plans.ts';
import {type State,type Task,minuteOf,clock} from './model.ts';
import {sessionBlocks,investmentByTask,minutesInRange,type ActualBlock} from './task-investment.ts';
export type TimelineFilter='all'|'planned'|'actual'|'completed'|'cancelled';
export type TimelineItem={id:string;task:Task;begin:number;length:number;planId?:string;block?:ActualBlock;status?:PlanStatus;historical?:boolean;plannedStart?:string;plannedEnd?:string;plannedMinutes?:number;actualMinutes?:number;actualStart?:number;actualEnd?:number;untimedActual?:boolean};
export function untimedTasks(state:State,date:string,tasks:Task[]){
 const investments=investmentByTask(state);
 return tasks.filter(t=>!t.deletedAt&&!t.templateOnly).filter(t=>{
  if(taskPlans(t,state).some(p=>p.date===date&&!p.start))return true;
  const actual=minutesInRange(investments.get(t.id),date);
  const placed=state.sessions.filter(x=>!x.deletedAt&&x.taskId===t.id).flatMap(x=>sessionBlocks(x,state.settings.timezone)).filter(b=>b.date===date).reduce((n,b)=>n+b.seconds/60,0);
  return actual>0&&actual-placed>0.5;
 });
}
/** Display original plans independently of future capacity and real investment. No writes/migration. */
export function timelineItems(state:State,date:string,_tasks:Task[],filter:TimelineFilter='all'):TimelineItem[]{
 const active=state.tasks.filter(t=>!t.deletedAt&&!t.templateOnly),lookup=new Map(active.map(t=>[t.id,t]));
 const blocks=state.sessions.filter(s=>!s.deletedAt&&lookup.has(s.taskId)).flatMap(s=>sessionBlocks(s,state.settings.timezone));
 const plans:TimelineItem[]=active.flatMap(t=>rawPlans(t).filter(p=>p.date===date&&p.start).map(p=>{
  const status=planStatus(state,t,p),seconds=planSeconds(state,t,p);
  return {id:'plan:'+t.id+':'+p.id,planId:p.id,task:t,begin:minuteOf(p.start),length:p.minutes,status,historical:!!p.closed||t.progress===100||seconds>0,plannedStart:p.start,plannedEnd:clock(minuteOf(p.start)+p.minutes),plannedMinutes:p.minutes,actualMinutes:seconds/60,untimedActual:(t.actual||0)>0&&!blocks.some(b=>b.taskId===t.id)};
 }));
 const actual:TimelineItem[]=blocks.filter(b=>b.date===date).map(b=>({id:b.id,task:lookup.get(b.taskId)!,begin:b.start,length:b.end-b.start,block:b,actualStart:b.start,actualEnd:b.end,actualMinutes:b.seconds/60}));
 return [...plans,...actual].filter(item=>{
  const cancelled=item.status==='cancelled'||item.status==='closed_with_task';
  if(filter==='cancelled')return cancelled;
  if(filter==='actual')return !!item.block;
  if(filter==='completed')return item.block?item.task.progress===100:item.status==='completed';
  if(filter==='planned')return !item.block;
  return !cancelled||(item.actualMinutes||0)>0;
 }).sort((a,b)=>a.begin-b.begin||a.id.localeCompare(b.id));
}

// Half-open intervals: a 09:30 finish and 09:30 start do not overlap.
export function layoutTimeline(items:TimelineItem[]){
 const result=items.map(x=>({...x,lane:0,lanes:1})).sort((a,b)=>a.begin-b.begin),groups:typeof result[]=[];let until=-1;
 for(const item of result){if(!groups.length||item.begin>=until-.00001){groups.push([]);until=-1;}groups.at(-1)!.push(item);until=Math.max(until,item.begin+item.length);}
 for(const group of groups){const ends:number[]=[];for(const item of group){let lane=ends.findIndex(end=>end<=item.begin+.00001);if(lane<0)lane=ends.length;item.lane=lane;ends[lane]=item.begin+item.length;}group.forEach(item=>item.lanes=ends.length);}
 return result;
}
