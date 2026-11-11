import {z} from 'zod';
import {type State,type Command,validateState} from './model.ts';
import {changeSession} from './session-records.ts';
import {refreshTimeProgress} from './task-investment.ts';

const stable=(value:unknown)=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function investmentToken(s:State,kind:'task'|'entry',id:string){
 if(kind==='entry')return stable(s.life.entries.find(e=>e.id===id)||null);
 return stable({task:s.tasks.find(t=>t.id===id),sessions:s.sessions.filter(x=>x.taskId===id),entries:s.life.entries.filter(e=>e.taskId===id)});
}
export function applyInvestmentEdit(input:State,command:Command,instant:Date){
 const s=structuredClone(input);
 if(command.type==='investment.undo'){
  const {id}=z.object({id:z.string()}).parse(command.payload),batch=s.investmentEdits?.find(x=>x.id===id);
  if(!batch||batch.undone)throw Error('此修改不存在或已撤销。');
  if(batch.kind==='task'&&s.focus?.taskId===batch.recordId)throw Error('请先结束当前专注。');
  if(investmentToken(s,batch.kind,batch.recordId)!==batch.after)throw Error('原记录已变化，请重新查看后再修正。');
  if(batch.kind==='entry')s.life.entries.find(e=>e.id===batch.recordId)!.minutes=JSON.parse(batch.before).minutes;
  else {const before=JSON.parse(batch.before) as {task:State['tasks'][number];sessions:State['sessions']};const t=s.tasks.find(t=>t.id===batch.recordId)!;t.actual=before.task.actual;t.progress=before.task.progress;if(before.task.progressSource)t.progressSource=before.task.progressSource;else delete t.progressSource;
   s.sessions=s.sessions.map(x=>x.taskId===t.id?before.sessions.find(v=>v.id===x.id)!:x);
  }
  batch.undone=true;return validateState(s);
 }
 const p=z.object({id:z.string().min(1).max(100),kind:z.enum(['task','entry']),recordId:z.string(),token:z.string(),change:z.object({type:z.enum(['session.update','session.delete','session.restore','activity.time.correct','entry.time.correct']),payload:z.unknown()})}).parse(command.payload);
 const existing=s.investmentEdits?.find(x=>x.id===p.id);if(existing){if(existing.kind===p.kind&&existing.recordId===p.recordId)return input;throw Error('修改编号冲突。');}
 const before=investmentToken(s,p.kind,p.recordId);if(before!==p.token)throw Error('原记录已变化，请重新查看后再修正。');
 if(p.kind==='entry'){
  const e=s.life.entries.find(e=>e.id===p.recordId&&!e.deletedAt);if(!e||e.taskId||p.change.type!=='entry.time.correct')throw Error('请选择原任务的投入记录。');
  e.minutes=z.object({minutes:z.number().int().min(0).max(1440)}).parse(p.change.payload).minutes;
 }else{
  const t=s.tasks.find(t=>t.id===p.recordId&&!t.deletedAt&&!t.templateOnly);if(!t)throw Error('原任务不存在。');if(s.focus?.taskId===t.id)throw Error('请先结束当前专注。');
  if(p.change.type==='activity.time.correct'){
   const correction=z.object({actual:z.number().int().min(0).max(100000).nullable(),preserveSegments:z.literal(true).optional()}).parse(p.change.payload);
   const recorded=Math.round(s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0)/60);
   if(recorded&&(!correction.preserveSegments||correction.actual===null||correction.actual<recorded||(t.actual||0)<recorded))throw Error('此任务已有分段投入，请选择具体投入段修改，避免覆盖原日期。');
   t.actual=correction.actual;refreshTimeProgress(t);
  }else if(p.change.type.startsWith('session.')){
   const {id}=z.object({id:z.string()}).parse(p.change.payload);if(!s.sessions.some(x=>x.id===id&&x.taskId===t.id))throw Error('投入段不属于当前任务。');changeSession(s,p.change as Command,instant);
  }else throw Error('无效的用时修正。');
 }
 const after=investmentToken(s,p.kind,p.recordId);
 if(after!==before)s.investmentEdits=[...(s.investmentEdits||[]),{id:p.id,date:instant.toISOString(),kind:p.kind,recordId:p.recordId,before,after,undone:false}];
 return validateState(s);
}
