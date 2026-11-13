import {z} from 'zod';
import {type State,type Command,taskInput,projectInput,idString,validateState} from './model.ts';
import {planSchema,projectNameKey,type DraftPlan} from './quick-capture.ts';
import {courseSchema} from './life-schema.ts';
import {monthWeeks,distributeMonth} from './monthly-plan-schema.ts';
import {planningSignature,remainingMinutes,taskPlans} from './task-plans.ts';
import {residentAvailable} from './resident-tasks.ts';

type Execute=(s:State,c:Command,at:Date)=>State;
const key=projectNameKey;
// Optimistic review guard is local only: never sent to the model. Include only touched domains.
export function aiReviewToken(s:State,p:DraftPlan,taskId=''){
 const names=new Set(p.projects.map(x=>key(x.name))),categories=new Set([...(p.planning?.modules||[]).map(x=>x.category),...(p.planning?.learning||[]).map(x=>x.category)]);
 return JSON.stringify({projects:s.projects.filter(x=>names.has(key(x.name))),courses:s.life.courses.filter(x=>categories.has(x.category)),modules:s.modules.filter(m=>s.projects.some(x=>x.id===m.projectId&&names.has(key(x.name)))),targets:[...categories].map(c=>[c,s.life.preferences.learningModuleWeekly[c]]),monthly:s.monthlyPlans.filter(x=>p.planning?.monthly.some(m=>m.month===x.month)),templates:s.templates.filter(x=>p.tasks.some(t=>key(t.title)===key(x.task.title))),task:taskId?s.tasks.find(t=>t.id===taskId):null,sessions:taskId?s.sessions.filter(x=>x.taskId===taskId):[],focus:s.focus?.taskId===taskId?s.focus:null,weekStart:s.settings.weekStart});
}
export function selectedPlanningContext(s:State,id:string){
 const t=s.tasks.find(x=>x.id===id&&!x.deletedAt&&!x.templateOnly&&x.progress<100);
 return t?{title:t.title,actualMinutes:t.actual,remainingMinutes:remainingMinutes(t),plans:taskPlans(t,s).map(({date,start,minutes})=>({date,start,minutes}))}:undefined;
}
export function applyAIPlan(input:State,command:Command,instant:Date,execute:Execute):State{
 const {id,plan:p,taskId,expected,firstLogin}=z.object({id:idString,plan:planSchema,taskId:z.string().max(100).default(''),expected:z.string().max(1500000),firstLogin:z.boolean().default(false)}).parse(command.payload);
 const receipt='ai-plan:'+id;
 if(input.receipts.includes(receipt))return input;
 if(aiReviewToken(input,p,taskId)!==expected)throw Error('计划已变化，请重新生成并核对草稿。');
 let s=structuredClone(input);let index=0;const nextId=()=>id+'.'+index++;
 const run=(type:string,payload:unknown)=>{s=execute(s,{type,payload},instant);};
 const links=new Map<string,string>(),courses=new Map<string,ReturnType<typeof courseSchema.parse>>();
 for(const d of p.projects){
  const matches=s.projects.filter(x=>!x.deletedAt&&key(x.name)===key(d.name));
  if(matches.length>1||matches.some(x=>x.status!=='active'))throw Error('同名项目已归档、完成或存在多个，请修改草稿项目名称。');
  const projectId=matches[0]?.id||nextId();links.set(d.key,projectId);
  if(!matches.length)run('project.save',{id:projectId,project:projectInput.parse(d),modules:[]});
 }
 const project=(k?:string)=>{if(!k)return '';const id=links.get(k);if(!id)throw Error('任务所属项目无效。');return id;};
 for(const m of p.planning?.modules||[]){
  const exists=Object.hasOwn(s.life.preferences.learningModuleWeekly,m.category)||s.life.courses.some(c=>!c.deletedAt&&c.category===m.category);
  run('life.learning.module',{...m,...(exists?{previous:m.category}:{})});
 }
 for(const d of p.planning?.learning||[]){
  if(courses.has(d.key))throw Error('学习子项草稿重复。');
  const projectId=project(d.projectKey),matches=s.life.courses.filter(x=>!x.deletedAt&&x.projectId===projectId&&x.category===d.category&&key(x.name)===key(d.name));
  if(matches.length>1||matches.some(c=>c.hidden))throw Error('学习子项存在歧义或已隐藏，请先核对。');
  const c=matches[0]||courseSchema.parse({...d,id:nextId(),projectId,initial:0,mode:d.total?'course':'practice'});
  if(!matches.length)run('life.save',{table:'courses',record:c});
  courses.set(d.key,c);
 }
 for(const d of p.planning?.monthly||[]){
  const projectId=project(d.projectKey),weekStart=s.monthlyPlans.find(x=>x.month===d.month)?.weekStart??s.settings.weekStart;
  run('monthly.goal.save',{month:d.month,weekStart,goal:{projectId,minutes:d.minutes,outcome:d.outcome,weeks:d.weeks??distributeMonth(d.minutes,monthWeeks(d.month,weekStart))}});
 }
 for(const d of p.tasks){
  const c=d.learningKey?courses.get(d.learningKey):undefined;if(d.learningKey&&!c)throw Error('请选择有效的学习子项。');
  const projectId=project(d.projectKey)||c?.projectId||'';
  if(c?.projectId&&c.projectId!==projectId)throw Error('学习子项与任务所属项目不一致。');
  const value=taskInput.parse({...d,projectId,activity:c?{kind:'german',refId:c.id,category:c.category}:null,actual:null,progress:0,date:d.plans?.length?'':d.date,start:d.plans?.length?'':d.start});
  if(d.kind&&d.kind!=='once'){
   const matches=s.templates.filter(t=>key(t.task.title)===key(d.title)&&t.task.projectId===projectId&&t.task.activity?.refId===c?.id);
   if(matches.length>1||matches.some(t=>!residentAvailable(s,t)))throw Error('常驻入口重复、暂停或已归档，请先核对。');
   const templateId=matches[0]?.id||nextId();
   if(!matches.length)run('template.save',{id:templateId,task:value,kind:d.kind});
   const slots=d.plans?.length?d.plans:d.date?[{date:d.date,start:d.start,minutes:d.minutes}]:[];
   for(const slot of slots)run('template.use',{id:templateId,newId:nextId(),...slot});
  }else{
   if(s.tasks.some(t=>!t.deletedAt&&t.title===d.title&&t.projectId===projectId&&t.date===value.date&&t.start===value.start))throw Error('清单中有重复事项，请取消重复项后再保存。');
   const taskId=nextId();run('task.save',{id:taskId,task:value});
   for(const slot of d.plans||[])run('task.plan.save',{id:taskId,planId:nextId(),...slot});
  }
 }
 if(p.planning?.remaining){
  const t=s.tasks.find(t=>t.id===taskId&&!t.deletedAt&&!t.templateOnly);if(!t)throw Error('请先选择要调整的原任务。');
  run('task.plan.reestimate',{id:t.id,expected:planningSignature(t),remaining:p.planning.remaining.minutes,plans:p.planning.remaining.plans.map(x=>({...x,id:nextId()}))});
 }
 if((p.planning?.learning.length||p.planning?.modules.length)&&s.settings.visibleModules&&!s.settings.visibleModules.includes('german'))s.settings.visibleModules.push('german');
 if(firstLogin&&s.onboarding==='pending')s.onboarding='completed';
 s.receipts=[...s.receipts,receipt].slice(-100);
 return validateState(s);
}
