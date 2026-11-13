import {currentEstimate,remainingMinutes} from '../lib/task-plans';
import ActivityProgress from './activity-progress';
import type {ActivityLink} from '../lib/life-schema';
import TaskPlanEditor from './task-plan-editor';
import {LearningLinkEditor} from './learning-reassign';
import {t as ui,tr,locale} from '../lib/i18n';
import SessionEditor from './session-editor';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,Play,Pencil} from 'lucide-react';
import {type State,type Task,type Command,formatTime as fmt} from '../lib/model';
import {localInstant,localParts,progressSource} from '../lib/task-investment';
import DurationInput from './duration-input';
import './task-record.css';
type Mutate=(c:Command,message?:string)=>Promise<boolean>;
export function TaskProgress({task}:{task:Task}){
 const time=progressSource(task)==='time',percent=time&&currentEstimate(task)?Math.min(100,Math.round((task.actual||0)/currentEstimate(task)*100)):task.progress;
 return <div className="task-investment"><span>{time?ui("时长投入"):ui("完成进度")} <b>{percent}%</b> {ui("· 累计")}{fmt(task.actual||0)}{currentEstimate(task)?ui(" / 预计 ")+fmt(currentEstimate(task)):''}</span>{task.remainingEstimate&&<small>{ui('剩余计划')} {fmt(remainingMinutes(task))} · {ui('初始预计')} {fmt(task.remainingEstimate.initialMinutes)}</small>}<progress max={100} value={percent} aria-label={task.title+ui("进度")}/>{time&&percent>=100&&task.progress<100&&<small>{ui("已达到预计用时，做完后可标记整项完成。")}</small>}</div>;
}
export default function TaskRecord({task,state,busy,mutate,close,edit,focus,error,initialSessionId,progressRef,initialTab,hideQuickActions}:{hideQuickActions?:boolean;initialTab?:'progress'|'history'|'add';progressRef?:ActivityLink;initialSessionId?:string;task:Task;state:State;busy:boolean;mutate:Mutate;close:()=>void;edit:()=>void;focus:()=>void;error:string}){
 const dialog=useRef<HTMLDialogElement>(null),[minutes,setMinutes]=useState<number|null>(null),[date,setDate]=useState(localParts(Date.now(),state.settings.timezone).date),[timed,setTimed]=useState(false),[start,setStart]=useState(''),[end,setEnd]=useState(''),[mode,setMode]=useState(progressSource(task)),[percent,setPercent]=useState(task.progress),[note,setNote]=useState(''),[issue,setIssue]=useState('');
 const allHistory=state.sessions.filter(x=>x.taskId===task.id).slice().reverse(),history=allHistory.filter(x=>!x.deletedAt),deleted=allHistory.filter(x=>x.deletedAt);
 const [editing,setEditing]=useState<string|null>(initialSessionId||null),[tab,setTab]=useState<'progress'|'add'|'history'|'plans'>(initialTab||'progress');
 const [scope,setScope]=useState(initialSessionId??(state.life.entries.some(e=>e.taskId===task.id&&!e.sessionId)?'':history[0]?.id||'')),[correction,setCorrection]=useState<number|null>(task.actual),[correcting,setCorrecting]=useState(false);
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 const save=async(complete=false)=>{setIssue('');try{
  const times=timed?{startedAt:localInstant(start,state.settings.timezone),endedAt:localInstant(end,state.settings.timezone)}:{};
  if(!complete&&!timed&&!minutes&&mode===progressSource(task)&&(mode!=='manual'||percent===task.progress)){setIssue('填一段用时，或调整完成百分比后再保存。');return;}
  const ok=await mutate({type:'task.record',payload:{id:task.id,minutes:timed?0:minutes||0,date,...times,progressSource:mode,...(complete?{progress:100}:mode==='manual'?{progress:percent}:{}),note}},complete?ui("整项任务已完成。"):ui("投入已保存，累计与进度已更新。"));if(ok)close();
 }catch(e){setIssue(e instanceof Error?e.message:'记录未保存。');}};
 return createPortal(<dialog ref={dialog} className="modal task-detail" aria-label={ui("事项进展")} onCancel={e=>{e.preventDefault();close();}}>
  <header><div><small>{ui("事项进展")}</small><h2>{task.title}</h2></div><button type="button" className="icon-btn" aria-label={ui("关闭进展记录")} onClick={close}><X/></button></header>
  <div className="task-detail-scroll">{task.note&&<details><summary>{ui("事项备注")}</summary><p>{task.note}</p></details>}
   {tab!=='progress'&&<><div className="detail-summary"><div><small>{ui("累计投入")}</small><strong>{fmt(task.actual||0)}</strong></div><div><small>{ui("预计用时")}</small><strong>{currentEstimate(task)?fmt(currentEstimate(task)):ui("未设定")}</strong></div><div><small>{task.progress===100?ui("任务状态"):mode==='time'?ui("按用时推进"):ui("完成进度")}</small><strong>{task.progress===100?ui("已完成"):Math.min(100,mode==='time'&&currentEstimate(task)?Math.round((task.actual||0)/currentEstimate(task)*100):task.progress)+'%'}</strong></div></div>
   {!hideQuickActions&&<div className="detail-actions">{task.progress<100&&<button type="button" className="primary" onClick={focus}><Play size={15}/>{ui("开始专注")}</button>}<button type="button" onClick={edit}><Pencil size={15}/>{ui("编辑事项")}</button></div>}
   {(!task.activity||task.activity.kind==='german')&&<details className="detail-options"><summary>{ui("所属学习子项")}</summary><LearningLinkEditor state={state} selection={{kind:'task',id:task.id}} mutate={mutate} busy={busy} onDone={close}/></details>}
   </>}<div className="detail-tabs"><button type="button" aria-pressed={tab==='progress'} onClick={()=>setTab('progress')}>{ui("记录进度")}</button><button type="button" aria-pressed={tab==='plans'} onClick={()=>setTab('plans')}>{ui('分段安排')}</button><button type="button" aria-pressed={tab==='add'} onClick={()=>setTab('add')}>{ui("记录用时")}</button><button type="button" aria-pressed={tab==='history'} onClick={()=>setTab('history')}>{ui("历史记录")}<span>{history.length}</span></button></div>
   {tab==='progress'?<><label>{ui('关联哪一次投入')}<select value={scope} onChange={e=>{setScope(e.target.value);setCorrecting(false);}}><option value="">{ui('原任务 / 历史记录')}</option>{history.map(x=><option key={x.id} value={x.id}>{x.date} · {fmt(x.seconds/60)} · {x.source==='manual'?ui('手动记录'):ui('专注记录')}</option>)}</select></label>{correcting&&<div className="progress-object"><DurationInput label={ui('修正任务累计实际用时')} value={correction} max={100000} onChange={setCorrection}/><button disabled={busy} type="button" onClick={()=>void mutate({type:'activity.time.correct',payload:{taskId:task.id,actual:correction}},ui('累计用时已修正。')).then(ok=>{if(ok)setCorrecting(false);})}>{ui('确认修正')}</button></div>}<ActivityProgress key={scope} reference={progressRef} state={state} task={task} sessionId={scope||undefined} busy={busy} mutate={mutate} saved={close} append={()=>setTab('add')} editTime={()=>{if(scope){setEditing(scope);setTab('history');}else setCorrecting(v=>!v);}} error={error}/></>:tab==='plans'?<><TaskPlanEditor task={task} state={state} busy={busy} mutate={mutate}/>{error&&<p role="alert">{ui(error)}</p>}</>:tab==='add'?<form onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}>
    <p className="detail-description">{ui("填这一次的用时即可，系统会累加。具体几点做的，可以不填。")}</p>
    <DurationInput label={ui("这次投入了多久")} value={minutes} max={1440} onChange={setMinutes}/>
    <details className="detail-options"><summary>{ui("日期与具体时间（选填）")}</summary><label>{ui("记录日期")}<input type="date" value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label><label className="record-check"><input type="checkbox" checked={timed} onChange={e=>setTimed(e.target.checked)}/>{ui("填写具体起止，自动计算本次用时")}</label>{timed&&<div className="fields cols-2"><label>{ui("实际开始")}<input type="datetime-local" required value={start} onInput={e=>setStart(e.currentTarget.value)} onChange={e=>setStart(e.target.value)}/></label><label>{ui("实际结束")}<input type="datetime-local" required value={end} onInput={e=>setEnd(e.currentTarget.value)} onChange={e=>setEnd(e.target.value)}/></label></div>}</details>
    <details className="detail-options"><summary>{ui("更新完成百分比")}</summary><label>{ui("进度怎么计算")}<select aria-label={ui("进度怎么计算")} value={mode} onChange={e=>setMode(e.target.value as 'time'|'manual')}><option value="time">{ui("累计用时 ÷ 预计用时")}</option><option value="manual">{ui("我自己填写百分比")}</option></select></label>{mode==='manual'&&<label>{ui("当前完成进度")}<input aria-label={ui("当前完成进度")} type="number" min={0} max={100} required value={percent} onChange={e=>setPercent(Number(e.target.value))}/><small>{ui("填写当前总进度，不是本次增加量。")}</small></label>}</details>
    <label>{ui("做了什么")}<input maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder={ui("可不填")}/></label>
    {(issue||error)&&<p role="alert" className="inline-error">{issue||error}</p>}
    <div className="detail-save"><button type="button" onClick={close}>{ui("取消")}</button><button className="primary" type="submit">{ui("保存这次投入")}</button></div>
   </fieldset></form>:<div className="detail-history">
    {history.map(x=><article key={x.id}><div className="history-heading"><div><strong>{x.seconds?fmt(x.seconds/60):ui("进度更新")}</strong><small>{x.date} · {x.source==='manual'?ui("手动记录"):ui("专注记录")}</small></div><div className="history-actions"><button type="button" title={ui("修改这一段投入")} aria-label={ui("修改投入 ")+x.date+' '+fmt(x.seconds/60)} disabled={busy} onClick={()=>setEditing(editing===x.id?null:x.id)}><Pencil size={15}/></button><button type="button" disabled={busy} onClick={()=>void mutate({type:'session.delete',payload:{id:x.id}},ui("记录已删除，可在下方恢复。"))}>{ui("删除")}</button></div></div>
    {x.spans?.length?x.spans.map((b,i)=>{const a=localParts(Date.parse(b.startedAt),state.settings.timezone),z=localParts(Date.parse(b.endedAt),state.settings.timezone);return <p className="history-time" key={i}>{a.date!==x.date?a.date+' ':''}{a.time} — {z.date!==a.date?z.date+' ':''}{z.time}</p>;}):<p className="history-time">{ui("仅记录用时")}{x.source!=='manual'?ui(" · 这条旧记录未保存起止"):''}</p>}
    {x.note&&<p>{x.note}</p>}{editing===x.id&&<SessionEditor key={x.id} session={x} timezone={state.settings.timezone} busy={busy} mutate={mutate} close={()=>setEditing(null)}/>}</article>)}
    {!history.length&&<p className="detail-description">{ui("还没有分段记录。可以开始专注，或只补记一段用时。")}</p>}{error&&<p role="alert" className="inline-error">{ui(error)}</p>}
    {!!deleted.length&&<details className="detail-options"><summary>{ui("已删除 ·")}{deleted.length}</summary>{deleted.map(x=><div className="deleted-record" key={x.id}><span>{x.date} · {fmt(x.seconds/60)}</span><button type="button" disabled={busy} onClick={()=>void mutate({type:'session.restore',payload:{id:x.id}},ui("记录已恢复。"))}>{ui("恢复")}</button></div>)}</details>}
   </div>}
  </div>
 </dialog>,document.body);
}
