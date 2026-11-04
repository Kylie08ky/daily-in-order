import type {State} from './model.ts';
export type UsageProgress={step:number;projectId:string;taskId:string;awaiting:'project'|'task'|null};
export const newUsageProgress=():UsageProgress=>({step:0,projectId:'',taskId:'',awaiting:null});
export function usageSelection(s:State,g:UsageProgress){
 const project=s.projects.find(p=>p.id===g.projectId&&!p.deletedAt&&p.status==='active');
 const task=project?s.tasks.find(t=>t.id===g.taskId&&t.projectId===project.id&&!t.deletedAt):undefined;
 const scheduled=!!task?.date&&!!task.start&&task.minutes>0;
 const step=!project?0:!task?Math.min(g.step,1):!scheduled?Math.min(g.step,2):g.step;
 return {project,task,scheduled,step};
}
