import {taskPlans} from './task-plans.ts';
import {type State,type Task,minuteOf} from './model.ts';
import {sessionBlocks,type ActualBlock} from './task-investment.ts';
export type TimelineItem={id:string;task:Task;begin:number;length:number;planId?:string;block?:ActualBlock};
export function timelineItems(state:State,date:string,tasks:Task[]):TimelineItem[]{
 const active=new Map(state.tasks.filter(t=>!t.deletedAt&&!t.templateOnly).map(t=>[t.id,t]));
 const blocks=state.sessions.filter(s=>!s.deletedAt&&active.has(s.taskId)).flatMap(s=>sessionBlocks(s,state.settings.timezone));
 // A duration-only record has no reliable calendar position. Never substitute its plan.
 const recorded=new Set(state.sessions.filter(s=>!s.deletedAt&&s.seconds>0).map(s=>s.taskId));
 return [
  ...tasks.filter(t=>!t.deletedAt&&!t.templateOnly).flatMap(t=>taskPlans(t,state).filter(p=>p.date===date&&p.start&&(t.plans?!state.sessions.some(x=>!x.deletedAt&&x.seconds>0&&x.taskId===t.id&&x.planId===p.id):!recorded.has(t.id))).map(p=>({id:'plan:'+t.id+':'+p.id,planId:t.plans?p.id:undefined,task:t,begin:minuteOf(p.start),length:p.minutes}))),
  ...blocks.filter(b=>b.date===date).map(b=>({id:b.id,task:active.get(b.taskId)!,begin:b.start,length:b.end-b.start,block:b}))
 ].sort((a,b)=>a.begin-b.begin);
}

// Half-open intervals: a 09:30 finish and 09:30 start do not overlap.
export function layoutTimeline(items:TimelineItem[]){
 const result=items.map(x=>({...x,lane:0,lanes:1})).sort((a,b)=>a.begin-b.begin),groups:typeof result[]=[];let until=-1;
 for(const item of result){if(!groups.length||item.begin>=until-.00001){groups.push([]);until=-1;}groups.at(-1)!.push(item);until=Math.max(until,item.begin+item.length);}
 for(const group of groups){const ends:number[]=[];for(const item of group){let lane=ends.findIndex(end=>end<=item.begin+.00001);if(lane<0)lane=ends.length;item.lane=lane;ends[lane]=item.begin+item.length;}group.forEach(item=>item.lanes=ends.length);}
 return result;
}
