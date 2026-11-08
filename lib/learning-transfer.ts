import {z} from 'zod';
import {type State,type Command,validateState} from './model.ts';
import {learningSelection} from './learning-transfer-schema.ts';
import {germanTarget} from './german-metrics.ts';
import {investmentByTask,minutesInRange} from './task-investment.ts';
import {learningInvestment} from './learning-overview.ts';
import type {ActivityLink} from './life-schema.ts';

export type LearningSelection=z.infer<typeof learningSelection>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function learningRows(s:State){
 const investment=investmentByTask(s);
 const tasks=s.tasks.filter(t=>!t.deletedAt&&(!t.activity||t.activity.kind==='german')).map(t=>({kind:'task' as const,id:t.id,title:t.title,projectId:t.projectId,date:t.date,dates:[...investment.get(t.id)?.keys()||[]],owner:germanTarget(s,t)?.id||'',explicit:t.activity?.kind==='german',minutes:t.actual,entries:s.life.entries.filter(e=>e.kind==='german'&&e.taskId===t.id).map(e=>e.id),sessions:s.sessions.filter(e=>e.taskId===t.id).map(e=>e.id)}));
 const entries=s.life.entries.filter((e,i,all)=>!e.deletedAt&&e.kind==='german'&&(!e.taskId||s.tasks.some(t=>t.id===e.taskId&&!t.deletedAt&&t.activity&&t.activity.kind!=='german')&&!all.slice(0,i).some(x=>!x.deletedAt&&x.kind==='german'&&x.taskId===e.taskId))).map(e=>({kind:'entry' as const,id:e.id,title:e.note||s.life.courses.find(c=>c.id===e.refId)?.name||e.id,projectId:s.life.courses.find(c=>c.id===e.refId)?.projectId||'',date:e.date,dates:e.taskId?[...investment.get(e.taskId)?.keys()||[]]:[e.date],owner:e.timeRefId||e.refId,explicit:!!e.timeRefId,minutes:e.taskId?s.tasks.find(t=>t.id===e.taskId)?.actual??null:e.minutes,entries:[e.id],sessions:[] as string[]}));
 const templates=s.templates.filter(x=>!x.task.activity||x.task.activity.kind==='german').map(x=>({kind:'template' as const,id:x.id,title:x.task.title,projectId:x.task.projectId,date:'',dates:[] as string[],owner:germanTarget(s,{...x.task,id:''})?.id||'',explicit:!!x.task.activity,minutes:null,entries:[] as string[],sessions:[] as string[]}));
 const series=s.series.filter(x=>!x.template.activity||x.template.activity.kind==='german').map(x=>({kind:'series' as const,id:x.id,title:x.template.title,projectId:x.template.projectId,date:x.from,dates:[] as string[],owner:germanTarget(s,{...x.template,id:''})?.id||'',explicit:!!x.template.activity,minutes:null,entries:[] as string[],sessions:[] as string[]}));
 return [...tasks,...entries,...templates,...series];
}
export function association(s:State,key:LearningSelection):ActivityLink|null{
 if(key.kind==='entry'){const e=s.life.entries.find(e=>e.id===key.id);if(!e||e.deletedAt||e.kind!=='german')throw Error('学习记录不存在。');return e.timeRefId?{kind:'german',refId:e.timeRefId,category:s.life.courses.find(c=>c.id===e.timeRefId)?.category||'other'}:null;}
 const t=key.kind==='task'?s.tasks.find(t=>t.id===key.id&&!t.deletedAt):key.kind==='template'?s.templates.find(t=>t.id===key.id)?.task:s.series.find(t=>t.id===key.id)?.template;
 if(!t||t.activity&&t.activity.kind!=='german')throw Error('所选事项不存在或属于其他生活模块。');return t.activity;
}
function assign(s:State,key:LearningSelection,value:ActivityLink|null){
 if(key.kind==='entry'){const e=s.life.entries.find(e=>e.id===key.id)!;if(value)e.timeRefId=value.refId;else delete e.timeRefId;return;}
 const t=key.kind==='task'?s.tasks.find(t=>t.id===key.id)!:key.kind==='template'?s.templates.find(t=>t.id===key.id)!.task:s.series.find(t=>t.id===key.id)!.template;t.activity=value;
}
// Preview token covers original rows, linked logs, and seconds. A changed record
// requires a new preview; no migration silently uses an obsolete selection.
export function transferToken(s:State,keys:LearningSelection[]){return JSON.stringify([s.life.courses,keys.map(k=>k.kind==='task'?[k,s.tasks.find(t=>t.id===k.id),s.life.entries.filter(e=>e.taskId===k.id),s.sessions.filter(e=>e.taskId===k.id)]:k.kind==='entry'?[k,s.life.entries.find(e=>e.id===k.id)]:k.kind==='series'?[k,s.series.find(e=>e.id===k.id),s.tasks.filter(t=>t.seriesId===k.id)]:[k,s.templates.find(e=>e.id===k.id)])]);}
export function transferKeys(s:State,keys:LearningSelection[]){
 const result=new Map<string,LearningSelection>();
 const add=(k:LearningSelection)=>{result.set(k.kind+':'+k.id,k);};
 for(let k of keys){
  if(k.kind==='entry'){const e=s.life.entries.find(e=>e.id===k.id&&!e.deletedAt&&e.kind==='german');if(!e)throw Error('学习记录不存在。');if(e.taskId){const task=s.tasks.find(t=>t.id===e.taskId&&!t.deletedAt);if(!task)throw Error('所选事项不存在或属于其他生活模块。');if(!task.activity||task.activity.kind==='german')k={kind:'task',id:e.taskId};else for(const entry of s.life.entries.filter(x=>!x.deletedAt&&x.kind==='german'&&x.taskId===e.taskId))add({kind:'entry',id:entry.id});}}
  association(s,k);add(k);
  if(k.kind==='series')for(const t of s.tasks.filter(t=>t.seriesId===k.id&&!t.deletedAt&&(!t.activity||t.activity.kind==='german')&&!t.progress&&!t.actual&&!s.sessions.some(x=>x.taskId===t.id&&!x.deletedAt)&&!s.life.entries.some(x=>x.taskId===t.id&&!x.deletedAt)))add({kind:'task',id:t.id});
 }
 return [...result.values()];
}
export function previewTransfer(s:State,keys:LearningSelection[],toId:string){
 const target=s.life.courses.find(c=>c.id===toId&&!c.deletedAt&&!c.hidden);if(!target)throw Error('请选择有效的学习子项。');
 const expanded=transferKeys(s,keys),next=structuredClone(s),after:ActivityLink={kind:'german',refId:target.id,category:target.category};
 for(const k of expanded)assign(next,k,after);
 const before=learningInvestment(s,'0000-01-01','9999-12-31'),result=learningInvestment(next,'0000-01-01','9999-12-31');
 const investment=investmentByTask(s),seen=new Set<string>();
 const movedMinutes=expanded.reduce((n,k)=>{const e=k.kind==='entry'?s.life.entries.find(e=>e.id===k.id):undefined,taskId=k.kind==='task'?k.id:e?.taskId,key=taskId?'task:'+taskId:k.kind+':'+k.id;if(seen.has(key))return n;seen.add(key);return n+(taskId?minutesInRange(investment.get(taskId),'0000-01-01','9999-12-31'):e?.minutes||0);},0);
 return {keys:expanded,token:transferToken(s,expanded),before,after:result,next,changes:expanded.map(k=>({...k,before:association(s,k),after})),minutes:movedMinutes};
}
export function applyLearningTransfer(input:State,command:Command,instant:Date,newId:()=>string){
 const s=structuredClone(input);
 if(command.type==='learning.transfer'){
  const p=z.object({keys:z.array(learningSelection).min(1).max(2000),toId:z.string(),token:z.string(),id:z.string().optional()}).parse(command.payload),preview=previewTransfer(s,p.keys,p.toId);
  if(p.token!==preview.token)throw Error('原记录已变化，请重新预览后再提交。');
  const known=learningRows(s).filter(r=>preview.keys.some(k=>k.kind===r.kind&&k.id===r.id));
  if(known.every(r=>r.owner)&&Math.abs(preview.before.total-preview.after.total)>.000001)throw Error('迁移校验失败：总时长发生变化。');
  if(p.id&&s.learningTransfers?.some(b=>b.id===p.id))throw Error('迁移批次已存在。');
  for(const c of preview.changes)assign(s,c,c.after);
  s.learningTransfers=[...(s.learningTransfers||[]),{id:p.id||newId(),date:instant.toISOString(),undone:false,changes:preview.changes}];
 }else if(command.type==='learning.undo'){
  const {id}=z.object({id:z.string()}).parse(command.payload),batch=s.learningTransfers?.find(x=>x.id===id);if(!batch||batch.undone)throw Error('此批次不存在或已撤销。');
  for(const c of batch.changes)if(!same(association(s,c),c.after))throw Error('部分归属已再次修改，请先撤销后续批次。');
  for(const c of batch.changes)assign(s,c,c.before);batch.undone=true;
 }else if(command.type==='learning.hide'){
  const {id,hidden}=z.object({id:z.string(),hidden:z.boolean()}).parse(command.payload),course=s.life.courses.find(c=>c.id===id&&!c.deletedAt);if(!course)throw Error('学习子项不存在。');
  if(hidden&&(learningRows(s).some(r=>r.owner===id)||course.initial>0||s.life.entries.some(e=>e.kind==='german'&&e.refId===id&&e.units>0)))throw Error('仍有任务、记录或模板归属此子项，请先检查并重新关联。');course.hidden=hidden;
 }else throw Error('不支持的学习归属操作。');
 // No initializeDay, completion, time reconciliation or materialization here.
 return validateState(s);
}
