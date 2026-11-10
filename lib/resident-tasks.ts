import {z} from 'zod';
import {type State,type Task,type Command,idString,dateString,optionalTime,taskInput,assertTask,validateState,businessDate,recommendations} from './model.ts';
import {taskPlans} from './task-plans.ts';
export type Resident=State['templates'][number];
export type ResidentKind='long-term'|'stage';
export function residentKind(t:Resident|undefined):ResidentKind{
 // Legacy templates are reused in place. Only explicitly named course families default to stage entries.
 if(!t)return 'long-term';
 return t.kind??(/hugging\s*face|neo4j|AVF.*(?:K2|K3)|Valeo.*(?:讲座|lecture|vorlesung)/i.test(t.task.title)?'stage':'long-term');
}
export const residentStatus=(t:Resident)=>t.status??'active';
export function residentAvailable(s:State,t:Resident){return residentStatus(t)==='active'&&(!t.task.projectId||s.projects.some(p=>p.id===t.task.projectId&&!p.deletedAt&&p.status==='active'));}
export function residentOccurrence(s:State,t:Resident,date:string):Task|undefined{
 return s.tasks.find(x=>!x.deletedAt&&!x.templateOnly&&(taskPlans(x).some(p=>p.date===date)||x.templateDate===date)&&(
  x.sourceTemplateId===t.id||x.id===t.originTaskId||(!x.sourceTemplateId&&x.title===t.task.title&&x.projectId===t.task.projectId&&x.moduleId===t.task.moduleId&&JSON.stringify(x.activity)===JSON.stringify(t.task.activity))));
}
export function applyTemplateCommand(input:State,command:Command,instant:Date):State{
 const s=structuredClone(input),now=instant.toISOString();
 if(command.type==='template.save'){
  const p=z.object({id:idString,task:taskInput,kind:z.enum(['long-term','stage']).optional(),sourceTaskId:idString.optional()}).parse(command.payload);
  const source=p.sourceTaskId?s.tasks.find(t=>t.id===p.sourceTaskId&&!t.deletedAt):undefined;
  if(p.sourceTaskId&&!source)throw Error('原事项不存在。');
  const old=s.templates.find(t=>t.id===p.id)||s.templates.find(t=>source&&(t.id===source.sourceTemplateId||t.originTaskId===source.id))||s.templates.find(t=>source&&t.task.title===p.task.title&&t.task.projectId===p.task.projectId&&t.task.moduleId===p.task.moduleId&&JSON.stringify(t.task.activity)===JSON.stringify(p.task.activity));
  const entry:Resident={...old,id:old?.id??p.id,task:{...p.task,date:'',start:'',parentId:'',progress:0,actual:null},kind:p.kind??(old?residentKind(old):'long-term'),status:old?residentStatus(old):'active',...(source?{originTaskId:old?.originTaskId??source.id}:{})};
  assertTask(s,entry.task);
  if(old)Object.assign(old,entry);else s.templates.push(entry);
  if(source){source.sourceTemplateId=entry.id;
   // An unused undated placeholder becomes an entry, with its ID and fields retained.
   // Anything with execution/history stays an ordinary execution task, untouched.
   if(!source.date&&!source.start&&!source.plans?.length&&!source.seriesId&&!source.parentId&&!s.tasks.some(t=>t.parentId===source.id)&&source.actual===null&&!source.progress&&!source.completedAt&&!s.sessions.some(x=>x.taskId===source.id)&&!s.life.entries.some(x=>x.taskId===source.id)&&s.focus?.taskId!==source.id)source.templateOnly=true;
  }
 }else if(command.type==='template.status'||command.type==='template.delete'){
  const p=z.object({id:idString,status:z.enum(['active','paused','archived']).optional()}).parse(command.payload),entry=s.templates.find(t=>t.id===p.id);
  if(!entry)throw Error('模板不存在。');
  if(command.type==='template.status'&&!p.status)throw Error('请选择入口状态。');
  entry.status=command.type==='template.delete'?'archived':p.status!;
 }else if(command.type==='template.use'){
  const p=z.object({id:idString,newId:idString,date:dateString,start:optionalTime.optional(),minutes:z.number().int().min(0).max(1440).optional()}).parse(command.payload),entry=s.templates.find(t=>t.id===p.id);
  if(!entry)throw Error('模板不存在。');
  if(!residentAvailable(s,entry))throw Error('此入口已暂停、归档或所属项目已结束，请先恢复。');
  if(residentOccurrence(s,entry,p.date))throw Error('当天已有此入口的任务，请查看或继续原任务。');
  if(s.tasks.some(t=>t.id===p.newId))throw Error('事项 ID 已存在。');
  const task={...entry.task,id:p.newId,date:p.date,start:p.start??'',minutes:p.minutes??entry.task.minutes,sourceTemplateId:entry.id,templateDate:p.date,parentId:'',progress:0,actual:null,seriesId:'',occurrence:'',createdAt:now,completedAt:null,deletedAt:null,order:s.tasks.length};
  assertTask(s,task);s.tasks.push(task);
 }else throw Error('未知常驻入口操作。');
 if(command.type==='template.use'||command.type==='template.save')s.targets[businessDate(s.settings,instant)]=recommendations(s,businessDate(s.settings,instant));
 return validateState(s);
}
