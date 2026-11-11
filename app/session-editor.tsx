import {t as ui,tr,locale} from '../lib/i18n';
import {useState} from 'react';
import {type State,type Command,formatTime as fmt} from '../lib/model';
import {localInstant,localParts} from '../lib/task-investment';
import DurationInput from './duration-input';
type Session=State['sessions'][number];
export default function SessionEditor({session,timezone,busy,mutate,close}:{session:Session;timezone:string;busy:boolean;mutate:(c:Command,message?:string)=>Promise<boolean>;close:()=>void}){
 const local=(value:string)=>{const p=localParts(Date.parse(value),timezone);return p.date+'T'+p.time;};
 const original=session.spans||[],unplaced=Math.max(0,session.seconds-original.reduce((n,b)=>n+(Date.parse(b.endedAt)-Date.parse(b.startedAt))/1000,0));
 const [unknownChanged,setUnknownChanged]=useState(false);
 const [spans,setSpans]=useState<Array<{start:string;end:string;original?:typeof original[number]}>>(original.map(b=>({start:local(b.startedAt),end:local(b.endedAt),original:b}))),[unknown,setUnknown]=useState<number|null>(Math.round(unplaced/60)),[date,setDate]=useState(session.date),[note,setNote]=useState(session.note||''),[issue,setIssue]=useState('');
 const change=(i:number,key:'start'|'end',value:string)=>setSpans(v=>v.map((b,j)=>j===i?{...b,[key]:value}:b));
 const save=async()=>{setIssue('');try{
  const times=spans.map(b=>({startedAt:b.original&&b.start===local(b.original.startedAt)?b.original.startedAt:localInstant(b.start,timezone),endedAt:b.original&&b.end===local(b.original.endedAt)?b.original.endedAt:localInstant(b.end,timezone)}));
  const ok=await mutate({type:'session.update',payload:{id:session.id,date,spans:times,untimedSeconds:!unknownChanged?unplaced:(unknown||0)*60,note}},ui("这段记录已修改，累计时长与统计已更新。"));if(ok)close();else setIssue('未能保存，请检查上方提示后重试。');
 }catch(e){setIssue(e instanceof Error?e.message:'未能保存。');}};
 return <div className="session-editor" role="group" aria-label={ui("修改这段投入")} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();void save();}}}><h4>{ui("修改这段投入 · 原记录")}{fmt(session.seconds/60)}</h4><p className="hint">{ui("这里只修改这一段。手动填写的任务百分比和整项完成状态会保留。")}</p>
  <fieldset disabled={busy}>{(!spans.length||unplaced>0)&&<label>{ui("记录日期")}<input aria-label={ui("修改记录日期")} type="date" value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label>}
  {spans.map((b,i)=><div className="session-span" key={i}><div className="fields cols-2"><label>{ui("开始")}<input aria-label={ui("第 ")+(i+1)+ui(" 段开始")} type="datetime-local" value={b.start} onInput={e=>change(i,'start',e.currentTarget.value)} onChange={e=>change(i,'start',e.target.value)}/></label><label>{ui("结束")}<input aria-label={ui("第 ")+(i+1)+ui(" 段结束")} type="datetime-local" value={b.end} onInput={e=>change(i,'end',e.currentTarget.value)} onChange={e=>change(i,'end',e.target.value)}/></label></div><button type="button" onClick={()=>setSpans(v=>v.filter((_,j)=>i!==j))}>{ui("移除这个时间段")}</button></div>)}
  <details open={original.length===0||unplaced>0}><summary>{ui("补填时间 / 其他用时")}</summary><button type="button" onClick={()=>{setSpans(v=>[...v,{start:date+'T09:00',end:date+'T09:30',original:undefined}]);if(!spans.length){setUnknown(0);setUnknownChanged(true);}}}>＋{spans.length?ui("添加另一段起止时间"):ui("补填具体起止时间")}</button>
  <DurationInput label={spans.length?ui("另外未记起止的用时"):ui("这段投入用时")} value={unknown} max={1440} onChange={v=>{setUnknown(v);setUnknownChanged(true);}}/></details>
  <label>{ui("记录备注")}<input aria-label={ui("修改记录备注")} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
  <p className="hint">{ui('修正原投入段，不追加新记录。')}{ui('原实际用时')} {fmt(session.seconds/60)} → {fmt(Math.max(0,(!unknownChanged?unplaced:(unknown||0)*60)/60+spans.reduce((n,b)=>{try{return n+(Date.parse(localInstant(b.end,timezone))-Date.parse(localInstant(b.start,timezone)))/60000;}catch{return n;}},0)))}</p>
  {issue&&<p role="alert" className="inline-error">{ui(issue)}</p>}<div className="session-actions"><button type="button" onClick={close}>{ui("取消修改")}</button><button type="button" className="primary" onClick={()=>void save()}>{ui("保存这段修改")}</button></div></fieldset>
 </div>;
}
