import {useEffect,useState} from 'react';
import {type Task,type State,type Command,businessDate,formatTime as fmt,offsetDate} from '../lib/model';
import {planningMetrics,planningSignature,rawPlans} from '../lib/task-plans';
import {recommendSlot} from '../lib/planning-workflow';
import {localParts} from '../lib/task-investment';
import {t as ui} from '../lib/i18n';
import DurationInput from './duration-input';
import './task-plans.css';
type Props={task:Task;state:State;busy:boolean;mutate:(c:Command,message?:string)=>Promise<boolean>;from?:string;to?:string;windowStart?:string;windowEnd?:string;initiallyEditing?:boolean;onEditingChange?:(editing:boolean)=>void};
type Draft={id:string;date:string;start:string;minutes:number};
export default function TaskPlanEditor({task,state,busy,mutate,from=businessDate(state.settings),to=offsetDate(from,6),windowStart='09:00',windowEnd='21:00',initiallyEditing=false,onEditingChange}:Props){
 const metrics=planningMetrics(state,task),today=businessDate(state.settings);
 const [editing,setEditing]=useState(false),[remaining,setRemaining]=useState<number|null>(null),[drafts,setDrafts]=useState<Draft[]>([]),[expected,setExpected]=useState(''),[error,setError]=useState('');
 const begin=()=>{setExpected(planningSignature(task));setRemaining(Math.round(metrics.remaining));setDrafts(metrics.ledger.filter(p=>!p.closed&&p.left>0).map(p=>({id:p.seconds>0?crypto.randomUUID():p.id,date:p.date,start:p.used?'':p.start,minutes:Math.ceil(p.left)})));setError('');setEditing(true);};
 useEffect(()=>{if(initiallyEditing&&task.progress!==100)begin();},[]);
 useEffect(()=>{onEditingChange?.(editing);},[editing,onEditingChange]);
 const total=drafts.reduce((n,p)=>n+p.minutes,0),excess=total-(remaining||0),changed=expected!==planningSignature(task),patch=(id:string,v:Partial<Draft>)=>setDrafts(list=>list.map(p=>p.id===id?{...p,...v}:p));
 const suggest=(p:Draft)=>{const copy=structuredClone(state),item=copy.tasks.find(x=>x.id===task.id)!;item.plans=drafts.filter(x=>x.id!==p.id);const slot=recommendSlot(copy,{...task,id:'suggestion-only'},from<today?today:from,to,p.minutes,windowStart,windowEnd,localParts(Date.now(),state.settings.timezone));if(slot){patch(p.id,{date:slot.date,start:slot.start});setError('');}else setError(ui('没有足够的连续空档，请调整时长、可安排时间或手动选择。'));};
 const add=()=>setDrafts(v=>[...v,{id:crypto.randomUUID(),date:from<today?today:from,start:'',minutes:Math.min(1440,Math.max(1,(remaining||0)-total))}]);
 return <section className="task-plans" aria-label={ui('分段安排')}>
 <div className="task-plans-summary">{[['已投入',metrics.actual],['剩余计划',metrics.remaining],['已安排剩余',metrics.scheduled],['待分配',metrics.unallocated],['当前预计总投入',metrics.total],['初始预计',metrics.initial]].map(([label,value])=><span key={label}>{ui(String(label))}<b>{fmt(Number(value))}</b></span>)}</div>
 {metrics.unallocated<0&&<p role="alert">{ui('未做分段超出剩余计划')} {fmt(-metrics.unallocated)}{ui('，请调整分段。')}</p>}
 {!editing?<><div className="row between wrap"><p className="hint">{ui('实际投入保留在原日期；这里只调整尚未完成的工作。')}</p><button className="primary" disabled={busy||task.progress===100} onClick={begin}>{ui('调整剩余计划')}</button></div>
 {metrics.review.length>0&&<p role="status">{ui('旧分段待核对：请确认未做部分要继续安排，还是结束安排；不会自动标记任务完成。')}</p>}
 <div className="task-plan-list">{metrics.ledger.filter(p=>!p.closed&&p.left>0).map(p=><div key={p.id} className="task-plan-row"><div><strong>{p.date}</strong><small>{p.used>0?ui('灵活时间'):p.start||ui('灵活时间')} · {ui('未做')} {fmt(p.left)}{p.used>0&&<> · {ui('本段已投入')} {fmt(p.used)}</>}{p.needsReview&&<> · {ui('待核对')}</>}</small></div><button disabled={busy} onClick={begin}>{ui('调整')}</button></div>)}</div>
 <details><summary>{ui('已结束安排（原投入保留）')} · {metrics.ledger.filter(p=>p.closed||p.left===0).length}</summary>{metrics.ledger.filter(p=>p.closed||p.left===0).map(p=><p key={p.id}>{p.date} · {ui('当时安排')} {fmt(p.minutes)} · {ui('关联实际投入')} {fmt(p.seconds/60)}</p>)}</details></>:<form onSubmit={async e=>{e.preventDefault();setError('');if(changed){setError(ui('记录已更新，请重新打开剩余计划后核对。'));return;}if(drafts.some(p=>p.date<today)){setError(ui('请将未做分段安排到今天或以后，或移除这段未做安排。'));return;}const ok=await mutate({type:'task.plan.reestimate',payload:{id:task.id,expected,remaining,plans:drafts}},ui('剩余计划已更新，原实际投入保持不变。'));if(ok)setEditing(false);else setError(ui('未保存成功，输入已保留，请查看错误提示后重试。'));}}>
 <DurationInput label={ui('剩余预计（替换全部剩余，不是追加）')} value={remaining} max={100000} onChange={setRemaining}/><p className="hint">{ui('这里填写从现在到完成还需要多久。保存时替换旧剩余估算；下方列表是完整的新安排，移除的只是未做计划。')}</p>
 <div className="row between wrap"><h4>{ui('未做分段')}</h4><button type="button" disabled={busy} onClick={()=>setDrafts([])}>{ui('替换全部未做安排')}</button></div>
 {drafts.map(p=><div className="reestimate-slot" key={p.id}><label>{ui('日期')}<input required type="date" value={p.date} onChange={e=>patch(p.id,{date:e.target.value})}/></label><label>{ui('开始时间（可不填）')}<input type="time" value={p.start} onChange={e=>patch(p.id,{start:e.target.value})}/></label><DurationInput label={ui('本段安排时长')} value={p.minutes} max={1440} onChange={n=>patch(p.id,{minutes:n??0})}/><div className="task-plan-actions"><button type="button" disabled={busy} onClick={()=>suggest(p)}>{ui('推荐时段')}</button><button type="button" disabled={busy} onClick={()=>setDrafts(v=>v.filter(x=>x.id!==p.id))}>{ui('移除未做安排')}</button></div></div>)}
 <button type="button" disabled={busy||total>=(remaining||0)} onClick={add}>{ui('＋ 添加一段安排')}</button>
 <div className="reestimate-confirm" role="status"><strong>{ui('确认新的剩余计划')} {fmt(remaining||0)}</strong><p>{ui('已投入')} {fmt(metrics.actual)} ＋ {ui('剩余计划')} {fmt(remaining||0)} ＝ {ui('当前预计总投入')} {fmt(metrics.actual+(remaining||0))}</p><p>{ui('已安排剩余')} {fmt(total)} · {excess>0?ui('超出'):ui('待分配')} {fmt(Math.abs((remaining||0)-total))}</p>{excess>0&&<p role="alert">{ui('请减少分段时长，或增加剩余预计；不会自动截断安排。')}</p>}</div>
 {error&&<p role="alert">{error}</p>}{changed&&<p role="alert">{ui('记录已更新，请重新打开剩余计划后核对。')}</p>}
 <div className="task-plan-actions"><button type="button" disabled={busy} onClick={()=>setEditing(false)}>{ui('取消')}</button><button className="primary" disabled={busy||remaining===null||excess>0||changed||drafts.some(p=>!p.date||!p.minutes)}>{busy?ui('保存中…'):ui('确认剩余计划与安排')}</button></div>
 </form>}</section>;
}
