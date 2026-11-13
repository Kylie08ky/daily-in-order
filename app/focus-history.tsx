import {useMemo,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {type State,formatTime} from '../lib/model';
import {t as ui} from '../lib/i18n';
import './focus-history.css';

const PAGE_DAYS=7;
export default function FocusHistory({state}:{state:State}){
 const [page,setPage]=useState(0),[expanded,setExpanded]=useState<Record<string,boolean>>({});
 const days=useMemo(()=>{
  const groups=new Map<string,State['sessions']>();
  for(const session of state.sessions){if(session.deletedAt)continue;const rows=groups.get(session.date)||[];rows.push(session);groups.set(session.date,rows);}
  return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([date,rows])=>({date,rows:rows.slice().sort((a,b)=>b.endedAt.localeCompare(a.endedAt)),seconds:rows.reduce((n,x)=>n+x.seconds,0),growth:rows.reduce((n,x)=>n+x.growth,0)}));
 },[state.sessions]);
 const titles=useMemo(()=>new Map(state.tasks.map(t=>[t.id,t.title])),[state.tasks]);
 const pages=Math.max(1,Math.ceil(days.length/PAGE_DAYS)),current=Math.min(page,pages-1),visible=days.slice(current*PAGE_DAYS,(current+1)*PAGE_DAYS);
 return <section className="panel focus-history" aria-label={ui('专注记录')}>
  <header className="focus-history-heading"><div><h3>{ui('专注记录')}</h3><p>{ui('按日期收起，展开查看每段投入。')}</p></div><span>{days.reduce((n,d)=>n+d.rows.length,0)} {ui('条记录')} · {days.length} {ui('天')}</span></header>
  {!days.length?<p className="focus-history-empty">{ui('完成一段专注后，这里会留下记录。')}</p>:<>
   <div className="focus-history-days">{visible.map(day=>{const open=expanded[day.date]??day.date===days[0]?.date;return <div className="focus-history-day" key={day.date}>
    <button className="focus-history-toggle" aria-expanded={open} aria-controls={'focus-day-'+day.date} onClick={()=>setExpanded(v=>({...v,[day.date]:!open}))}><ChevronDown size={17} className={open?'is-open':''}/><strong>{day.date}</strong><span>{day.rows.length} {ui('条记录')}</span><b>{formatTime(day.seconds/60)}</b><small>{day.growth.toFixed(2)} {ui('潜在财富')}</small></button>
    {open&&<div className="focus-history-entries" id={'focus-day-'+day.date} tabIndex={0} aria-label={day.date+' '+ui('专注记录')}>{day.rows.map(x=><div className="focus-history-entry" key={x.id}><div><span>{titles.get(x.taskId)||ui('已删除事项')}</span><small>{formatTime(x.seconds/60)}{x.source==='manual'?' · '+ui('手动记录'):''}</small></div><span className="focus-history-growth">{x.growth.toFixed(2)} <small>{ui('潜在财富')}</small></span></div>)}</div>}
   </div>;})}</div>
   {pages>1&&<nav className="focus-history-pages" aria-label={ui('专注记录分页')}><span>{ui('每页最多 7 个日期')}</span><div><button type="button" aria-label={ui('较近记录')} disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/>{ui('较近')}</button><span aria-live="polite">{current+1} / {pages}</span><button type="button" aria-label={ui('较早记录')} disabled={current===pages-1} onClick={()=>setPage(current+1)}>{ui('较早')}<ChevronRight size={16}/></button></div></nav>}
  </>}
 </section>;
}
