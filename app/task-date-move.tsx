import {useState} from 'react';
import {type State,type Task,type Command,businessDate,offsetDate,formatTime as fmt} from '../lib/model';
import {planningMetrics,planningSignature,remainingMinutes} from '../lib/task-plans';
import {completionDate,datesSignature} from '../lib/task-completion';
import {t as ui,tr} from '../lib/i18n';
import DurationInput from './duration-input';
import './task-plans.css';

type Mutate=(c:Command,message?:string)=>Promise<boolean>;
const md=(d:string)=>d.slice(5);

/**
 * One place to answer "which day is this on?" at the top of Edit task. The user first picks what they mean:
 * – "Change planned date" (unfinished tasks, today or later): moves only the unfinished part (single segment or merged);
 * – "Record completion" (today or earlier): sets the completion date and the date of any untimed total together.
 * Saves immediately, so it is disabled while the form has unsaved edits (a later form save must not revert it).
 */
export default function TaskDateMove({task,state,busy,mutate,dirty,onDone}:{task:Task;state:State;busy:boolean;mutate:Mutate;dirty:boolean;onDone:()=>void}){
 const today=businessDate(state.settings),done=task.progress===100,doneOn=done?completionDate(task,state.settings.timezone):'';
 const open=planningMetrics(state,task).ledger.filter(p=>!p.closed&&p.left>0).sort((a,b)=>a.date.localeCompare(b.date));
 const invested=(task.actual||0)>0||state.sessions.some(x=>x.taskId===task.id&&!x.deletedAt);
 const timed=state.sessions.some(x=>x.taskId===task.id&&!x.deletedAt);
 const simple=!task.plans&&!invested,total=Math.min(Math.round(open.reduce((n,p)=>n+p.left,0)),remainingMinutes(task));
 const canPlan=!done&&(simple||open.length>0),planned=open[0]?.date||task.date||'';
 const [mode,setMode]=useState<'plan'|'done'>(canPlan?'plan':'done');
 const [date,setDate]=useState(()=>mode==='done'?doneOn||today:planned&&planned>=today?planned:today);
 const [minutes,setMinutes]=useState<number|null>(null);
 const pick=(next:'plan'|'done')=>{setMode(next);setDate(d=>next==='plan'?(d<today?today:d):(d>today?today:d));};
 const unchanged=mode==='plan'?(open.length<=1&&planned===date):(done&&doneOn===date);
 const valid=!!date&&(mode==='plan'?date>=today:date<=today);
 const move=async()=>{
  const ok=simple?await mutate({type:'task.schedule',payload:{id:task.id,date,start:task.start}},tr('已改到 {0}。',date))
   :await mutate({type:'task.plan.reschedule',payload:{id:task.id,expected:planningSignature(task),date}},open.length>1?tr('已合并到 {0}，共 {1}；已投入保留在原日期。',date,fmt(total)):tr('已改到 {0}；已投入保留在原日期。',date));
  if(ok)onDone();
 };
 const finish=async()=>{
  const ok=await mutate({type:'task.finish.on',payload:{id:task.id,expected:datesSignature(task),date,...(!done&&!invested&&minutes!==null?{actual:minutes}:{})}},done?tr('完成日期已改为 {0}。',date):tr('已记为 {0} 完成。',date));
  if(ok)onDone();
 };
 const chips:[string,string][]=mode==='plan'?[[ui('今天'),today],[ui('明天'),offsetDate(today,1)],[ui('后天'),offsetDate(today,2)]]:[[ui('今天'),today],[ui('昨天'),offsetDate(today,-1)],[ui('前天'),offsetDate(today,-2)]];
 const status=done?tr('已于 {0} 完成',md(doneOn)):planned?(open.length>1?tr('计划 {0} 起，共 {1} 段',md(planned),open.length):tr('计划 {0}',md(planned))):ui('还没安排日期');
 const label=unchanged?ui('已在这天'):mode==='plan'?(open.length>1?tr('合并到 {0}',md(date)):tr('改到 {0}',md(date))):done?tr('完成日期改为 {0}',md(date)):tr('记为 {0} 完成',md(date));
 const hint=mode==='plan'?(simple?ui('只改计划日期。'):tr('只移动未做的 {0}；已投入留在原日期。',fmt(total))):ui('完成日期和没有明细的用时都记在这天。')+(timed?ui('专注和填了起止的记录保留在实际发生的日期。'):'');
 return <section className="task-date-move" aria-label={ui('日期')}>
  <div className="tdm-head"><strong>{ui('日期')}</strong><span className="tdm-status">{status}</span></div>
  {canPlan&&<div className="tdm-modes" role="group" aria-label={ui('要做什么')}>
   <button type="button" aria-pressed={mode==='plan'} onClick={()=>pick('plan')}>{ui('改计划日期')}</button>
   <button type="button" aria-pressed={mode==='done'} onClick={()=>pick('done')}>{ui('补记完成')}</button></div>}
  <div className="tdm-pick">
   {chips.map(([name,day])=><button key={day} type="button" aria-pressed={date===day} onClick={()=>setDate(day)}>{name}</button>)}
   <input type="date" aria-label={mode==='plan'?ui('计划日期'):ui('完成日期')} value={date} min={mode==='plan'?today:undefined} max={mode==='done'?today:undefined} onChange={e=>setDate(e.target.value)}/>
  </div>
  {mode==='done'&&!done&&!invested&&<div className="tdm-duration"><DurationInput label={ui('用了多久（可不填）')} value={minutes} max={1440} onChange={setMinutes}/></div>}
  {dirty?<p className="tdm-hint">{ui('请先保存或放弃下面的修改，再改日期。')}</p>:<div className="tdm-action">
   <button type="button" className="primary" disabled={busy||!valid||unchanged} onClick={()=>void(mode==='plan'?move():finish())}>{label}</button>
   <small className="tdm-hint">{hint}</small></div>}
 </section>;
}
