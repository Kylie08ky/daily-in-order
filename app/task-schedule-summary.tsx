import {type State,type Task,clock,minuteOf,formatTime as fmt} from '../lib/model';
import {planningMetrics} from '../lib/task-plans';
import {t as ui} from '../lib/i18n';
import './task-plans.css';

export default function TaskScheduleSummary({task,state,busy,onAdjust}:{task:Task;state:State;busy:boolean;onAdjust:()=>void}){
 const metrics=planningMetrics(state,task),plans=metrics.ledger.filter(p=>!p.closed&&p.left>0).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 return <section className="task-editor-schedule" aria-label={ui('时间安排')}>
  <div className="task-editor-schedule-heading"><strong>{ui('时间安排')}</strong><button type="button" disabled={busy} onClick={onAdjust}>{ui('调整时间安排')}</button></div>
  <div className="task-editor-schedule-list">{plans.length?plans.map(p=><div className="task-editor-schedule-row" key={p.id}>
   <strong>{p.date}</strong><span>{!p.start||p.used>0?ui('灵活时间'):`${p.start}–${clock(Math.min(1440,minuteOf(p.start)+Math.ceil(p.left)))}`}</span><span>{fmt(p.left)}{p.needsReview&&` · ${ui('待核对')}`}</span>
  </div>):<p>{ui('暂无未做安排，可直接添加日期和时长。')}</p>}</div>
  <p className="hint">{ui('已投入')} {fmt(metrics.actual)} · {ui('剩余计划')} {fmt(metrics.remaining)} · {metrics.unallocated<0?ui('超出'):ui('待分配')} {fmt(Math.abs(metrics.unallocated))}</p>
  <small>{ui('这里只显示未做安排；已发生投入保留在原日期。')}</small>
 </section>;
}
