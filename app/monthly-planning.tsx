import {useMemo,useRef,useEffect,useState,type FormEvent} from 'react';
import {Plus,Pencil,Trash2,ChevronLeft,ChevronRight,X,CalendarDays,ArrowRight} from 'lucide-react';
import {type State,type Task,type TaskInput,type Command,formatTime as fmt,finished} from '../lib/model';
import {monthWeeks,distributeMonth,type MonthlyGoal,type MonthlyPlan} from '../lib/monthly-plan-schema';
import {monthlyMetrics} from '../lib/monthly-planning';
import {t as ui,tr} from '../lib/i18n';
import DurationInput from './duration-input';
import './monthly-planning.css';
import './planning-workflow.css';
import PlanningWeek from './planning-week';
import {monthReview} from '../lib/planning-workflow';

type Props={state:State;month:string;setMonth:(month:string)=>void;busy:boolean;error:string;mutate:(command:Command,message?:string)=>Promise<boolean>;newTask:(defaults:Partial<TaskInput>)=>void;editTask:(task:Task)=>void;stage:'month'|'week';setStage:(stage:'month'|'week')=>void;weekKey:string;setWeek:(key:string)=>void;openDay:(date:string)=>void;openProject:(id:string)=>void;createProject:()=>void};
const ratio=(actual:number,target:number)=>target?Math.min(100,Math.round(actual/target*100)):0;
const dates=(w:{from:string;to:string})=>w.from.slice(5)+' – '+w.to.slice(5);
function Bar({actual,target}:{actual:number;target:number}){return <div className="progress"><span style={{width:ratio(actual,target)+'%'}}/></div>;}

function GoalEditor({state,plan,goal,busy,error,save,close}:{state:State;plan:MonthlyPlan;goal:MonthlyGoal|null;busy:boolean;error:string;save:(goal:MonthlyGoal)=>Promise<boolean>;close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),[draft,setDraft]=useState<MonthlyGoal>(goal??{projectId:'',minutes:0,outcome:'',weeks:{}}),[dirty,setDirty]=useState(false);
 const weeks=monthWeeks(plan.month,plan.weekStart),allocated=Object.values(draft.weeks).reduce((a,b)=>a+b,0),difference=draft.minutes-allocated;
 const projects=state.projects.filter(p=>!p.deletedAt&&(p.id===goal?.projectId||!plan.goals.some(g=>g.projectId===p.id)));
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 const dismiss=()=>{if(!dirty||confirm(ui('放弃尚未保存的月度目标修改？')))close();};
 const change=(value:Partial<MonthlyGoal>)=>{setDraft(d=>({...d,...value}));setDirty(true);};
 const submit=async(e:FormEvent)=>{e.preventDefault();if(await save(draft))close();};
 return <dialog ref={ref} className="modal wide monthly-goal-editor" aria-label={ui(goal?'调整月度目标':'添加月度目标')} onCancel={e=>{e.preventDefault();dismiss();}}>
  <header><div><h2>{ui(goal?'调整月度目标':'添加月度目标')}</h2><p>{plan.month}</p></div><button className="icon-btn" aria-label={ui('关闭')} onClick={dismiss}><X/></button></header>
  <form onSubmit={submit}><fieldset disabled={busy}>
   <label>{ui('选择项目')}<select required value={draft.projectId} disabled={!!goal} onChange={e=>change({projectId:e.target.value})}><option value="">{ui('请选择项目')}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>{ui('本月想完成什么（可选）')}<input maxLength={300} value={draft.outcome} onChange={e=>change({outcome:e.target.value})}/></label>
   <DurationInput label={ui('本月目标时长')} value={draft.minutes} max={weeks.reduce((n,w)=>n+w.days*1440,0)} onChange={v=>{const minutes=v??0;change({minutes,...(!goal?{weeks:distributeMonth(Math.max(0,Math.min(44640,Math.round(minutes))),weeks)}:{})});}}/>
   <div className="monthly-allocation-heading"><div><h3>{ui('分配到每周')}</h3><p>{ui('按各周在当月的天数分配，可逐周调整。')}</p></div><button type="button" disabled={!Number.isInteger(draft.minutes)||draft.minutes<=0||draft.minutes>44640} onClick={()=>change({weeks:distributeMonth(draft.minutes,weeks)})}>{ui('重新自动分配')}</button></div>
   <div className="monthly-allocation-grid">{weeks.map((w,i)=><div key={w.key}><strong>{tr('第 {0} 周',i+1)}</strong><small>{dates(w)} · {tr('{0} 天',w.days)}</small><DurationInput label={tr('第 {0} 周目标',i+1)} value={draft.weeks[w.key]??0} max={w.days*1440} onChange={v=>change({weeks:{...draft.weeks,[w.key]:v??0}})}/></div>)}</div>
   <p className={difference<0?'inline-error':'monthly-allocation-status'} role="status">{difference===0?tr('已全部分配：{0}',fmt(allocated)):difference>0?tr('还有 {0} 待分配，可先保存。',fmt(difference)):tr('超出月目标 {0}，请调整。',fmt(-difference))}</p>
   {error&&<p className="inline-error" role="alert">{error}</p>}
   <div className="form-footer"><button type="button" onClick={dismiss}>{ui('取消')}</button><button className="primary" disabled={!draft.projectId||draft.minutes<=0||difference<0}>{ui('保存目标')}</button></div>
  </fieldset></form>
 </dialog>;
}

export default function MonthlyPlanning({state,month,setMonth,busy,error,mutate,newTask,editTask,stage,setStage,weekKey,setWeek,openDay,openProject,createProject}:Props){
 const [editing,setEditing]=useState<MonthlyGoal|null|undefined>();
 const plan=state.monthlyPlans.find(p=>p.month===month)??{month,weekStart:state.settings.weekStart,goals:[]};
 const metrics=useMemo(()=>monthlyMetrics(state,plan),[state,month]),review=monthReview(state,month);
 const project=(id:string)=>state.projects.find(p=>p.id===id);
 const canAdd=state.projects.some(p=>!p.deletedAt&&!plan.goals.some(g=>g.projectId===p.id));
 const shift=(n:number)=>{const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);const next=d.toISOString().slice(0,7);if(next>='2000-01'&&next<='2099-12')setMonth(next);};
 const taskLine=(t:Task)=><button key={t.id} className="plan-review-task" onClick={()=>editTask(t)}><span>{t.title}</span><small>{ui('预计用时')} {fmt(t.minutes)} · {ui('实际投入')} {t.actual===null?'—':fmt(t.actual)}</small><Pencil size={14}/></button>;
 return <section className="monthly-planning">
  <header className="page-head"><div><h1>{stage==='month'?ui('本月目标'):ui('每周安排')}</h1><p>{stage==='month'?ui('回顾上月，选定本月项目，再估算每周投入。'):ui('先看固定日程，再为待办选择日期与时长。')}</p></div><div className="head-controls"><div className="monthly-month-picker"><button aria-label={ui('上个月')} disabled={month==='2000-01'} onClick={()=>shift(-1)}><ChevronLeft size={17}/></button><input aria-label={ui('目标月份')} type="month" min="2000-01" max="2099-12" value={month} onChange={e=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value)&&setMonth(e.target.value)}/><button aria-label={ui('下个月')} disabled={month==='2099-12'} onClick={()=>shift(1)}><ChevronRight size={17}/></button></div><button className="primary" disabled={!canAdd} onClick={()=>setEditing(null)}><Plus size={16}/>{ui('添加月度目标')}</button><button onClick={createProject}><Plus size={16}/>{ui('新建项目')}</button></div></header>
  {stage==='month'&&<div className="monthly-summary">{[[ui('本月目标'),metrics.target],[ui('已分配到周'),metrics.allocated],[ui('已安排任务'),metrics.scheduled],[ui('实际投入'),metrics.actual]].map(([label,value])=><div key={label}><small>{label}</small><strong>{fmt(Number(value))}</strong></div>)}</div>}
  {stage==='week'?<PlanningWeek key={month} state={state} plan={plan} weekKey={weekKey} setWeek={setWeek} busy={busy} mutate={mutate} newTask={newTask} editTask={editTask} openDay={openDay} adjust={id=>setEditing(plan.goals.find(g=>g.projectId===id))}/>:<>
   <details className="panel plan-review" open={undefined}><summary><span><strong>{ui('上月回顾')}</strong><small>{review.previous} · {tr('{0} 个待续项目',review.projects.length)}</small></span><span>{ui('查看未完成项')}</span></summary><p>{ui('选择想继续的项目，修改本月预算后保存；历史任务不会自动移日。')}</p>
    {review.projects.map(r=><article key={r.project.id}><div className="plan-review-heading"><div><strong>{r.project.name}</strong><small>{r.target?tr('上月目标 {0} · 实际 {1} · 差额 {2}',fmt(r.target),fmt(r.actual),fmt(r.remaining)):tr('未完成事项预计剩余 {0}',fmt(r.remaining))} · {tr('{0} 项未完成',r.tasks.length)}</small></div><button disabled={busy} onClick={()=>setEditing(plan.goals.find(g=>g.projectId===r.project.id)??{projectId:r.project.id,minutes:Math.min(monthWeeks(month,plan.weekStart).reduce((n,w)=>n+w.days*1440,0),r.remaining),outcome:'',weeks:distributeMonth(Math.min(monthWeeks(month,plan.weekStart).reduce((n,w)=>n+w.days*1440,0),r.remaining),monthWeeks(month,plan.weekStart))})}>{plan.goals.some(g=>g.projectId===r.project.id)?ui('调整目标'):ui('纳入本月')}</button></div>{r.tasks.length>0&&<details><summary>{ui('查看事项与估时')}</summary><div className="plan-review-list">{r.tasks.map(taskLine)}</div></details>}</article>)}
    {review.independent.length>0&&<details><summary>{ui('独立事项')} · {review.independent.length}</summary><div className="plan-review-list">{review.independent.map(taskLine)}</div><p>{ui('在每周安排中选择独立事项，即可重新排期。')}</p></details>}
    {!review.projects.length&&!review.independent.length&&<p>{ui('上月没有待续项目或未完成事项。')}</p>}
   </details>
   {!plan.goals.length?<div className="panel monthly-empty"><CalendarDays size={32}/><h2>{ui('这个月，想推进哪些项目？')}</h2><p>{ui('先选择已有项目并设定投入时长，系统会分到每周。')}</p><button className="primary" onClick={()=>canAdd?setEditing(null):createProject()}>{ui(canAdd?'选择本月项目':'先创建项目')}</button></div>:<div className="monthly-goal-list">{metrics.goals.map(g=>{const p=project(g.projectId),pending=state.tasks.filter(t=>!t.deletedAt&&!finished(t)&&t.projectId===g.projectId);return <article className="panel monthly-goal-card" key={g.projectId}>
   <header><div><button className="text-btn monthly-project-title" disabled={!!p?.deletedAt} onClick={()=>openProject(g.projectId)}><i style={{background:p?.color}}/>{p?.name||ui('已删除项目')}<ArrowRight size={15}/></button>{p?.deletedAt&&<small>{ui('项目已删除')}</small>}{g.outcome&&<p>{g.outcome}</p>}</div><div className="monthly-goal-actions"><button aria-label={tr('调整目标：{0}',p?.name)} disabled={busy||!!p?.deletedAt} onClick={()=>setEditing(g)}><Pencil size={15}/>{ui('调整目标')}</button><button className="icon-btn" aria-label={tr('移除月度目标：{0}',p?.name)} disabled={busy} onClick={()=>{if(confirm(ui('只移除本月目标，不删除项目、任务或投入记录。继续吗？')))void mutate({type:'monthly.goal.remove',payload:{month,projectId:g.projectId}},ui('月度目标已移除。'));}}><Trash2 size={16}/></button></div></header>
   <div className="monthly-goal-numbers"><strong>{fmt(g.actual)} <small>/ {fmt(g.minutes)}</small></strong><span>{ratio(g.actual,g.minutes)}% · {ui('实际投入')}</span></div><Bar actual={g.actual} target={g.minutes}/>
   <div className="monthly-goal-bottom"><small>{tr('已安排 {0} · 待分配 {1}',fmt(g.scheduled),fmt(g.minutes-g.allocated))}</small><button className="text-btn" onClick={()=>setStage('week')}>{ui('查看每周计划')} <ArrowRight size={15}/></button></div>
   <div className="monthly-mini-weeks">{g.weekly.map((w,i)=><button key={w.key} onClick={()=>{setWeek(w.key);setStage('week');}}><span>{tr('第 {0} 周',i+1)}</span><strong>{fmt(w.target)}</strong><Bar actual={w.actual} target={w.target}/></button>)}</div>
   <details className="plan-goal-tasks"><summary>{ui('任务与估时')} · {pending.length}</summary><p>{ui('核对每个事项的预计用时，再按本月可投入时间调整目标。')}</p><div className="plan-review-list">{pending.map(taskLine)}</div><button disabled={!!p?.deletedAt} onClick={()=>newTask({projectId:g.projectId,date:'',start:'',minutes:30})}><Plus size={14}/>{ui('添加事项')}</button></details>
  </article>;})}</div>}
  <div className="plan-next"><button className="primary" onClick={()=>setStage('week')}>{ui('下一步：安排每周')} <ArrowRight size={16}/></button></div>
  </>}
  {editing!==undefined&&<GoalEditor key={month+':'+(editing?.projectId??'new')} state={state} plan={plan} goal={editing} busy={busy} error={error} close={()=>setEditing(undefined)} save={goal=>mutate({type:'monthly.goal.save',payload:{month,weekStart:plan.weekStart,goal}},ui('月度目标已保存。'))}/>}
 </section>;
}
