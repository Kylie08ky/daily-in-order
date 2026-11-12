import {z} from 'zod';
import {type State,type Command,validateState,idString} from './model.ts';
import {developmentProjectSchema} from './progress-schema.ts';

/** Concrete projects contain metadata only. Time remains on the original execution. */
export function applyDevelopmentCommand(input:State,command:Command):State {
 const p=developmentProjectSchema.parse(command.payload),s=structuredClone(input);s.developmentProjects??=[];
 const old=(s.developmentProjects||[]).find(x=>x.id===p.id);
 if(!s.projects.some(x=>x.id===p.projectId&&!x.deletedAt))throw Error('请选择有效项目。');
 if(p.templateId&&!s.templates.some(x=>x.id===p.templateId&&x.task.projectId===p.projectId))throw Error('请选择同一项目下的常驻入口。');
 if(old&&(old.projectId!==p.projectId||old.templateId!==p.templateId))throw Error('已有具体项目须保留所属项目与常驻入口。');
 if(s.developmentProjects.some(x=>x.id!==p.id&&x.projectId===p.projectId&&x.templateId===p.templateId&&x.name===p.name))throw Error('同一入口下已有这个具体项目。');
 if(old)Object.assign(old,p);else s.developmentProjects.push(p);
 return validateState(s);
}

/** Corrections are limited to the existing checkpoint. No completion/time commands are invoked. */
export function applyReadingCheckpoint(input:State,command:Command):State {
 const p=z.object({id:idString,page:z.number().int().nonnegative().nullable(),startPage:z.number().int().nonnegative().nullable().optional()}).strict().parse(command.payload);
 const s=structuredClone(input),e=s.life.entries.find(x=>x.id===p.id&&!x.deletedAt&&x.kind==='reading');
 if(!e)throw Error('阅读记录不存在。');
 const b=s.life.books.find(x=>x.id===e.refId);if(!b)throw Error('关联书籍不存在。');
 const start=p.startPage===undefined?e.startPage:p.startPage;
 if(p.page!==null&&p.page>(b.total??100000))throw Error('页码不能超过书籍总页数。');
 if(start!=null&&(p.page===null||start>p.page))throw Error('起始页不能大于读到的页码。');
 if(p.page===null)delete e.page;else e.page=p.page;
 if(p.startPage===null)delete e.startPage;else if(p.startPage!==undefined)e.startPage=p.startPage;
 return validateState(s);
}

export function concreteOutcomes(s:State,projectId:string,developmentId?:string){
 return s.tasks.filter(t=>!t.deletedAt).flatMap(task=>(task.outcomes||[]).filter(o=>!o.deletedAt&&o.projectId===projectId&&(developmentId===undefined||(o.developmentId||'')===developmentId)).map(outcome=>({task,outcome}))).sort((a,b)=>b.outcome.date.localeCompare(a.outcome.date)||a.outcome.id.localeCompare(b.outcome.id));
}
