import {effectiveLearningUnits,taskActivityMinutes,entryMinutes} from './progress-records.ts';
import type {State,Task} from './model.ts';
import type {Course} from './life-schema.ts';

// Explicit activity links win; then one module mapping; then project fallback.
export function germanTarget(s:State,t:Pick<Task,'id'|'activity'|'projectId'|'moduleId'>):Course|undefined{
 const courses=s.life.courses.filter(c=>!c.deletedAt);
 if(t.activity?.kind==='german')return courses.find(c=>c.id===t.activity!.refId);
 const entry=s.life.entries.find(e=>!e.deletedAt&&e.taskId===t.id&&e.kind==='german');
 if(entry)return courses.find(c=>c.id===(entry.timeRefId||entry.refId));
 if(t.activity)return undefined;
 return courses.find(c=>c.projectId===t.projectId&&t.moduleId&&c.moduleIds.includes(t.moduleId))||courses.find(c=>c.projectId&&c.projectId===t.projectId&&c.includeProject);
}
export function germanRecords(s:State,refId='',from='2000-01-01',to='2100-12-31'){
 const modernTasks=s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly&&s.life.entries.some(e=>e.taskId===t.id&&e.progressOnly&&e.kind==='german'));
 const modernIds=new Set(modernTasks.map(t=>t.id));
 const tasks=s.tasks.filter(t=>!modernIds.has(t.id)&&!t.deletedAt&&!t.templateOnly&&t.progress===100&&t.date>=from&&t.date<=to);
 const byId=new Map(tasks.map(t=>[t.id,t]));
 const entries=s.life.entries.filter(e=>!e.deletedAt&&e.kind==='german'&&(!e.taskId||byId.has(e.taskId))).map(e=>({...e,date:byId.get(e.taskId)?.date||e.date,minutes:e.taskId?(byId.get(e.taskId)?.actual??0):e.minutes})).filter(e=>e.date>=from&&e.date<=to&&(!refId||e.refId===refId));
 const selected=tasks.filter(t=>{
  const owner=germanTarget(s,t)?.id;
  return !!owner&&(!refId||owner===refId);
 });
 const standalone=s.life.entries.filter(e=>!e.deletedAt&&e.kind==='german'&&!e.taskId&&e.date>=from&&e.date<=to&&(!refId||(e.timeRefId||e.refId)===refId)),missing=selected.filter(t=>t.actual===null);
 const modernEntries=s.life.entries.filter(e=>!e.deletedAt&&e.kind==='german'&&modernIds.has(e.taskId)).map(e=>({...e,date:s.sessions.find(x=>x.id===e.sessionId)?.date||e.date})),unitMap=effectiveLearningUnits(s.life.entries.filter(e=>!e.taskId||s.tasks.some(t=>t.id===e.taskId&&!t.deletedAt&&(e.progressOnly||t.progress===100))));
 const allEntries=[...entries,...modernEntries.filter(e=>e.date>=from&&e.date<=to&&(!refId||e.refId===refId)).map(e=>({...e,minutes:entryMinutes(s,e)}))].map(e=>({...e,units:unitMap.get(e.id)||0}));
 return {entries:allEntries,minutes:modernTasks.reduce((n,t)=>n+taskActivityMinutes(s,t,'german',germanTarget(s,t)?.id||'',refId,from,to),0)+selected.reduce((n,t)=>n+(t.actual??0),0)+standalone.reduce((n,e)=>n+e.minutes,0),estimated:missing.reduce((n,t)=>n+t.minutes,0),missing:missing.length,units:allEntries.reduce((n,e)=>n+e.units,0),sessions:selected.length+standalone.length};
}
