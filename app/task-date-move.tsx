import {useState} from 'react';
import {type State,type Task,type Command,businessDate,offsetDate,formatTime as fmt} from '../lib/model';
import {planningMetrics,planningSignature,remainingMinutes} from '../lib/task-plans';
import {completionDate,datesSignature} from '../lib/task-completion';
import {t as ui,tr} from '../lib/i18n';
import DurationInput from './duration-input';
import './task-plans.css';

type Mutate=(c:Command,message?:string)=>Promise<boolean>;

/**
 * One place to answer "which day is this on?" at the top of Edit task:
 * – today or later, unfinished: move only the unfinished part (single segment or merged);
 * – today or earlier: "this was done on X" sets the completion date and the date of any untimed total.
 * Saves immediately, so it is disabled while the form has unsaved edits (a later form save must not revert it).
 */
export default function TaskDateMove({task,state,busy,mutate,dirty,onDone}:{task:Task;state:State;busy:boolean;mutate:Mutate;dirty:boolean;onDone:()=>void}){
 const today=businessDate(state.settings),done=task.progress===100;
 const open=planningMetrics(state,task).ledger.filter(p=>!p.closed&&p.left>0);
 const invested=(task.actual||0)>0||state.sessions.some(x=>x.taskId===task.id&&!x.deletedAt);
 const timed=state.sessions.some(x=>x.taskId===task.id&&!x.deletedAt);
 const [date,setDate]=useState(()=>done?completionDate(task,state.settings.timezone)||today:today);
 const [minutes,setMinutes]=useState<number|null>(null);
 const simple=!task.plans&&!invested,total=Math.min(Math.round(open.reduce((n,p)=>n+p.left,0)),remainingMinutes(task));
 const canMove=!done&&!!date&&date>=today&&(simple||open.length>0)&&!(open.length===1&&open[0].date===date);
 const canFinish=!!date&&date<=today&&!(done&&completionDate(task,state.settings.timezone)===date);
 const move=async()=>{
  const ok=simple?await mutate({type:'task.schedule',payload:{id:task.id,date,start:task.start}},tr('已改到 {0}。',date))
   :await mutate({type:'task.plan.reschedule',payload:{id:task.id,expected:planningSignature(task),date}},open.length>1?tr('已合并到 {0}，共 {1}；已投入保留在原日期。',date,fmt(total)):tr('已改到 {0}；已投入保留在原日期。',date));
  if(ok)onDone();
 };
 const finish=async()=>{
  const ok=await mutate({type:'task.finish.on',payload:{id:task.id,expected:datesSignature(task),date,...(!done&&!invested&&minutes!==null?{actual:minutes}:{})}},done?tr('完成日期已改为 {0}。',date):tr('已记为 {0} 完成。',date));
  if(ok)onDone();
 };
 return <section className="task-date-move" aria-label={ui('改到哪天')}>
  <div className="task-date-move-head"><strong>{ui('改到哪天')}</strong>
   <div className="chips"><button type="button" onClick={()=>setDate(offsetDate(today,-1))}>{ui('昨天')}</button><button type="button" onClick={()=>setDate(today)}>{ui('今天')}</button><button type="button" onClick={()=>setDate(offsetDate(today,1))}>{ui('明天')}</button></div>
   <input type="date" aria-label={ui('改到哪天')} value={date} onChange={e=>setDate(e.target.value)}/></div>
  {dirty?<p className="hint">{ui('请先保存或放弃下面的修改，再改日期。')}</p>:<>
   {!done&&date>=today&&(simple||open.length>0)&&<div className="task-date-move-option">
    <button type="button" className="primary" disabled={busy||!canMove} onClick={()=>void move()}>{open.length>1?tr('合并 {0} 段到这天',open.length):ui('移到这天')}</button>
    <small>{simple?ui('只改计划日期。'):tr('只移动未做的 {0}；已投入保留在原日期。',fmt(total))}</small></div>}
   {date<=today&&<div className="task-date-move-option">
    {!done&&!invested&&<DurationInput label={ui('用了多久（可不填）')} value={minutes} max={1440} onChange={setMinutes}/>}
    <button type="button" disabled={busy||!canFinish} onClick={()=>void finish()}>{done?ui('完成日期改为这天'):ui('这件事是在这天做完的')}</button>
    <small>{ui('完成日期和没有明细的用时都记在这天。')}{timed?ui('专注和填了起止的记录保留在实际发生的日期。'):''}</small></div>}
   {date>today&&done&&<p className="hint">{ui('已完成的事项只能把完成日期改到今天或以前。')}</p>}
  </>}
 </section>;
}
