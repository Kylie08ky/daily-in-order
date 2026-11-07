import {useMemo,useRef,useEffect,useState,type FormEvent} from 'react';
import {Plus,Pencil,Trash2,ChevronLeft,ChevronRight,X,CalendarDays,ArrowRight} from 'lucide-react';
import {type State,type Task,type TaskInput,type Command,formatTime as fmt,finished} from '../lib/model';
import {monthWeeks,distributeMonth,type MonthlyGoal,type MonthlyPlan} from '../lib/monthly-plan-schema';
import {monthlyMetrics} from '../lib/monthly-planning';
import {t as ui,tr} from '../lib/i18n';
import DurationInput from './duration-input';
import './monthly-planning.css';

type Props={state:State;month:string;setMonth:(month:string)=>void;busy:boolean;error:string;mutate:(command:Command,message?:string)=>Promise<boolean>;newTask:(defaults:Partial<TaskInput>)=>void;editTask:(task:Task)=>void;openWeek:(date:string)=>void;openProject:(id:string)=>void;createProject:()=>void};
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

function ScheduleTask({task,from,to,busy,schedule,edit}:{task:Task;from:string;to:string;busy:boolean;schedule:(date:string,start:string)=>Promise<boolean>;edit:()=>void}){
 const inWeek=task.date>=from&&task.date<=to;
 const [date,setDate]=useState(inWeek?task.date:from),[start,setStart]=useState(inWeek?task.start:'');
 return <form className="monthly-task-row" onSubmit={async e=>{e.preventDefault();const values=new FormData(e.currentTarget);await schedule(String(values.get('date')??date),String(values.get('start')??start));}}>
  <div className="monthly-task-name"><strong>{task.title}</strong><small>{fmt(task.minutes)} · {inWeek?ui('已安排'):ui('未安排')}</small></div>
  {task.parentId?<button type="button" onClick={edit}>{ui('编辑关联任务')}</button>:<>
   <label><span>{ui('日期')}</span><input name="date" aria-label={tr('安排日期：{0}',task.title)} required type="date" min={from} max={to} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label><span>{ui('开始时间（可不填）')}</span><input name="start" aria-label={tr('开始时间：{0}',task.title)} type="time" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <button disabled={busy} type="submit">{ui(inWeek?'更新安排':'安排')}</button>
  </>}
 </form>;
}

export default function MonthlyPlanning({state,month,setMonth,busy,error,mutate,newTask,editTask,openWeek,openProject,createProject}:Props){
 const [tab,setTab]=useState<'month'|'week'>('month'),[weekIndex,setWeekIndex]=useState(0),[editing,setEditing]=useState<MonthlyGoal|null|undefined>(),[scheduling,setScheduling]=useState('');
 const plan=state.monthlyPlans.find(p=>p.month===month)??{month,weekStart:state.settings.weekStart,goals:[]};
 const metrics=useMemo(()=>monthlyMetrics(state,plan),[state,month]),week=metrics.weeks[Math.min(weekIndex,metrics.weeks.length-1)];
 const project=(id:string)=>state.projects.find(p=>p.id===id);
 const canAdd=state.projects.some(p=>!p.deletedAt&&!plan.goals.some(g=>g.projectId===p.id));
 const selectedGoal=metrics.goals.find(g=>g.projectId===scheduling),selectedProject=project(scheduling);
 const candidates=state.tasks.filter(t=>!t.deletedAt&&!finished(t)&&t.projectId===scheduling&&(!t.date||(t.date>=week.from&&t.date<=week.to))).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||a.order-b.order);
 const shift=(n:number)=>{const d=new Date(month+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);const next=d.toISOString().slice(0,7);if(next>='2000-01'&&next<='2099-12')setMonth(next);};
 return <section className="monthly-planning">
  <header className="page-head"><div><h1>{ui('月度目标')}</h1><p>{ui('选项目，分配每周投入，再安排到日历。')}</p></div><div className="head-controls"><div className="monthly-month-picker"><button aria-label={ui('上个月')} disabled={month==='2000-01'} onClick={()=>shift(-1)}><ChevronLeft size={17}/></button><input aria-label={ui('目标月份')} type="month" min="2000-01" max="2099-12" value={month} onChange={e=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value)&&setMonth(e.target.value)}/><button aria-label={ui('下个月')} disabled={month==='2099-12'} onClick={()=>shift(1)}><ChevronRight size={17}/></button></div><button className="primary" disabled={!canAdd} onClick={()=>setEditing(null)}><Plus size={16}/>{ui('添加月度目标')}</button></div></header>
  <div className="monthly-summary">{[[ui('本月目标'),metrics.target],[ui('已分配到周'),metrics.allocated],[ui('已安排任务'),metrics.scheduled],[ui('实际投入'),metrics.actual]].map(([label,value])=><div key={label}><small>{label}</small><strong>{fmt(Number(value))}</strong></div>)}</div>
  <div className="tabs"><button aria-pressed={tab==='month'} onClick={()=>setTab('month')}>{ui('月度计划')}</button><button aria-pressed={tab==='week'} onClick={()=>setTab('week')}>{ui('每周执行')}</button></div>
  {!plan.goals.length?<div className="panel monthly-empty"><CalendarDays size={32}/><h2>{ui('这个月，想推进哪些项目？')}</h2><p>{ui('先选择已有项目并设定投入时长，系统会分到每周。')}</p><button className="primary" onClick={()=>canAdd?setEditing(null):createProject()}>{ui(canAdd?'选择本月项目':'先创建项目')}</button></div>:tab==='month'?<div className="monthly-goal-list">{metrics.goals.map(g=>{const p=project(g.projectId);return <article className="panel monthly-goal-card" key={g.projectId}>
   <header><div><button className="text-btn monthly-project-title" disabled={!!p?.deletedAt} onClick={()=>openProject(g.projectId)}><i style={{background:p?.color}}/>{p?.name||ui('已删除项目')}<ArrowRight size={15}/></button>{p?.deletedAt&&<small>{ui('项目已删除')}</small>}{g.outcome&&<p>{g.outcome}</p>}</div><div className="monthly-goal-actions"><button aria-label={tr('调整目标：{0}',p?.name)} disabled={busy||!!p?.deletedAt} onClick={()=>setEditing(g)}><Pencil size={15}/>{ui('调整目标')}</button><button className="icon-btn" aria-label={tr('移除月度目标：{0}',p?.name)} disabled={busy} onClick={()=>{if(confirm(ui('只移除本月目标，不删除项目、任务或投入记录。继续吗？')))void mutate({type:'monthly.goal.remove',payload:{month,projectId:g.projectId}},ui('月度目标已移除。'));}}><Trash2 size={16}/></button></div></header>
   <div className="monthly-goal-numbers"><strong>{fmt(g.actual)} <small>/ {fmt(g.minutes)}</small></strong><span>{ratio(g.actual,g.minutes)}% · {ui('实际投入')}</span></div><Bar actual={g.actual} target={g.minutes}/>
   <div className="monthly-goal-bottom"><small>{tr('已安排 {0} · 待分配 {1}',fmt(g.scheduled),fmt(g.minutes-g.allocated))}</small><button className="text-btn" onClick={()=>{setTab('week');setScheduling(g.projectId);}}>{ui('查看每周计划')} <ArrowRight size={15}/></button></div>
   <div className="monthly-mini-weeks">{g.weekly.map((w,i)=><button key={w.key} onClick={()=>{setWeekIndex(i);setScheduling(g.projectId);setTab('week');}}><span>{tr('第 {0} 周',i+1)}</span><strong>{fmt(w.target)}</strong><Bar actual={w.actual} target={w.target}/></button>)}</div>
  </article>;})}</div>:<>
   <div className="monthly-week-tabs">{metrics.weeks.map((w,i)=><button key={w.key} aria-pressed={week.key===w.key} onClick={()=>setWeekIndex(i)}><strong>{tr('第 {0} 周',i+1)}</strong><span>{dates(w)}</span><small>{tr('{0} 天',w.days)}</small></button>)}</div>
   <section className="panel monthly-week-plan"><header><div><h2>{dates(week)}</h2><p>{tr('目标 {0} · 已安排 {1} · 实际 {2}',fmt(week.target),fmt(week.scheduled),fmt(week.actual))}</p>{week.available>0&&<small className={week.target>week.available?'inline-error':''}>{tr('本周可投入 {0}',fmt(week.available))}{week.target>week.available?' · '+ui('目标超过可投入时间'):''}</small>}</div><button onClick={()=>openWeek(week.from)}><CalendarDays size={16}/>{ui('打开本周日历')}</button></header>
    {metrics.goals.map(g=>{const p=project(g.projectId),w=g.weekly.find(x=>x.key===week.key)!;return <div className="monthly-week-project" key={g.projectId}><div><strong>{p?.name||ui('已删除项目')}</strong><small>{tr('目标 {0} · 已安排 {1} · 实际 {2}',fmt(w.target),fmt(w.scheduled),fmt(w.actual))}</small><Bar actual={w.actual} target={w.target}/></div><button disabled={!!p?.deletedAt} aria-pressed={scheduling===g.projectId} onClick={()=>setScheduling(g.projectId)}>{ui('安排任务')}</button></div>;})}
   </section>
   {selectedGoal&&selectedProject&&!selectedProject.deletedAt&&<section className="panel monthly-task-planner"><header><div><h2>{selectedProject.name}</h2><p>{ui('选择本周日期，开始时间可以留空。')}</p></div><button className="primary" onClick={()=>newTask({projectId:scheduling,date:week.from,start:'',minutes:30})}><Plus size={16}/>{ui('新建事项')}</button></header><div className="monthly-task-list">{candidates.map(t=><ScheduleTask key={week.key+':'+t.id+':'+t.date+':'+t.start} task={t} from={week.from} to={week.to} busy={busy} edit={()=>editTask(t)} schedule={(date,start)=>mutate({type:'task.schedule',payload:{id:t.id,date,start}},ui('已安排到日历。'))}/>)}{!candidates.length&&<p className="hint">{ui('没有未安排或本周待完成的任务，可以新建事项。')}</p>}</div></section>}
  </>}
  {editing!==undefined&&<GoalEditor key={month+':'+(editing?.projectId??'new')} state={state} plan={plan} goal={editing} busy={busy} error={error} close={()=>setEditing(undefined)} save={goal=>mutate({type:'monthly.goal.save',payload:{month,weekStart:plan.weekStart,goal}},ui('月度目标已保存。'))}/>}
 </section>;
}
