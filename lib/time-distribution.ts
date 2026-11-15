import type {Task,Project} from './model.ts';
import {domainNames} from './task-classification.ts';
export type TimeGrouping='classification'|'project';
export type TimeContribution={task:Task;minutes:number};
export type TimeBucket={id:string;name:string;color:string;value:number;interfaceLabel:boolean};
const colors={language:'#e6ad72',learning:'#8da9c4',reading:'#b4a0c4',fitness:'#7eaf9c',work:'#9daee0',life:'#b5bd88'};
/** Group the same actual-effort contributions; never infer classification from titles. */
export function timeDistribution(contributions:TimeContribution[],projects:Project[],group:TimeGrouping){
 const buckets=new Map<string,TimeBucket>();
 for(const {task,minutes} of contributions){
  if(task.deletedAt||task.templateOnly||!Number.isFinite(minutes)||minutes<=0)continue;
  const domain=task.classification?.domain,project=projects.find(p=>p.id===task.projectId);
  const id=group==='classification'?(domain||'unclassified'):(task.projectId||'independent');
  const name=group==='classification'?(domain?domainNames[domain]:'待确认'):project?.name||(task.projectId?'项目待核对':'独立事项');
  const color=group==='classification'?(domain?colors[domain]:'#aaa99b'):project?.color||'#c4b9a6';
  const row=buckets.get(id)||{id,name,color,value:0,interfaceLabel:group==='classification'||!project};
  row.value+=minutes;buckets.set(id,row);
 }
 const rows=[...buckets.values()].sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
 return {rows,total:rows.reduce((sum,row)=>sum+row.value,0)};
}
