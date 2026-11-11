import {useState} from 'react';
import type {State,Command} from '../lib/model';
import {concreteOutcomes} from '../lib/development-projects';
import {t as ui} from '../lib/i18n';
import DevelopmentProjectForm from './development-project-form';
import './project-outcomes.css';
export default function ProjectOutcomes({state,projectId,open,mutate,busy}:{state:State;projectId:string;open:(taskId:string,sessionId?:string)=>void;mutate:(c:Command)=>Promise<boolean>;busy:boolean}){
 const [selected,setSelected]=useState<string|undefined>(),[editing,setEditing]=useState<string|null>(null);
 const projects=(state.developmentProjects||[]).filter(p=>p.projectId===projectId),rows=concreteOutcomes(state,projectId,selected);
 return <section className="panel concrete-projects"><div className="row between wrap"><div><h3>{ui('具体项目与成果')}</h3><p className="hint">{ui('共享投入 · 用时保留在原任务，成果按具体项目归档。')}</p></div><button disabled={busy} onClick={()=>setEditing('')}>{ui('新增具体项目')}</button></div>
 {editing!==null&&<DevelopmentProjectForm key={editing||'new'} state={state} projectId={projectId} value={projects.find(p=>p.id===editing)} mutate={mutate} busy={busy} done={id=>{setSelected(id);setEditing(null);}} cancel={()=>setEditing(null)}/>}
 <div className="concrete-grid">{projects.map(p=><article key={p.id} className={selected===p.id?'selected':''}><button className="concrete-open" onClick={()=>setSelected(p.id)}><small>{state.templates.find(t=>t.id===p.templateId)?.task.title||state.projects.find(x=>x.id===projectId)?.name}</small><strong>{p.name}</strong><span>{ui({ongoing:'进行中',paused:'暂停',ended:'结束'}[p.status])} · {ui('共享投入')}</span></button><button className="text-btn" onClick={()=>setEditing(p.id)}>{ui('编辑具体项目')}</button></article>)}</div>
 <div className="tabs concrete-filters"><button aria-pressed={selected===undefined} onClick={()=>setSelected(undefined)}>{ui('全部成果')}</button><button aria-pressed={selected===''} onClick={()=>setSelected('')}>{ui('待关联')}</button>{selected&&<strong>{projects.find(p=>p.id===selected)?.name}</strong>}</div>
 <p className="hint">{ui('成果来自原投入记录；阶段完成不代表整个项目完成。')}</p>
 <div className="concrete-history">{rows.map(({task,outcome:o})=><article className="project-outcome" key={task.id+o.id}><div><small>{o.date} · {task.title} · {ui('共享投入')}</small><strong>{projects.find(p=>p.id===o.developmentId)?.name||ui('待关联')} · {o.version||ui('本次成果')}</strong><small>{ui({ongoing:'进行中',milestone:'阶段完成',paused:'暂停',ended:'结束'}[o.status])}</small><p>{o.result}</p>{o.next&&<p>{ui('下一步')}：{o.next}</p>}</div><button onClick={()=>open(task.id,o.sessionId||'')}>{ui('编辑原记录')}</button></article>)}{!rows.length&&<p className="hint">{ui('暂无成果；在今日事项中记录后会显示在这里。')}</p>}</div></section>;
}
