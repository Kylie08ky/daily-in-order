import type {State,TaskInput} from './model.ts';
import type {Classification} from './classification-schema.ts';
import {investmentByTask,minutesInRange} from './task-investment.ts';
export const domainNames={language:'语言',learning:'学习',reading:'阅读',fitness:'健身',work:'工作',life:'生活事项'};
export const studyNames={personal:'个人项目',skills:'技能学习',professional:'专业学习'};
export const classificationLabel=(c?:Classification|null)=>c?domainNames[c.domain]+(c.domain==='learning'&&c.study?' → '+studyNames[c.study]:'')+(c.domain==='language'&&c.language?' → '+c.language:''):'待确认';
export const classificationSignature=(v:{classification?:Classification})=>JSON.stringify(v.classification??null);
export type Classifiable=TaskInput&{id?:string;outcomes?:State['tasks'][number]['outcomes']};
/** No titles, dates, estimates or fuzzy matching. Explicit object links only. */
export function classificationEvidence(s:State,t:Classifiable){
 const candidates:Classification[]=[],reasons:string[]=[],unresolved:string[]=[];
 const add=(c:Classification,r:string)=>{candidates.push(c);reasons.push(r);};
 const template=s.templates.find(r=>r.id===(t as {sourceTemplateId?:string}).sourceTemplateId);if(template?.task.classification)add(template.task.classification,'常驻入口已确认分类');
 const links=[...(t.activity?[t.activity]:[]),...s.life.entries.filter(e=>!e.deletedAt&&e.taskId&&e.taskId===t.id).map(e=>({kind:e.kind,refId:e.timeRefId||e.refId}))];
 for(const link of links){
  if(link.kind==='reading')add({domain:'reading'},'书籍关联');
  else if(link.kind==='fitness')add({domain:'fitness'},'训练关联');
  else {const c=s.life.courses.find(x=>x.id===link.refId);if(c?.classification)add(c.classification,'学习对象已确认分类');else unresolved.push('学习对象尚未确认分类');}
 }
 // Module mapping is usable only when the mapped object itself has a confirmed domain.
 if(!links.length){const courses=s.life.courses.filter(c=>c.projectId===t.projectId&&((!!t.moduleId&&c.moduleIds.includes(t.moduleId))||(!t.moduleId&&!!t.projectId&&c.includeProject)));for(const c of courses)if(c.classification)add(c.classification,'现有模块映射');else unresolved.push('模块对应对象尚未确认分类');}
 if(t.developmentIds?.length)add({domain:'learning',study:'personal'},'具体项目关联');
 if(t.outcomes?.some(o=>!o.deletedAt&&(o.developmentId||o.version)))add({domain:'learning',study:'personal'},'具体项目或版本成果');
 if(t.id&&s.developmentProjects.some(p=>p.templateId&&s.templates.some(r=>r.id===p.templateId&&(r.originTaskId===t.id||r.id===(t as {sourceTemplateId?:string}).sourceTemplateId))))add({domain:'learning',study:'personal'},'具体项目入口');
 if(['工作','work'].includes(t.category))add({domain:'work'},'已有明确工作分类');
 if(['生活','生活事项','life','家务','社交'].includes(t.category))add({domain:'life'},'已有明确生活分类');
 const unique=[...new Map(candidates.map(c=>[JSON.stringify(c),c])).values()];
 return {suggestion:unique.length===1&&!unresolved.length?unique[0]:undefined,candidates:unique,reasons:[...new Set(reasons)],unresolved:[...new Set(unresolved)],conflict:unique.length>1};
}
export function effectiveClassification(s:State,t:Classifiable){return t.classification??classificationEvidence(s,t).suggestion;}
export function classificationConflict(s:State,t:Classifiable,c?:Classification){
 if(!c)return false;
 const e=classificationEvidence(s,t);return e.candidates.some(x=>x.domain!==c.domain||(x.domain==='learning'&&x.study!==c.study)||(x.domain==='language'&&c.language&&x.language&&c.language!==x.language));
}
export function inheritClassification(s:State,t:TaskInput):TaskInput {const c=effectiveClassification(s,t);return !t.classification&&c?{...t,classification:c}:t;}
export function classificationInventory(s:State){
 return [...s.tasks.map(t=>({kind:'task' as const,id:t.id,label:t.title,value:t})),...s.templates.map(t=>({kind:'template' as const,id:t.id,label:t.task.title,value:t.task})),...s.series.map(t=>({kind:'series' as const,id:t.id,label:t.template.title,value:t.template}))].map(r=>({...r,expected:classificationSignature(r.value),...classificationEvidence(s,r.value)}));
}
/** The same actual ledger as daily statistics, including unresolved tasks. */
export function classificationTotals(s:State,from='2000-01-01',to='2100-12-31'){
 const ledger=investmentByTask(s),totals:Record<string,number>={};let total=0;
 for(const t of s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly)){const n=minutesInRange(ledger.get(t.id),from,to),c=t.classification,key=c?c.domain+(c.domain==='learning'?':'+c.study:''):'unclassified';totals[key]=(totals[key]||0)+n;total+=n;}
 return {totals,total};
}
