import {currentEstimate} from './task-plans.ts';
import type {State,Task} from './model.ts';

export function progressSource(task:Task){return task.progressSource||(task.progress>0?'manual':'time');}
export function refreshTimeProgress(task:Task){
 if(task.progress===100||progressSource(task)==='manual')return;
 task.progressSource='time';task.progress=currentEstimate(task)?Math.min(99,Math.round((task.actual||0)/currentEstimate(task)*100)):0;
}
export function addRecordedSeconds(state:State,task:Task,seconds:number){
 const before=state.sessions.filter(x=>x.taskId===task.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0);
 task.actual=(task.actual||0)+Math.round((before+seconds)/60)-Math.round(before/60);
 refreshTimeProgress(task);
}
const formatters=new Map<string,Intl.DateTimeFormat>();
export function localParts(instant:number,timeZone:string){
 let formatter=formatters.get(timeZone);if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(timeZone,formatter);}
 const p=formatter.formatToParts(instant);
 const v=(key:string)=>p.find(x=>x.type===key)!.value;
 return {date:`${v('year')}-${v('month')}-${v('day')}`,time:`${v('hour')}:${v('minute')}`,minute:Number(v('hour'))*60+Number(v('minute'))+Number(v('second'))/60+(instant%1000)/60000};
}
export function localInstant(value:string,timeZone:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('请填写完整的实际开始与结束时间。');
 const target=Date.parse(value+':00Z');let result=target;
 if(!Number.isFinite(target))throw Error('实际时间无效。');
 for(let i=0;i<4;i++){const p=localParts(result,timeZone);result+=target-Date.parse(p.date+'T'+p.time+':00Z');}
 const p=localParts(result,timeZone);if(p.date+'T'+p.time!==value)throw Error('该时间在当前时区不存在，请检查夏令时切换日期。');
 return new Date(result).toISOString();
}
export type ActualBlock={id:string;sessionId:string;spanIndex:number;startedAt:string;taskId:string;date:string;start:number;end:number;seconds:number};
// Split at calendar day and UTC-offset changes. This preserves real elapsed
// seconds even on DST days; no planned date is substituted for recorded work.
export function sessionBlocks(session:State['sessions'][number],timezone:string):ActualBlock[]{
 const result:ActualBlock[]=[];if(session.deletedAt)return result;
 for(const [spanIndex,span] of (session.spans||[]).entries()){
  let cursor=Date.parse(span.startedAt);const end=Date.parse(span.endedAt);
  while(cursor<end){const p=localParts(cursor,timezone),next=Math.min(end,(Math.floor(cursor/60000)+1)*60000),length=(next-cursor)/60000,last=result.at(-1);
   if(last&&last.spanIndex===spanIndex&&last.date===p.date&&Math.abs(last.end-p.minute)<.001){last.end+=length;last.seconds=Math.round(last.seconds*1000+next-cursor)/1000;}
   else result.push({id:session.id+':'+result.length,sessionId:session.id,spanIndex,startedAt:new Date(cursor).toISOString(),taskId:session.taskId,date:p.date,start:p.minute,end:p.minute+length,seconds:(next-cursor)/1000});
   cursor=next;
  }
 }
 return result;
}
export function investmentByTask(state:State){
 const result=new Map<string,Map<string,number>>();
 const grouped=new Map<string,State['sessions']>();for(const x of state.sessions.filter(x=>!x.deletedAt)){const list=grouped.get(x.taskId)||[];list.push(x);grouped.set(x.taskId,list);}
 for(const t of state.tasks.filter(t=>!t.deletedAt&&!t.templateOnly)){
  const dates=new Map<string,number>(),sessions=grouped.get(t.id)||[],seconds=sessions.reduce((n,x)=>n+x.seconds,0),actual=t.actual||0;
  // Historical manual corrections may be smaller than recorded sessions.
  // Scale rather than double count, while keeping task totals authoritative.
  const credited=Math.min(actual,Math.round(seconds/60)),factor=seconds?credited/seconds:0;
  const add=(date:string,n:number)=>{if(date&&n)dates.set(date,(dates.get(date)||0)+n);};
  for(const x of sessions){const blocks=sessionBlocks(x,state.settings.timezone);let timed=0;for(const b of blocks){add(b.date,b.seconds*factor);timed+=b.seconds;}add(x.date,Math.max(0,x.seconds-timed)*factor);}
  add(t.date,Math.max(0,actual-credited));result.set(t.id,dates);
 }
 return result;
}
export function minutesInRange(dates:Map<string,number>|undefined,from:string,to=from){return [...(dates||[])].reduce((n,[d,v])=>n+(d>=from&&d<=to?v:0),0);}
