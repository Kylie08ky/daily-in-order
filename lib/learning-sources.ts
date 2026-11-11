import type {State} from './model.ts';
import {germanTarget} from './learning-target.ts';
import {taskActivitySources,sumMinutes,scopeDates} from './progress-records.ts';

export type LearningSource={key:string;taskId:string;entryId:string;title:string;plannedDate:string;completed:boolean;total:number;minutes:number;parts:Array<{date:string;minutes:number;sessionId:string;source:'focus'|'manual'|'legacy';shared:boolean;originalMinutes:number}>};
export function learningSources(s:State,refId:string,from:string,to:string){
 const rows:LearningSource[]=[],unresolved:Array<{key:string;title:string;minutes:number;reason:string}>=[];
 for(const t of s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly)){
  const fallback=germanTarget(s,t)?.id||'';
  const relevant=fallback===refId||s.life.entries.some(e=>!e.deletedAt&&e.taskId===t.id&&e.kind==='german'&&(e.timeRefId||e.refId)===refId);
  if(!relevant)continue;
  const parts=taskActivitySources(s,t,'german',fallback).filter(x=>x.refId===refId&&x.date>=from&&x.date<=to).map(x=>({...x,source:(x.sessionId?(s.sessions.find(v=>v.id===x.sessionId)?.source==='manual'?'manual':'focus'):'legacy') as 'focus'|'manual'|'legacy'}));
  const minutes=parts.reduce((n,x)=>n+x.minutes,0);
  if(minutes>1e-9)rows.push({key:'task:'+t.id,taskId:t.id,entryId:'',title:t.title,plannedDate:t.date,completed:t.progress===100,total:t.actual||0,minutes,parts});
  const missing=Math.max(0,(t.actual||0)-sumMinutes(scopeDates(s,t)));
  if(missing>1e-9&&fallback===refId)unresolved.push({key:t.id,title:t.title,minutes:missing,reason:'缺少实际日期，未计入当前周期；请核对原记录。'});
 }
 for(const e of s.life.entries.filter(e=>!e.deletedAt&&e.kind==='german'&&(e.timeRefId||e.refId)===refId)){
  if(e.taskId){if(!s.tasks.some(t=>t.id===e.taskId))unresolved.push({key:e.id,title:e.note||e.id,minutes:e.minutes,reason:'原任务缺失，无法确认是否重复；未计入合计。'});continue;}
  if(e.minutes>0&&e.date>=from&&e.date<=to)rows.push({key:'entry:'+e.id,taskId:'',entryId:e.id,title:e.note||'独立学习记录',plannedDate:'',completed:true,total:e.minutes,minutes:e.minutes,parts:[{date:e.date,minutes:e.minutes,sessionId:'',source:'legacy',shared:false,originalMinutes:e.minutes}]});
 }
 rows.sort((a,b)=>(b.parts.at(-1)?.date||'').localeCompare(a.parts.at(-1)?.date||'')||a.key.localeCompare(b.key));
 return {rows,unresolved,total:rows.reduce((n,r)=>n+r.minutes,0)};
}
