import {applyPlanningSchedule} from './planning-workflow.ts';
import {applyLearningTransfer} from './learning-transfer.ts';
import {recordTaskReadingPage} from './reading-progress.ts';
import {applyMonthlyCommand} from './monthly-planning.ts';
import {quickCommand} from './quick-capture.ts';
import {changeSession} from './session-records.ts';
import {addRecordedSeconds,refreshTimeProgress,localParts} from './task-investment.ts';
import {moveRelatedChildren} from './time-metrics.ts';
import { focusSeconds, potentialWealth, closeFocusSpan } from './focus-clock.ts';
import { z } from 'zod';
import {applyLifeCommand} from './life-commands.ts';
import { type State,type Command,idString,dateString,optionalDate,optionalTime,projectModuleGroups,progressBasisSchema,taskInput,repeatSchema,projectInput,settingsSchema,assertTask,validateState,initializeDay,businessDate,offsetDate,liveTasks,finished,capacity,recommendations,occurs } from './model.ts';

export function applyCommand(input:State,command:Command,instant=new Date(),newId:()=>string=()=>crypto.randomUUID()):State{
 if(command.type==='planning.schedule')return applyPlanningSchedule(input,command);
 if(command.type.startsWith('learning.'))return applyLearningTransfer(input,command,instant,newId);
 if(command.type.startsWith('life.'))return applyLifeCommand(input,command,instant,newId);
 const s=structuredClone(input),today=businessDate(s.settings,instant),now=instant.toISOString();
 const task=(id:string)=>{const t=s.tasks.find(t=>t.id===id);if(!t)throw new Error('事项不存在。');return t;};
 switch(command.type){
  case 'monthly.goal.save':case 'monthly.goal.remove':applyMonthlyCommand(s,command);break;
  case 'quick.add':case 'quick.undo':quickCommand(s,command,now);break;
  case 'task.save':{
   const p=z.object({id:idString,task:taskInput,repeat:repeatSchema.nullable().optional(),scope:z.enum(['one','future','series']).default('one')}).parse(command.payload);assertTask(s,p.task);if(p.task.parentId&&(p.repeat&&(!s.tasks.some(t=>t.id===p.id&&t.seriesId)||p.scope!=='one')))throw new Error('包含关系请只编辑单次日程。');
   const old=s.tasks.find(t=>t.id===p.id);
   if(old){
    if(old.deletedAt)throw new Error('请先恢复此事项。');
    if(old.seriesId&&p.scope!=='one'){
     const series=s.series.find(x=>x.id===old.seriesId)!;
     if(p.task.date!==old.date)throw new Error('整组编辑请保持当前日期，移动日期请选“仅此次”。');
     const cutoff=old.occurrence,originalUntil=series.rule.until;
     for(const t of s.tasks.filter(t=>t.seriesId===series.id&&!t.deletedAt&&!finished(t)&&(p.scope==='series'||t.occurrence>=cutoff))){const date=t.date,actual=t.actual,progress=t.progress;Object.assign(t,p.task,{date,actual,progress});assertTask(s,t);}
     let target=series;
     if(p.scope==='future'){const seriesId=newId();series.rule.until=offsetDate(cutoff,-1);target={...structuredClone(series),id:seriesId,from:cutoff,rule:p.repeat||{...series.rule,until:originalUntil},template:{...p.task,progress:0,actual:null}};s.series.push(target);s.tasks.filter(t=>t.seriesId===series.id&&t.occurrence>=cutoff).forEach(t=>t.seriesId=seriesId);}
     else{series.template={...p.task,progress:0,actual:null};if(p.repeat)series.rule=p.repeat;}
     if(!p.repeat){target.active=false;s.tasks.filter(t=>t.seriesId===target.id&&t.id!==old.id&&!finished(t)&&!t.deletedAt&&t.occurrence>=cutoff).forEach(t=>t.deletedAt=now);}else{target.active=true;if(p.repeat.until&&p.repeat.until<target.from)throw new Error('重复截止不能早于开始日期。');if(p.repeat.frequency==='custom'&&!p.repeat.days.length)throw new Error('请至少选择一天。');}
     if(p.repeat) s.tasks.filter(t=>t.seriesId===target.id&&!finished(t)&&!t.deletedAt&&!occurs(target,t.occurrence)).forEach(t=>t.deletedAt=now);
    }else {Object.assign(old,p.task);if(!old.seriesId&&p.repeat){if(!p.task.date)throw new Error('重复事项需要开始日期。');const id=newId();s.series.push({id,from:p.task.date,rule:p.repeat,template:{...p.task,progress:0,actual:null},active:true});old.seriesId=id;old.occurrence=p.task.date;}}
    old.completedAt=finished(old)?old.completedAt||now:null;if(finished(old)&&!old.date)old.date=today;
   }else if(p.repeat){
    if(!p.task.date)throw new Error('重复事项需要开始日期。');if(p.repeat.until&&p.repeat.until<p.task.date)throw new Error('重复截止不能早于开始日期。');if(p.repeat.frequency==='custom'&&!p.repeat.days.length)throw new Error('请至少选择一天。');
    if(!s.series.some(x=>x.id===p.id))s.series.push({id:p.id,from:p.task.date,rule:p.repeat,template:{...p.task,progress:0,actual:null},active:true});
   }else s.tasks.push({...p.task,id:p.id,seriesId:'',occurrence:'',createdAt:now,completedAt:p.task.progress===100?now:null,deletedAt:null,order:s.tasks.length,date:p.task.date||(p.task.progress===100?today:'')});break;
  }
  case 'task.schedule':{const p=z.object({id:idString,date:optionalDate,start:optionalTime,minutes:z.number().int().min(0).max(1440).optional()}).parse(command.payload),t=task(p.id);if(t.deletedAt)throw new Error('请先恢复此事项。');t.date=p.date;t.start=p.start;if(p.minutes!==undefined)t.minutes=p.minutes;assertTask(s,t);break;}
  case 'task.progress':{const p=z.object({readingPage:z.number().int().min(0).max(100000).optional(),id:idString,progress:z.number().int().min(0).max(100),actual:z.number().int().min(0).max(100000).nullable().optional()}).parse(command.payload),t=task(p.id);if(t.deletedAt)throw new Error('请先恢复此事项。');t.progress=p.progress;t.progressSource='manual';if(p.actual!==undefined)t.actual=p.actual;t.completedAt=p.progress===100?t.completedAt||now:null;if(p.progress===100&&!t.date)t.date=today;if(p.readingPage!==undefined){if(p.progress!==100)throw Error('请完成任务后记录阅读页码。');recordTaskReadingPage(s,t,p.readingPage,newId);}break;}
  case 'task.delete':{const p=z.object({id:idString,scope:z.enum(['one','future','series']).default('one')}).parse(command.payload),t=task(p.id);if(p.scope==='one'||!t.seriesId)t.deletedAt=now;else{s.tasks.filter(x=>x.seriesId===t.seriesId&&!finished(x)&&(p.scope==='series'||x.occurrence>=t.occurrence)).forEach(x=>x.deletedAt=now);const series=s.series.find(x=>x.id===t.seriesId);if(series){if(p.scope==='series')series.active=false;else series.rule.until=offsetDate(t.occurrence,-1);}}break;}
  case 'task.restore':{const p=z.object({id:idString}).parse(command.payload),t=task(p.id);if(t.projectId&&!s.projects.some(p=>p.id===t.projectId&&!p.deletedAt))throw new Error('请先恢复所属项目。');t.deletedAt=null;break;}
  case 'task.reorder':{const p=z.object({ids:z.array(idString).max(30000)}).parse(command.payload);p.ids.forEach((id,i)=>task(id).order=i);break;}
  case 'module.move':{const p=z.object({projectId:idString,moduleId:z.union([idString,z.literal('')]),direction:z.enum(['up','down'])}).parse(command.payload),project=s.projects.find(x=>x.id===p.projectId&&!x.deletedAt);if(!project)throw new Error('项目不存在或已删除。');const ids=projectModuleGroups(s,p.projectId).map(m=>m.id),from=ids.indexOf(p.moduleId);if(from<0)throw new Error('模块不存在或不属于此项目。');const to=from+(p.direction==='up'?-1:1);if(to>=0&&to<ids.length){[ids[from],ids[to]]=[ids[to],ids[from]];project.moduleOrder=ids;}break;}
  case 'project.progress-basis':{const p=z.object({id:idString,basis:progressBasisSchema}).parse(command.payload),project=s.projects.find(x=>x.id===p.id&&!x.deletedAt);if(!project)throw new Error('项目不存在或已删除。');project.progressBasis=p.basis;break;}
  case 'project.save':{const p=z.object({id:idString,project:projectInput,modules:z.array(z.object({id:idString,name:z.string().trim().min(1).max(100)})).max(100)}).parse(command.payload);if(p.project.start&&p.project.deadline&&p.project.start>p.project.deadline)throw new Error('截止日期不能早于开始日期。');for(const m of p.modules)if(s.modules.some(x=>x.id===m.id&&x.projectId!==p.id))throw new Error('模块 ID 冲突。');const old=s.projects.find(x=>x.id===p.id);if(old)Object.assign(old,p.project);else s.projects.push({...p.project,id:p.id,order:s.projects.length,deletedAt:null});const removed=s.modules.filter(m=>m.projectId===p.id&&!p.modules.some(x=>x.id===m.id)).map(m=>m.id);s.tasks.filter(t=>removed.includes(t.moduleId)).forEach(t=>t.moduleId='');s.series.filter(x=>removed.includes(x.template.moduleId)).forEach(x=>x.template.moduleId='');s.life.courses.forEach(c=>c.moduleIds=c.moduleIds.filter(id=>!removed.includes(id)));s.modules=s.modules.filter(m=>m.projectId!==p.id).concat(p.modules.map((m,i)=>({...m,projectId:p.id,order:i})));break;}
  case 'project.delete':{const p=z.object({id:idString}).parse(command.payload),project=s.projects.find(x=>x.id===p.id);if(!project)throw new Error('项目不存在。');project.deletedAt=now;s.tasks.filter(t=>t.projectId===p.id&&!t.deletedAt).forEach(t=>t.deletedAt=now);s.series.filter(x=>x.template.projectId===p.id).forEach(x=>x.active=false);break;}
  case 'project.restore':{const p=z.object({id:idString}).parse(command.payload),project=s.projects.find(x=>x.id===p.id);if(!project)throw new Error('项目不存在。');const at=project.deletedAt;project.deletedAt=null;s.tasks.filter(t=>t.projectId===p.id&&t.deletedAt===at).forEach(t=>t.deletedAt=null);break;}
  case 'template.save':{const p=z.object({id:idString,task:taskInput}).parse(command.payload);assertTask(s,p.task);p.task.parentId='';const old=s.templates.find(x=>x.id===p.id);if(old)old.task=p.task;else s.templates.push(p);break;}
  case 'template.delete':{const p=z.object({id:idString}).parse(command.payload);s.templates=s.templates.filter(x=>x.id!==p.id);break;}
  case 'template.use':{const p=z.object({id:idString,newId:idString,date:dateString}).parse(command.payload),t=s.templates.find(x=>x.id===p.id);if(!t)throw new Error('模板不存在。');if(!s.tasks.some(x=>x.id===p.newId))s.tasks.push({...t.task,id:p.newId,date:p.date,progress:0,actual:null,seriesId:'',occurrence:'',createdAt:now,completedAt:null,deletedAt:null,order:s.tasks.length});break;}
  case 'note.save':{const p=z.object({date:dateString,text:z.string().max(5000)}).parse(command.payload);s.notes[p.date]=p.text;break;}
  case 'capacity.save':{const p=z.object({date:dateString,hours:z.number().min(0).max(24)}).parse(command.payload);s.capacity[p.date]=p.hours;break;}
  case 'settings.save':s.settings=settingsSchema.parse(command.payload);break;
  case 'target.refresh':s.targets[today]=recommendations(s,today);break;
  case 'tasks.arrange':{const p=z.object({ids:z.array(idString).max(2000),from:dateString,mode:z.enum(['today','balanced'])}).parse(command.payload),moving=p.ids.map(task).filter(t=>!finished(t)&&!t.deletedAt);let day=p.from;for(let i=0;i<moving.length;i++){const t=moving[i];if(p.mode==='balanced'){let tries=0;while(tries<366){const occupied=liveTasks(s).filter(x=>x.date===day&&!moving.slice(i).some(m=>m.id===x.id)).reduce((n,x)=>n+x.minutes,0);if(capacity(s,day)>0&&capacity(s,day)*60-occupied>=t.minutes)break;day=offsetDate(day,1);tries++;}if(tries>=366)throw new Error('未来一年容量不足，请调整可投入时间。');}t.date=day;t.start='';}break;}
  case 'focus.start':{const p=z.object({taskId:idString,mode:z.enum(['countdown','countup']).optional(),minutes:z.number().int().min(1).max(1440).optional()}).parse(command.payload),t=task(p.taskId);if(t.deletedAt||finished(t))throw new Error('请选择未完成事项。');if(s.focus&&s.focus.taskId!==p.taskId)throw new Error('请先结束或取消当前专注。');if(s.focus?.startedAt)throw new Error('已有计时正在运行。');if(s.focus?.mode==='countdown'&&focusSeconds(s.focus,instant.valueOf())>=s.focus.target)throw new Error('本段倒计时已到点，请先记录或取消，再开始新一段。');s.focus=s.focus?.taskId===p.taskId?{...s.focus,startedAt:now}:{taskId:p.taskId,startedAt:now,seconds:0,spans:[],target:(p.minutes||s.settings.focusMinutes)*60,...(p.mode?{mode:p.mode}:{})};break;}
  case 'focus.pause':if(s.focus?.startedAt){s.focus.spans=closeFocusSpan(s.focus,instant.valueOf());s.focus.seconds=focusSeconds(s.focus,instant.valueOf());s.focus.startedAt=null;}break;
  case 'focus.finish':if(s.focus){
   const f=s.focus,seconds=focusSeconds(f,instant.valueOf());if(seconds>86400)throw new Error('计时超过 24 小时，请取消后手动填写用时。');
   const t=task(f.taskId);if(t.deletedAt)throw new Error('请先恢复此事项。');if(!t.date)t.date=today;
   const spans=closeFocusSpan(f,instant.valueOf()),endedAt=spans.at(-1)?.endedAt||now;
   addRecordedSeconds(s,t,seconds);
   if(seconds>0)s.sessions.push({id:newId(),taskId:t.id,date:localParts(Date.parse(endedAt),s.settings.timezone).date,seconds,growth:potentialWealth(seconds,s.settings.growthRate),growthRate:s.settings.growthRate,endedAt,spans,source:'focus',progressAfter:t.progress});
   s.focus=null;
  }break;
  case 'session.update':case 'session.move':case 'session.delete':case 'session.restore': changeSession(s,command,instant);break;
  case 'task.record':{
   const p=z.object({id:idString,minutes:z.number().int().min(0).max(1440).default(0),date:dateString,startedAt:z.string().datetime().optional(),endedAt:z.string().datetime().optional(),progress:z.number().int().min(0).max(100).optional(),progressSource:z.enum(['time','manual']).optional(),note:z.string().max(1000).default('')}).parse(command.payload),t=task(p.id);
   if(t.deletedAt)throw new Error('请先恢复此事项。');
   if(!!p.startedAt!==!!p.endedAt)throw new Error('请同时填写实际开始和结束时间。');
   let seconds=p.minutes*60;const spans=p.startedAt&&p.endedAt?[{startedAt:p.startedAt,endedAt:p.endedAt}]:[];
   if(spans.length){seconds=(Date.parse(p.endedAt!)-Date.parse(p.startedAt!))/1000;if(seconds<=0||seconds>86400)throw new Error('本段结束须晚于开始，且不超过 24 小时。');if(Date.parse(p.endedAt!)>instant.valueOf()+60000)throw new Error('实际记录不能填写未来时间。');}
   if(p.date>localParts(instant.valueOf(),s.settings.timezone).date)throw new Error('实际记录不能填写未来日期。');
   if(!seconds&&p.progress===undefined&&p.progressSource===undefined)throw new Error('请填写本次投入或当前进度。');
   if(p.progressSource)t.progressSource=p.progressSource;
   if(seconds)addRecordedSeconds(s,t,seconds);
   if(p.progress!==undefined){t.progress=p.progress;t.progressSource='manual';t.completedAt=p.progress===100?t.completedAt||now:null;}
   else refreshTimeProgress(t);
   if(!t.date)t.date=p.date;
   if(seconds||p.progress!==undefined)s.sessions.push({id:newId(),taskId:t.id,date:p.date,seconds,growth:0,endedAt:p.endedAt||now,spans,source:'manual',note:p.note,progressAfter:t.progress});
   break;
  }
  case 'tasks.unschedule':{const p=z.object({ids:z.array(idString).max(2000)}).parse(command.payload),ids=new Set(p.ids);for(const id of ids){const t=task(id);if(t.parentId&&!ids.has(t.parentId))throw new Error('请同时选择父时段，或先在编辑中解除包含关系。');}for(const t of s.tasks.filter(t=>ids.has(t.parentId)))ids.add(t.id);for(const id of ids){const t=task(id);if(t.deletedAt)continue;if(finished(t)){if(t.parentId&&ids.has(t.parentId))t.parentId='';continue;}t.date='';t.start='';t.parentId='';}break;}
  case 'focus.cancel':s.focus=null;break;
  case 'backup.import':{const restored=validateState(command.payload);restored.receipts=[];return initializeDay(restored,instant);}
  case 'tasks.import':{const p=z.array(taskInput.extend({id:idString})).max(2000).parse(command.payload);for(const item of p){assertTask(s,item);if(s.tasks.some(t=>t.id===item.id))continue;s.tasks.push({...item,seriesId:'',occurrence:'',createdAt:now,completedAt:item.progress===100?now:null,deletedAt:null,order:s.tasks.length});}break;}
  default:throw new Error('不支持的操作。');
 }
 for(const t of s.tasks)if(t.progressSource==='time')refreshTimeProgress(t);
 moveRelatedChildren(s,input);
 initializeDay(s,instant);
 if(['quick.add','quick.undo','task.save','task.schedule','project.save','capacity.save','settings.save','tasks.arrange','template.use','tasks.import','task.delete','task.restore','project.delete','project.restore'].includes(command.type))s.targets[today]=recommendations(s,today);
 return validateState(s);
}
