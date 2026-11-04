import type {State,Task} from './model.ts';
import type {Course} from './life-schema.ts';

// Explicit activity links win; then one module mapping; then project fallback.
export function germanTarget(s:State,t:Task):Course|undefined{
 const courses=s.life.courses.filter(c=>!c.deletedAt);
 if(t.activity?.kind==='german')return courses.find(c=>c.id===t.activity!.refId);
 return courses.find(c=>c.projectId===t.projectId&&t.moduleId&&c.moduleIds.includes(t.moduleId))||courses.find(c=>c.projectId&&c.projectId===t.projectId&&c.includeProject);
}
export function germanRecords(s:State,refId='',from='2000-01-01',to='2100-12-31'){
 const tasks=s.tasks.filter(t=>!t.deletedAt&&t.progress===100&&t.date>=from&&t.date<=to);
 const byId=new Map(tasks.map(t=>[t.id,t]));
 const entries=s.life.entries.filter(e=>!e.deletedAt&&e.kind==='german'&&(!e.taskId||byId.has(e.taskId))).map(e=>({...e,date:byId.get(e.taskId)?.date||e.date,minutes:e.taskId?(byId.get(e.taskId)?.actual??0):e.minutes})).filter(e=>e.date>=from&&e.date<=to&&(!refId||e.refId===refId));
 const selected=tasks.filter(t=>{
  const explicit=t.activity?.kind==='german'?t.activity.refId:undefined;
  const entry=s.life.entries.find(e=>!e.deletedAt&&e.taskId===t.id&&e.kind==='german');
  const owner=explicit||entry?.refId||germanTarget(s,t)?.id;
  return !!owner&&(!refId||owner===refId);
 });
 const standalone=entries.filter(e=>!e.taskId),missing=selected.filter(t=>t.actual===null);
 return {entries,minutes:selected.reduce((n,t)=>n+(t.actual??0),0)+standalone.reduce((n,e)=>n+e.minutes,0),estimated:missing.reduce((n,t)=>n+t.minutes,0),missing:missing.length,units:entries.reduce((n,e)=>n+e.units,0),sessions:selected.length+standalone.length};
}
