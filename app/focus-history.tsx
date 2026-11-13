import {useEffect,useMemo,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {type State,formatTime,businessDate} from '../lib/model';
import {t as ui} from '../lib/i18n';
import './focus-history.css';

const PAGE_DAYS=7;
export default function FocusHistory({state}:{state:State}){
 const [page,setPage]=useState(0),[expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [currentMonth,setCurrentMonth]=useState(()=>businessDate(state.settings).slice(0,7)),[selectedMonth,setSelectedMonth]=useState('');
 useEffect(()=>{const update=()=>setCurrentMonth(businessDate(state.settings).slice(0,7));update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[state.settings.timezone,state.settings.dayStart]);
 const month=selectedMonth||currentMonth;
 const allDays=useMemo(()=>{
  const groups=new Map<string,State['sessions']>();
  for(const session of state.sessions){if(session.deletedAt)continue;const rows=groups.get(session.date)||[];rows.push(session);groups.set(session.date,rows);}
  return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([date,rows])=>({date,rows:rows.slice().sort((a,b)=>b.endedAt.localeCompare(a.endedAt)),seconds:rows.reduce((n,x)=>n+x.seconds,0),growth:rows.reduce((n,x)=>n+x.growth,0)}));
 },[state.sessions]);
 const months=[...new Set(allDays.map(d=>d.date.slice(0,7)))],days=allDays.filter(d=>d.date.startsWith(month+'-'));
 useEffect(()=>{setPage(0);setExpanded({});},[month]);
 const titles=useMemo(()=>new Map(state.tasks.map(t=>[t.id,t.title])),[state.tasks]);
 const pages=Math.max(1,Math.ceil(days.length/PAGE_DAYS)),current=Math.min(page,pages-1),visible=days.slice(current*PAGE_DAYS,(current+1)*PAGE_DAYS);
 return <section className="panel focus-history" aria-label={ui('专注记录')}>
  <header className="focus-history-heading"><div><h3>{ui('专注记录')}</h3><p>{ui('本月专注留在眼前，过往记录按月归档。')}</p></div><div className="focus-history-months"><button type="button" aria-pressed={month===currentMonth} onClick={()=>setSelectedMonth('')}>{ui('本月')}</button><select aria-label={ui('查看其他月份')} value={month===currentMonth?'':month} onChange={e=>setSelectedMonth(e.target.value)}><option value="">{ui('历史月份')}</option>{months.filter(m=>m!==currentMonth).map(m=><option key={m} value={m}>{m}{m>currentMonth?' · '+ui('未来日期'):''}</option>)}</select></div></header>
  <div className="focus-history-month-summary" aria-live="polite"><strong>{month}</strong><span>{days.reduce((n,d)=>n+d.rows.length,0)} {ui('条记录')} · {days.length} {ui('天')}</span><b>{formatTime(days.reduce((n,d)=>n+d.seconds,0)/60)}</b><small>{days.reduce((n,d)=>n+d.growth,0).toFixed(2)} {ui('潜在财富')}</small></div>
  {!days.length?<p className="focus-history-empty">{ui('这个月还没有专注记录，可从历史月份查看过往投入。')}</p>:<>
   <div className="focus-history-days">{visible.map(day=>{const open=expanded[day.date]??day.date===days[0]?.date;return <div className="focus-history-day" key={day.date}>
    <button className="focus-history-toggle" aria-expanded={open} aria-controls={'focus-day-'+day.date} onClick={()=>setExpanded(v=>({...v,[day.date]:!open}))}><ChevronDown size={17} className={open?'is-open':''}/><strong>{day.date}</strong><span>{day.rows.length} {ui('条记录')}</span><b>{formatTime(day.seconds/60)}</b><small>{day.growth.toFixed(2)} {ui('潜在财富')}</small></button>
    {open&&<div className="focus-history-entries" id={'focus-day-'+day.date} tabIndex={0} aria-label={day.date+' '+ui('专注记录')}>{day.rows.map(x=><div className="focus-history-entry" key={x.id}><div><span>{titles.get(x.taskId)||ui('已删除事项')}</span><small>{formatTime(x.seconds/60)}{x.source==='manual'?' · '+ui('手动记录'):''}</small></div><span className="focus-history-growth">{x.growth.toFixed(2)} <small>{ui('潜在财富')}</small></span></div>)}</div>}
   </div>;})}</div>
   {pages>1&&<nav className="focus-history-pages" aria-label={ui('专注记录分页')}><span>{ui('每页最多 7 个日期')}</span><div><button type="button" aria-label={ui('较近记录')} disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/>{ui('较近')}</button><span aria-live="polite">{current+1} / {pages}</span><button type="button" aria-label={ui('较早记录')} disabled={current===pages-1} onClick={()=>setPage(current+1)}>{ui('较早')}<ChevronRight size={16}/></button></div></nav>}
  </>}
 </section>;
}
