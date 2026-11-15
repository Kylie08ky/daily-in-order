import {z} from 'zod';
import {type State,type Task,type Command,idString,dateString,businessDate} from './model.ts';
import {entrySchema,type Entry} from './life-schema.ts';
import {germanTarget} from './learning-target.ts';
import {applyActivityProgress} from './activity-progress.ts';
import {progressRecordOrder} from './progress-records.ts';

export function defaultProgressScope(s:State,t:Task){
 const entries=s.life.entries.filter(e=>e.taskId===t.id&&!e.deletedAt).sort((a,b)=>progressRecordOrder(s,b,a));
 return entries[0]?.sessionId??(entries.length?'':s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt).at(-1)?.id||'');
}
export function completionSignature(s:State,t:Task){
 const c=germanTarget(s,t);
 return JSON.stringify([t,s.sessions.filter(x=>x.taskId===t.id),s.life.entries.filter(e=>e.taskId===t.id||e.refId===c?.id),c]);
}
export function completionEntry(s:State,t:Task,scope:string,id:string):Entry|undefined{
 const c=germanTarget(s,t);if(c?.mode!=='course')return;
 const old=s.life.entries.find(e=>!e.deletedAt&&e.taskId===t.id&&(e.sessionId||'')===scope&&e.kind==='german'&&e.refId===c.id);
 return structuredClone(old||entrySchema.parse({id,kind:'german',refId:c.id,taskId:t.id,sessionId:scope||undefined,date:s.sessions.find(x=>x.id===scope)?.date||t.actualDate||t.date||businessDate(s.settings),minutes:0,progressOnly:true,quantityKnown:false}));
}
/** One command commits progress and completion together. It never adds time or changes session records. */
export function completeWithProgress(input:State,command:Command,instant:Date,apply:(s:State,c:Command,d:Date)=>State){
 const p=z.object({id:idString,expected:z.string(),date:dateString,actual:z.number().int().min(0).max(100000).nullable().optional(),entry:entrySchema.optional()}).parse(command.payload);
 const t=input.tasks.find(t=>t.id===p.id&&!t.deletedAt);if(!t)throw Error('事项不存在。');
 if(input.focus?.taskId===t.id)throw Error('请先结束当前专注。');
 const c=germanTarget(input,t),old=p.entry&&input.life.entries.find(e=>e.id===p.entry!.id);
 // Empty quantity means leave the saved video progress untouched.
 const entry=p.entry?.quantityKnown===false?undefined:p.entry;
 const same=entry&&old&&(['refId','sessionId','units','rewatch','unitTitle'] as const).every(k=>entry[k]===old[k])&&JSON.stringify(entry.videoIds||[])===JSON.stringify(old.videoIds||[]);
 if(p.expected!==completionSignature(input,t)){
  if(t.progress===100&&t.completedDate===p.date&&(p.actual===undefined||p.actual===t.actual)&&(!entry||same))return input;
  throw Error('记录已更新，请重新打开后核对。');
 }
 let next=input;
 if(entry){
  if(c?.mode!=='course'||entry.kind!=='german'||entry.refId!==c.id)throw Error('请选择有效的关联对象。');
  if(!Number.isInteger(entry.units))throw Error('完成数量须为整数。');
  const scope=entry.sessionId||'';
  const entries=input.life.entries.filter(e=>!e.deletedAt&&e.taskId===t.id&&(e.sessionId||'')===scope&&e.id!==entry.id);
  next=applyActivityProgress(input,{type:'activity.progress',payload:{taskId:t.id,sessionId:scope||undefined,date:entry.date,recordType:t.recordType||'activity',entries:[...entries,entry],outcomes:(t.outcomes||[]).filter(o=>!o.deletedAt&&(o.sessionId||'')===scope)}},instant);
 }
 return apply(next,{type:'task.progress',payload:{id:t.id,date:p.date,progress:100,...(p.actual!==undefined?{actual:p.actual}:{})}},instant);
}
