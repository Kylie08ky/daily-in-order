import {t as ui,tr,locale} from '../lib/i18n';
import {useEffect,useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import {GripVertical,Play,CalendarPlus} from 'lucide-react';
import {type State,type Task,type Command,minuteOf,clock,finished,formatTime as fmt} from '../lib/model';
import {localInstant} from '../lib/task-investment';
import {untimedTasks,timelineItems,layoutTimeline,type TimelineItem} from '../lib/timeline-items';
type Props={useResident?:(id:string,date:string,start:string)=>void;compact?:boolean;date:string;tasks:Task[];state:State;busy:boolean;mutate:(c:Command,message?:string)=>Promise<boolean>;edit:(t:Task,sessionId?:string)=>void;complete:(t:Task)=>void;arrange?:(t:Task)=>void;focus:(t:Task,planId?:string)=>void};
type Drag={item:TimelineItem;kind:'move'|'resize';originY:number;scrollTop:number;start:number;duration:number;next:number;moved:boolean};
const time=(n:number)=>clock(Math.min(1440,Math.max(0,Math.round(n))));
export default function Timeline({date,tasks,state,busy,mutate,edit,complete,focus,arrange,useResident,compact=false}:Props){
 const scrollRef=useRef<HTMLDivElement>(null),gridRef=useRef<HTMLDivElement>(null),dragRef=useRef<Drag|null>(null);
 const [drag,setDrag]=useState<{id:string;start:number;duration:number}|null>(null),[issue,setIssue]=useState('');
 const timed=layoutTimeline(timelineItems(state,date,tasks).map(t=>({...t,begin:drag?.id===t.id?drag.start:t.begin,length:drag?.id===t.id?drag.duration:t.length})));
 const flexible=untimedTasks(state,date,tasks);
 const scale=2;
 const first=Math.floor(Math.min(minuteOf(state.settings.dayStart),...timed.map(t=>t.begin))/60)*60,last=1440;
 useEffect(()=>{if(!compact||!scrollRef.current)return;const anchor=timelineItems(state,date,tasks)[0];scrollRef.current.scrollTop=anchor?Math.max(0,(anchor.begin-first-35)*scale):0;},[date,compact]);
 const save=async(item:TimelineItem,start:number,duration=item.length)=>{
  setIssue('');try{
   if(item.block){const b=item.block,span=state.sessions.find(x=>x.id===b.sessionId)?.spans?.[b.spanIndex];if(!span)return;
    const target=Date.parse(localInstant(date+'T'+time(start),state.settings.timezone));
    const shifted=new Date(Date.parse(span.startedAt)+target-Date.parse(b.startedAt)).toISOString();
    await mutate({type:'session.move',payload:{id:b.sessionId,spanIndex:b.spanIndex,startedAt:shifted}},ui("这段投入已移到新时间，统计已更新。"));
   }else if(item.planId)await mutate({type:'task.plan.save',payload:{id:item.task.id,planId:item.planId,date,start:time(start),minutes:Math.round(duration)}},ui('分段安排已保存。'));
   else await mutate({type:'task.schedule',payload:{id:item.task.id,date,start:time(start),minutes:Math.round(duration)}},ui("时间安排已更新。"));
  }catch(e){setIssue(e instanceof Error?e.message:'时间未保存。');}
 };
 const pointerStart=(e:PointerEvent<HTMLButtonElement>,item:TimelineItem,kind:'move'|'resize')=>{if(busy||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);dragRef.current={item,kind,originY:e.clientY,scrollTop:scrollRef.current?.scrollTop||0,start:item.begin,duration:item.length,next:kind==='move'?item.begin:item.length,moved:false};};
 const pointerMove=(e:PointerEvent<HTMLButtonElement>)=>{const d=dragRef.current;if(!d)return;
  const sc=scrollRef.current;if(compact&&sc){const rect=sc.getBoundingClientRect();if(e.clientY>rect.bottom-32)sc.scrollTop+=14;else if(e.clientY<rect.top+32)sc.scrollTop-=14;}
  const distance=e.clientY-d.originY+(sc?.scrollTop||0)-d.scrollTop,delta=Math.round(distance/scale/15)*15;if(Math.abs(distance)>3)d.moved=true;
  d.next=d.kind==='move'?Math.max(0,Math.min(1440-d.duration,d.start+delta)):Math.max(15,Math.min(1440-d.start,d.duration+delta));
  setDrag({id:d.item.id,start:d.kind==='move'?d.next:d.start,duration:d.kind==='resize'?d.next:d.duration});
 };
 const pointerEnd=(e:PointerEvent<HTMLButtonElement>)=>{const d=dragRef.current;if(!d)return;dragRef.current=null;setDrag(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(d.moved)void save(d.item,d.kind==='move'?d.next:d.start,d.kind==='resize'?d.next:d.duration);};
 const cancel=()=>{dragRef.current=null;setDrag(null);};
 return <div className={'timeline-shell unified-timeline'+(compact?' dashboard-clock':'')}>
  {flexible.length>0&&<details open className="timeline-flexible"><summary>{ui("灵活事项")} <span>{flexible.length}</span><small>{ui("不必填写开始时间")}</small></summary><div className="timeline-flexible-list">{flexible.map(t=><div key={t.id} className="timeline-flexible-row"><button className="flexible-title" onClick={()=>edit(t)}>{finished(t)?"✓ ":""}{t.title}</button><button disabled={busy} aria-label={ui("调整时间安排")+"："+t.title} title={ui("调整时间安排")} onClick={()=>(arrange||edit)(t)}><CalendarPlus size={16}/></button>{!finished(t)&&<button disabled={busy} aria-label={ui("开始专注：")+t.title} title={ui("开始专注")} onClick={()=>focus(t)}><Play size={16}/></button>}</div>)}</div></details>}
  <div className="timeline-intro"><small>{ui("拖动调整时间 · 点击事项查看进展")}</small></div>{issue&&<p role="alert">{ui(issue)}</p>}
  <div className={compact?'dashboard-time-scroll':undefined} ref={scrollRef} tabIndex={compact?0:undefined} role="region" aria-label={date+ui(" 全天时间轴")}>
   <div className="timeline" ref={gridRef} style={{height:(last-first)*scale+60}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const entry=state.templates.find(t=>t.id===e.dataTransfer.getData('text/template-id'));if(entry){const start=time(Math.max(first,Math.min(1425,Math.round((first+(e.clientY-gridRef.current!.getBoundingClientRect().top)/scale)/15)*15)));useResident?.(entry.id,date,start);return;}const id=e.dataTransfer.getData('text/task-id'),t=state.tasks.find(t=>t.id===id);if(!t)return;
    if(t.plans){const planId=e.dataTransfer.getData('text/plan-id'),p=t.plans.find(p=>p.id===planId);if(p){const start=Math.max(first,Math.min(1440-p.minutes,Math.round((first+(e.clientY-gridRef.current!.getBoundingClientRect().top)/scale)/15)*15));void mutate({type:'task.plan.save',payload:{id,planId,date,start:time(start),minutes:p.minutes}},ui('分段安排已保存。'));}else(arrange||edit)(t);return;}
    if(state.sessions.some(s=>!s.deletedAt&&s.taskId===id&&s.spans?.length)){edit(t);return;}
    const start=Math.max(first,Math.min(1440-Math.max(15,t.minutes),Math.round((first+(e.clientY-gridRef.current!.getBoundingClientRect().top)/scale)/15)*15));
    void mutate({type:'task.schedule',payload:{id,date,start:time(start),minutes:Math.max(15,t.minutes)}},ui("事项已放入时间轴。"));
   }}>
    {Array.from({length:(last-first)/60+1},(_,i)=><div key={i} className="hour-line" style={{top:i*60*scale}}><span>{time(first+i*60)}</span></div>)}
    {timed.map(item=>{const t=item.task,recorded=!!item.block;return <article key={item.id} title={t.title+' · '+time(item.begin)+'–'+time(item.begin+item.length)+(recorded?ui(" 实际投入"):ui(" 安排时间"))} className={'agenda-event'+(recorded?' recorded':'')+(finished(t)?' complete':'')+(item.length<25?' micro':'')+(drag?.id===item.id?' dragging':'')} style={{top:(item.begin-first)*scale,height:Math.max(3,item.length*scale-2),left:`calc(${item.lane/item.lanes*100}% + 4px)`,width:`calc(${100/item.lanes}% - 8px)`,'--task-color':state.projects.find(p=>p.id===t.projectId)?.color||'#a9bf94'} as CSSProperties}>
     <button className="agenda-event-time" disabled={busy} aria-label={ui("移动")+(recorded?ui("投入"):ui("安排"))+'：'+t.title+' '+time(item.begin)} onPointerDown={e=>pointerStart(e,item,'move')} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={cancel} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();void save(item,Math.max(0,Math.min(1440-item.length,item.begin+(e.key==='ArrowDown'?1:-1)*(e.shiftKey?60:15))));}}}><GripVertical size={13}/>{time(item.begin)}–{time(item.begin+item.length)}{<span className="recorded-label">{recorded?ui("实际"):ui("安排")}</span>}</button>
     <button className="agenda-event-title" onClick={()=>edit(t,item.block?.sessionId)} title={t.title}>{finished(t)?'✓ ':''}{t.title}</button>
     {item.length>=45&&<small>{recorded?ui("本段 ")+fmt(item.length):ui("预计 ")+fmt(item.length)} {ui("· 累计")}{fmt(t.actual||0)}</small>}
     {!finished(t)&&<button className="agenda-event-focus" title={ui("开始专注：自动记录实际起止")} aria-label={ui("开始专注：")+t.title} disabled={busy} onClick={()=>focus(t,item.planId)}><Play size={14}/></button>}
     {item.length>=75&&<button className="agenda-event-done" disabled={busy} onClick={()=>complete(t)}>{finished(t)?ui("撤销完成"):ui("标记完成")}</button>}
     {!recorded&&<button className="agenda-event-resize" disabled={busy} aria-label={ui("调整时长：")+t.title} onPointerDown={e=>pointerStart(e,item,'resize')} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={cancel} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();void save(item,item.begin,Math.max(15,Math.min(1440-item.begin,item.length+(e.key==='ArrowDown'?15:-15))));}}}/>}
    </article>;})}
   </div>
  </div>

 </div>;
}
