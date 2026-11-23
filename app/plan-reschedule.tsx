import {useState} from 'react';
import {type State,type Task,type Command,businessDate,offsetDate,formatTime as fmt} from '../lib/model';
import {planningMetrics,planningSignature,remainingMinutes} from '../lib/task-plans';
import {t as ui,tr} from '../lib/i18n';
import './task-plans.css';

type Mutate=(c:Command,message?:string)=>Promise<boolean>;
const unfinished=(state:State,task:Task)=>planningMetrics(state,task).ledger.filter(p=>!p.closed&&p.left>0);
const reschedule=(task:Task,date:string,mutate:Mutate,message:string)=>mutate({type:'task.plan.reschedule',payload:{id:task.id,expected:planningSignature(task),date}},message);
const doneMessage=(count:number,date:string,total:number)=>count>1?tr('已合并到 {0}，共 {1}；已投入保留在原日期。',date,fmt(total)):tr('已改到 {0}；已投入保留在原日期。',date);

/** Editor control: change the date of a single unfinished segment, or merge several into one day. */
export function PlanReschedule({task,state,busy,mutate}:{task:Task;state:State;busy:boolean;mutate:Mutate}){
 const today=businessDate(state.settings),open=unfinished(state,task);
 const [date,setDate]=useState(()=>open.length===1&&open[0].date>=today?open[0].date:today);
 if(task.progress===100||!open.length)return null;
 const single=open.length===1,worked=open.some(p=>p.used>0),total=Math.min(Math.round(open.reduce((n,p)=>n+p.left,0)),remainingMinutes(task));
 const unchanged=single&&open[0].date===date,valid=!!date&&date>=today;
 return <section className="plan-reschedule" aria-label={single?ui('安排日期'):ui('合并到一天')}>
  <div className="fields cols-2"><label>{single?ui('安排日期'):ui('合并到一天')}<input type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}/></label>
   <div className="chips"><button type="button" onClick={()=>setDate(today)}>{ui('今天')}</button><button type="button" onClick={()=>setDate(offsetDate(today,1))}>{ui('明天')}</button></div></div>
  <p className="hint">{single?(worked?tr('已投入的部分留在原日期，只把剩余 {0} 改到这天。',fmt(total)):ui('只改这一段的日期，时长和开始时间不变。')):tr('把 {0} 段未做安排（共 {1}）合成一段放在这天；没有投入的旧分段会移除，已投入的留在原日期。',open.length,fmt(total))}</p>
  <button type="button" className="primary" disabled={busy||!valid||unchanged} onClick={()=>void reschedule(task,date,mutate,doneMessage(open.length,date,total))}>{single?ui('保存新日期'):ui('合并到这天')}</button>
 </section>;
}

/** One-step reschedule for an item in the "needs rescheduling" list. */
export function QuickReschedule({task,state,busy,mutate}:{task:Task;state:State;busy:boolean;mutate:Mutate}){
 const today=businessDate(state.settings),open=unfinished(state,task);
 if(task.progress===100||!open.length)return null;
 const total=Math.min(Math.round(open.reduce((n,p)=>n+p.left,0)),remainingMinutes(task));
 const go=(date:string)=>{if(date&&date>=today)void reschedule(task,date,mutate,doneMessage(open.length,date,total));};
 return <div className="quick-reschedule" role="group" aria-label={tr('改期：{0}',task.title)}>
  <span>{open.length>1?tr('{0} 段合并改到',open.length):ui('改到')}</span>
  <button type="button" disabled={busy} onClick={()=>go(today)}>{ui('今天')}</button>
  <button type="button" disabled={busy} onClick={()=>go(offsetDate(today,1))}>{ui('明天')}</button>
  <label>{ui('选日期')}<input type="date" min={today} disabled={busy} aria-label={tr('选日期：{0}',task.title)} onChange={e=>go(e.target.value)}/></label>
 </div>;
}
