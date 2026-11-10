import type {State} from '../lib/model';
import {t as ui} from '../lib/i18n';
export default function ProjectOutcomes({state,projectId,open}:{state:State;projectId:string;open:(taskId:string,sessionId?:string)=>void}){
 const rows=state.tasks.filter(t=>!t.deletedAt).flatMap(t=>(t.outcomes||[]).filter(o=>!o.deletedAt&&o.projectId===projectId).map(o=>({task:t,outcome:o}))).sort((a,b)=>b.outcome.date.localeCompare(a.outcome.date));
 if(!rows.length)return null;
 return <section className="panel"><h3>{ui('版本与成果记录')}</h3><p className="hint">{ui('成果来自原投入记录；阶段完成不代表整个项目完成。')}</p>{rows.map(({task,outcome:o})=><article className="project-outcome" key={task.id+o.id}><div><small>{o.date} · {task.title}</small><strong>{o.version||ui('本次成果')} · {ui({ongoing:'进行中',milestone:'阶段完成',paused:'暂停',ended:'结束'}[o.status])}</strong><p>{o.result}</p>{o.next&&<p>{ui('下一步')}：{o.next}</p>}</div><button onClick={()=>open(task.id,o.sessionId||'')}>{ui('编辑原记录')}</button></article>)}</section>;
}
