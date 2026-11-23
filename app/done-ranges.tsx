import {Plus,X} from 'lucide-react';
import {formatTime as fmt} from '../lib/model';
import {t as ui,tr} from '../lib/i18n';

import {type DoneRange,rangesSummary} from '../lib/done-ranges';

/** "From – to" rows for the completion dialog; ＋ adds another range of the same day (e.g. morning and afternoon). */
export default function DoneRanges({ranges,onChange}:{ranges:DoneRange[];onChange:(next:DoneRange[])=>void}){
 const set=(i:number,key:keyof DoneRange,value:string)=>onChange(ranges.map((r,j)=>j===i?{...r,[key]:value}:r));
 const {minutes,problem}=rangesSummary(ranges),many=ranges.length>1;
 return <div className="done-ranges">
  <div className="done-range-head" aria-hidden="true"><span>{ui('开始')}</span><span/><span>{ui('结束')}</span></div>
  {ranges.map((r,i)=><div className="done-range" key={i} role="group" aria-label={many?tr('第 {0} 段',i+1):ui('实际时间段')}>
   <input type="time" required aria-label={ui('开始')} value={r.start} onChange={e=>set(i,'start',e.target.value)} autoFocus={i===ranges.length-1}/>
   <span className="done-range-dash">–</span>
   <input type="time" required aria-label={ui('结束')} value={r.end} onChange={e=>set(i,'end',e.target.value)}/>
   <span className="done-range-tools">
    {many&&<button type="button" className="icon-btn" aria-label={tr('删除第 {0} 段',i+1)} title={ui('删除这段')} onClick={()=>onChange(ranges.filter((_,j)=>j!==i))}><X size={16}/></button>}
    {i===ranges.length-1&&ranges.length<20&&<button type="button" className="icon-btn done-range-add" aria-label={ui('再加一段')} title={ui('再加一段')} onClick={()=>onChange([...ranges,{start:'',end:''}])}><Plus size={16}/></button>}
   </span>
  </div>)}
  {problem?<p className="inline-error" role="alert">{ui(problem)}</p>:many&&minutes>0&&<p className="hint done-range-total">{tr('{0} 段，共 {1}',ranges.length,fmt(minutes))}</p>}
 </div>;
}
