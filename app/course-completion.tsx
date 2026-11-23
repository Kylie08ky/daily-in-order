import {useRef,useState} from 'react';
import {type State,type Task,type Command,formatTime as fmt} from '../lib/model';
import {type Entry} from '../lib/life-schema';
import {germanTarget} from '../lib/learning-target';
import {completionEntry,completionSignature,defaultProgressScope} from '../lib/completion-progress';
import VideoProgressFields from './video-progress-fields';
import DurationInput from './duration-input';
import {t as ui,tr} from '../lib/i18n';
export default function CourseCompletion({state:s,task:t,date,today,planDay='',busy,mutate,close}:{state:State;task:Task;date:string;today:string;planDay?:string;busy:boolean;mutate:(c:Command,m?:string)=>Promise<boolean>;close:()=>void}){
 const [baseline]=useState(()=>completionSignature(s,t)),[scope,setScope]=useState(()=>defaultProgressScope(s,t)),[entries,setEntries]=useState<Record<string,Entry>>({}),[actual,setActual]=useState(t.actual),[day,setDay]=useState(planDay||(date>today?today:date)),[issue,setIssue]=useState('');
 const ids=useRef<Record<string,string>>({}),saving=useRef(false);
 ids.current[scope] ||= crypto.randomUUID();
 const entry=entries[scope]||completionEntry(s,t,scope,ids.current[scope]),course=germanTarget(s,t)!;
 const history=s.sessions.filter(x=>x.taskId===t.id&&!x.deletedAt);
 return <form onSubmit={async e=>{e.preventDefault();if(saving.current||busy)return;saving.current=true;setIssue('');try{const ok=await mutate({type:'task.complete.progress',payload:{id:t.id,expected:baseline,date:day,...(actual!==t.actual?{actual}:{}),...(entry?{entry}:{})}},ui('已完成，项目进度和统计已同步。'));if(ok)close();}catch(err){setIssue(err instanceof Error?ui(err.message):String(err));}finally{saving.current=false;}}}><fieldset disabled={busy}>
 <p>{t.title}</p><label>{ui('实际完成日期')}<input type="date" required value={day} max={today} onChange={e=>setDay(e.target.value)}/></label>{planDay&&<div className="chips"><button type="button" aria-pressed={day===planDay} onClick={()=>setDay(planDay)}>{tr('计划那天 {0}',planDay.slice(5))}</button><button type="button" aria-pressed={day===today} onClick={()=>setDay(today)}>{ui('今天')}</button></div>}
 <p className="hint">{ui('完成日期不移动已有投入；仅手填累计用时且没有投入明细时，此日期作为实际发生日期。')}</p>
 <label>{ui('关联哪一次投入')}<select value={scope} onChange={e=>setScope(e.target.value)}><option value="">{ui('原任务 / 历史记录')} · {fmt(t.actual||0)}</option>{history.map(x=><option key={x.id} value={x.id}>{x.date} · {fmt(x.seconds/60)} · {ui(x.source==='manual'?'手动记录':'专注记录')}{s.life.entries.some(e=>!e.deletedAt&&e.taskId===t.id&&e.sessionId===x.id)?' · '+ui('已有进度'):''}</option>)}</select></label>
 <p className="hint">{ui('只保存当前选择范围的进度，不复制到其他投入段。切换后请核对数量。')}</p>
 {entry&&<VideoProgressFields preserveEmpty state={s} entry={entry} course={course} patch={p=>setEntries(a=>({...a,[scope]:{...entry,...p}}))}/>}
 <p className="hint">{tr('已记录 {0}，直接确认不会重复计时；修改下方数值会替换累计用时。',fmt(t.actual||0))}</p>
 <DurationInput label={ui('修正任务累计实际用时')} value={actual} onChange={setActual}/>
 {actual!==t.actual&&<p role="status">{ui('这是修正累计用时，不是追加投入；原专注记录保留。')}</p>}
 {issue&&<p role="alert">{issue}</p>}<div className="form-footer"><button type="button" onClick={close}>{ui('取消')}</button><button className="primary" disabled={busy}>{ui('确认完成')}</button></div>
 </fieldset></form>;
}
