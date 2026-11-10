import type {State,Task} from './model.ts';
import type {Entry} from './life-schema.ts';
import {investmentByTask,sessionBlocks} from './task-investment.ts';

/** Time stays in the original task/sessions. Progress records only reference it. */
export function scopeDates(s:State,t:Task,sessionId=''):Map<string,number>{
 if(!sessionId)return investmentByTask({...s,tasks:[t],sessions:s.sessions.filter(x=>x.taskId===t.id)}).get(t.id)||new Map();
 const session=s.sessions.find(x=>x.id===sessionId&&x.taskId===t.id&&!x.deletedAt);
 if(!session)return new Map();
 const seconds=s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0),factor=seconds?Math.min(t.actual||0,Math.round(seconds/60))/seconds:0;
 const dates=new Map<string,number>();let timed=0;
 const add=(d:string,n:number)=>dates.set(d,(dates.get(d)||0)+n);
 for(const block of sessionBlocks(session,s.settings.timezone)){add(block.date,block.seconds*factor);timed+=block.seconds;}
 add(session.date,Math.max(0,session.seconds-timed)*factor);return dates;
}
export const sumMinutes=(dates:Map<string,number>)=>[...dates.values()].reduce((a,b)=>a+b,0);
export function entryMinutes(s:State,e:Entry){
 const t=s.tasks.find(t=>t.id===e.taskId&&!t.deletedAt);if(!t)return e.taskId?0:e.minutes;
 const total=sumMinutes(scopeDates(s,t,e.sessionId));
 if(!e.progressOnly)return t.actual||0;
 const allocated=s.life.entries.filter(x=>!x.deletedAt&&x.taskId===e.taskId&&x.kind===e.kind&&(x.sessionId||'')===(e.sessionId||'')).reduce((n,x)=>n+(x.allocation||0),0);
 return e.allocation==null?total:e.allocation*(allocated>total&&allocated?total/allocated:1);
}
/** De-duplicate only explicitly supplied IDs, never infer identities for anonymous quantities. */
export function effectiveLearningUnits(entries:Entry[]){
 const seen=new Set<string>(),result=new Map<string,number>();
 for(const e of entries.filter(e=>!e.deletedAt&&e.kind==='german').slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){
  let units=e.units;
  if(e.rewatch||e.quantityKnown===false)units=0;
  else if(e.videoIds?.length){units=0;for(const id of new Set(e.videoIds)){const key=e.refId+'\u0000'+id;if(!seen.has(key)){seen.add(key);units++;}}}
  result.set(e.id,units);
 }
 return result;
}
export function taskActivityMinutes(s:State,t:Task,kind:Entry['kind'],fallback:string,refId:string,from:string,to:string){
 const entries=s.life.entries.filter(e=>!e.deletedAt&&e.taskId===t.id&&e.kind===kind);
 const modern=entries.filter(e=>e.progressOnly),whole=scopeDates(s,t),chunks:Array<{scope:string;dates:Map<string,number>}>=[];
 const residual=new Map(whole);
 for(const session of s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt)){
  const dates=scopeDates(s,t,session.id);chunks.push({scope:session.id,dates});
  for(const [d,n] of dates)residual.set(d,Math.max(0,(residual.get(d)||0)-n));
 }
 chunks.push({scope:'',dates:residual});let result=0;
 for(const chunk of chunks){
  const specific=modern.filter(e=>e.sessionId===chunk.scope&&!!chunk.scope),chosen=specific.length?specific:modern.filter(e=>!e.sessionId);
  const scopeTotal=sumMinutes(specific.length?scopeDates(s,t,chunk.scope):whole);
  const allocations=chosen.filter(e=>e.allocation!=null),allocated=allocations.reduce((n,e)=>n+(e.allocation||0),0),scale=allocated>scopeTotal&&allocated?scopeTotal/allocated:1;
  const inRange=[...chunk.dates].reduce((n,[d,m])=>n+(d>=from&&d<=to?m:0),0);
  if(!refId){result+=inRange;continue;}
  if(allocations.length){
   const share=allocations.filter(e=>(e.timeRefId||e.refId)===refId).reduce((n,e)=>n+(e.allocation||0)*scale,0);
   result+=scopeTotal?inRange*share/scopeTotal:0;
  }else{
   const owner=chosen.find(e=>e.timeRefId)?.timeRefId||chosen[0]?.refId||fallback;
   if(owner===refId)result+=inRange;
  }
 }
 return result;
}

export function progressRecordOrder(s:State,a:Entry,b:Entry){
 const session=(e:Entry)=>s.sessions.find(x=>x.id===e.sessionId);
 const ad=session(a)?.date||a.date,bd=session(b)?.date||b.date;
 return ad.localeCompare(bd)||(session(a)?.endedAt||ad+'T00:00:00Z').localeCompare(session(b)?.endedAt||bd+'T00:00:00Z')||s.life.entries.findIndex(e=>e.id===a.id)-s.life.entries.findIndex(e=>e.id===b.id);
}
