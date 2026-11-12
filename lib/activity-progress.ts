import {z} from 'zod';
import {type State,type Command,idString,dateString,validateState} from './model.ts';
import {entrySchema} from './life-schema.ts';
import {outcomeSchema} from './progress-schema.ts';
import {scopeDates,sumMinutes,effectiveLearningUnits} from './progress-records.ts';

/** Atomic replacement of progress metadata; never touches task time, dates, status or sessions. */
export function applyActivityProgress(input:State,command:Command,instant=new Date()):State{
 const p=z.object({taskId:idString,sessionId:idString.optional(),date:dateString,recordType:z.enum(['activity','project','practice']),entries:z.array(entrySchema).max(30),outcomes:z.array(outcomeSchema).max(30)}).parse(command.payload);
 const s=structuredClone(input),t=s.tasks.find(t=>t.id===p.taskId&&!t.deletedAt);if(!t)throw Error('关联任务不存在或已删除。');
 if(p.sessionId&&!s.sessions.some(x=>x.id===p.sessionId&&x.taskId===t.id&&!x.deletedAt))throw Error('本段投入不存在或已删除。');
 const keys=new Set<string>(),total=sumMinutes(scopeDates(s,t,p.sessionId));
 for(const e of p.entries){
  const table=e.kind==='german'?s.life.courses:e.kind==='reading'?s.life.books:s.life.workouts;
  const source=table.find(x=>x.id===e.refId&&!x.deletedAt);if(!source)throw Error('请选择有效的关联对象。');
  const key=e.kind+':'+e.refId;if(keys.has(key))throw Error('同一段投入请勿重复关联同一对象。');keys.add(key);
  const old=s.life.entries.find(x=>x.id===e.id);
  if(old&&(old.taskId!==t.id||(old.sessionId||'')!==(p.sessionId||'')))throw Error('请保留原记录与投入的关联。');
  // Same scope/object is an upsert even if a stale client supplies a new ID.
  const existing=s.life.entries.find(x=>x.taskId===t.id&&(x.sessionId||'')===(p.sessionId||'')&&x.kind===e.kind&&x.refId===e.refId);
  if(existing&&existing.id!==e.id)throw Error('这次任务已有进度记录，请重新打开原记录。');
  e.taskId=t.id;e.sessionId=p.sessionId;e.progressOnly=true;e.minutes=old?.minutes??0;e.deletedAt=null;e.date=old?.date||s.sessions.find(x=>x.id===p.sessionId)?.date||p.date;
  if(e.page!==undefined&&('total' in source)&&e.page>(source.total??100000))throw Error('页码不能超过书籍总页数。');
  if(e.startPage!==undefined&&(e.page===undefined||e.startPage>e.page))throw Error('起始页不能大于读到的页码。');
  if(e.kind==='reading')e.units=e.page===undefined&&old?.page===undefined?old?.units??0:0;
  if(e.videoIds?.length){e.videoIds=[...new Set(e.videoIds)];if(!e.rewatch&&e.quantityKnown!==false&&e.units!==e.videoIds.length)throw Error('视频编号数量须与本次视频数量一致。');}
  if(e.kind==='german'&&(e.rewatch||e.quantityKnown===false))e.units=0;
  if(e.kind==='german'&&'mode' in source&&source.mode==='practice'&&e.units)throw Error('请将此子项设置为有数量目标的课程，或在普通练习中记录数量。');
 }
 for(const kind of ['reading','german'] as const){
  const entries=p.entries.filter(e=>e.kind===kind),allocated=entries.filter(e=>e.allocation!=null),sum=allocated.reduce((n,e)=>n+(e.allocation||0),0);
  if(entries.length>1&&kind==='reading'&&allocated.length!==entries.length)throw Error('多本书请分别填写本次分配分钟。');
  if(allocated.length&&allocated.length!==entries.length)throw Error('请为每个关联对象填写分配分钟，或全部留空。');
  if(sum>total+.001)throw Error('分配分钟不能超过本段实际用时。');
  if(kind==='german'&&allocated.length&&Math.abs(sum-total)>.001)throw Error('学习方向的分配分钟之和必须等于本段实际用时。');
 }
 const now=instant.toISOString();
 for(const old of s.life.entries.filter(e=>e.taskId===t.id&&(e.sessionId||'')===(p.sessionId||''))){
  if(!p.entries.some(e=>e.id===old.id)&&!old.deletedAt){old.progressOnly=true;old.deletedAt=now;}
 }
 for(const e of p.entries){const at=s.life.entries.findIndex(x=>x.id===e.id);if(at<0)s.life.entries.push(e);else s.life.entries[at]=e;}
 const effective=effectiveLearningUnits(s.life.entries),beforeUnits=effectiveLearningUnits(input.life.entries);
 for(const c of s.life.courses.filter(c=>c.total!==null)){
  const before=c.initial+input.life.entries.filter(e=>e.refId===c.id).reduce((n,e)=>n+(beforeUnits.get(e.id)||0),0);
  const after=c.initial+s.life.entries.filter(e=>e.refId===c.id).reduce((n,e)=>n+(effective.get(e.id)||0),0);
  if(after>c.total!&&after>before)throw Error('累计完成数量不能超过目标总量。');
 }
 const outcomeIds=new Set<string>();
 for(const o of p.outcomes){if(outcomeIds.has(o.id))throw Error('成果 ID 不能重复。');outcomeIds.add(o.id);if(o.projectId&&!s.projects.some(x=>x.id===o.projectId&&!x.deletedAt))throw Error('请选择有效项目。');const old=t.outcomes?.find(x=>x.id===o.id);if(old&&(old.sessionId||'')!==(p.sessionId||''))throw Error('请保留成果的原投入关联。');if(o.developmentId){const child=(s.developmentProjects||[]).find(x=>x.id===o.developmentId);if(!child||child.projectId!==o.projectId)throw Error('具体项目与所属项目不一致。');}o.sessionId=p.sessionId;o.date=old?.date||p.date;o.deletedAt=null;}
 t.outcomes=[...(t.outcomes||[]).map(o=>(o.sessionId||'')===(p.sessionId||'')&&!p.outcomes.some(x=>x.id===o.id)?{...o,deletedAt:o.deletedAt||now}:o).filter(o=>!p.outcomes.some(x=>x.id===o.id)),...p.outcomes];
 t.recordType=p.recordType;
 // Inherit one explicit primary association. Multiple tags do not duplicate time.
 if(!t.activity&&p.entries[0]){const e=p.entries[0],c=s.life.courses.find(c=>c.id===e.refId);t.activity={kind:e.kind,refId:e.refId,category:c?.category||'other'};}
 return validateState(s);
}
