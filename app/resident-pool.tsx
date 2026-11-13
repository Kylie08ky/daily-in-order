import {useState,type ReactNode} from 'react';
import {CalendarPlus,MoreHorizontal,GripVertical,Plus,RotateCcw} from 'lucide-react';
import {type State,type Task,type TaskInput,type Command,businessDate,formatTime as fmt,liveProjects} from '../lib/model';
import {residentKind,residentStatus,residentAvailable,residentOccurrence,type Resident,type ResidentKind} from '../lib/resident-tasks';
import {LearningChoice} from './learning-reassign';
import DurationInput from './duration-input';
import {t as ui} from '../lib/i18n';
import './resident-pool.css';
type Mutation=(c:Command,message?:string)=>Promise<boolean>;
const kindLabel=(kind:ResidentKind)=>kind==='long-term'?'长期常驻':'阶段性常驻';
type PoolProps={state:State;busy:boolean;mode:'calendar'|'manage';loose:Task[];row:(t:Task)=>ReactNode;use:(t:Resident,date:string)=>void;edit:(t:Resident)=>void;mutate:Mutation};
export default function ResidentPool({state:s,busy,mode,loose,row,use,edit,mutate}:PoolProps){
 const [project,setProject]=useState('all'),[module,setModule]=useState('all'),[showInactive,setShowInactive]=useState(false);
 const [active,setActive]=useState<ResidentKind|'once'|'all'>('all');
 const matches=(t:TaskInput)=>(project==='all'||t.projectId===project)&&(module==='all'||t.moduleId===module);
 const entries=s.templates.filter(t=>matches(t.task)),today=businessDate(s.settings);
 const available=(kind:ResidentKind)=>entries.filter(t=>residentKind(t)===kind&&residentAvailable(s,t));
 const pending=(kind:ResidentKind)=>loose.filter(t=>matches(t)&&t.sourceTemplateId&&residentKind(s.templates.find(e=>e.id===t.sourceTemplateId))===kind);
 const oneOff=loose.filter(t=>matches(t)&&!t.sourceTemplateId),inactive=entries.filter(t=>!residentAvailable(s,t));
 const card=(t:Resident)=>{
  const status=residentStatus(t),enabled=residentAvailable(s,t),projectName=s.projects.find(p=>p.id===t.task.projectId)?.name||ui('独立事项'),moduleName=s.modules.find(m=>m.id===t.task.moduleId)?.name;
  return <article key={t.id} className="resident-card" draggable={!busy&&enabled} onDragStart={e=>{e.dataTransfer.setData('text/template-id',t.id);e.dataTransfer.effectAllowed='copy';}}>
   <GripVertical size={14} className="resident-grip" aria-hidden="true"/>
   <div className="resident-content">
    <div className="resident-title"><strong title={t.task.title}>{t.task.title}</strong><button className="resident-icon" title={ui('编辑常驻入口')} aria-label={ui('编辑常驻入口')+'：'+t.task.title} onClick={()=>edit(t)}><MoreHorizontal size={16}/></button></div>
    <div className="resident-meta"><span title={[projectName,moduleName].filter(Boolean).join(' · ')}>{projectName}{moduleName?' · '+moduleName:''}</span><span className="resident-duration">{fmt(t.task.minutes)}</span>{!enabled&&<span className="resident-status">{ui(status==='paused'?'已暂停':status==='archived'?'已归档':'项目已结束')}</span>}</div>
    <div className="resident-bottom"><div className="resident-quick-actions">
     {enabled?<><button className="resident-icon resident-add" disabled={busy} title={ui('加入今天')} aria-label={ui('加入今天')+'：'+t.task.title} onClick={()=>use(t,today)}><Plus size={16}/></button><button className="resident-icon" disabled={busy} title={ui('选择日期')} aria-label={ui('选择日期')+'：'+t.task.title} onClick={()=>use(t,'')}><CalendarPlus size={16}/></button></>:status!=='active'&&<button className="resident-icon" disabled={busy} title={ui('恢复入口')} aria-label={ui('恢复入口')+'：'+t.task.title} onClick={()=>void mutate({type:'template.status',payload:{id:t.id,status:'active'}},ui('入口已恢复。'))}><RotateCcw size={16}/></button>}
    </div></div>
   </div>
  </article>;
 };
 const groupContent=(kind:ResidentKind)=><>{available(kind).map(card)}{mode==='calendar'&&pending(kind).map(t=><div key={t.id} className="resident-pending"><small>{ui('已有执行待安排')}</small>{row(t)}</div>)}{!available(kind).length&&!(mode==='calendar'&&pending(kind).length)&&<p className="resident-empty">{ui('暂无可选入口')}</p>}</>;
 return <div className={'resident-pool resident-pool--'+mode}>
  <div className="resident-filters"><select aria-label={ui('按项目筛选')} value={project} onChange={e=>{setProject(e.target.value);setModule('all');}}><option value="all">{ui('全部项目')}</option><option value="">{ui('独立事项')}</option>{liveProjects(s).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select aria-label={ui('按模块筛选')} value={module} onChange={e=>setModule(e.target.value)}><option value="all">{ui('全部模块')}</option><option value="">{ui('未分模块')}</option>{s.modules.filter(m=>project==='all'||m.projectId===project).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
  {mode==='calendar'&&<div className="resident-tabs" aria-label={ui('任务类型')}>{(['all','long-term','stage','once'] as const).map(kind=><button key={kind} aria-pressed={active===kind&&!showInactive} onClick={()=>{setActive(kind);setShowInactive(false);}} title={ui(kind==='all'?'全部':kind==='once'?'一次性任务':kindLabel(kind))}><span>{ui(kind==='all'?'全部':kind==='long-term'?'长期':kind==='stage'?'阶段':'一次性')}</span><small>{kind==='all'?oneOff.length+available('long-term').length+pending('long-term').length+available('stage').length+pending('stage').length:kind==='once'?oneOff.length:available(kind).length+pending(kind).length}</small></button>)}</div>}
  <div className="resident-list">
   {showInactive?<>{inactive.map(card)}{!inactive.length&&<p className="resident-empty">{ui('暂无可选入口')}</p>}</>:mode==='calendar'?<>{active==='all'?<>{(['long-term','stage'] as const).filter(kind=>available(kind).length+pending(kind).length>0).map(kind=><details open key={kind} className="resident-group"><summary>{ui(kindLabel(kind))}<span>{available(kind).length+pending(kind).length}</span></summary>{groupContent(kind)}</details>)}{oneOff.length>0&&<details open className="resident-group"><summary>{ui('一次性任务')}<span>{oneOff.length}</span></summary>{oneOff.map(row)}</details>}{!oneOff.length&&!entries.some(t=>residentAvailable(s,t))&&!pending('long-term').length&&!pending('stage').length&&<p className="resident-empty">{ui('这里暂时没有事项。')}</p>}</>:active==='once'?oneOff.length?oneOff.map(row):<p className="resident-empty">{ui('这里暂时没有事项。')}</p>:groupContent(active)}</>:(['long-term','stage'] as const).map(kind=><details open key={kind} className="resident-group"><summary>{ui(kind==='long-term'?'常驻任务模板':kindLabel(kind))}<span>{available(kind).length}</span></summary>{groupContent(kind)}</details>)}
  </div>
  <div className="resident-footer"><button className="text-btn" aria-expanded={showInactive} onClick={()=>setShowInactive(!showInactive)}>{ui(showInactive?'返回可用入口':'暂停与归档入口')}<span>{inactive.length||''}</span></button>{!showInactive&&(mode!=='calendar'||active!=='once')&&<span className="resident-key" title={ui('常驻仅在选用时生成任务，不自动重复排期。')}>＋ {ui('加入今天')}</span>}</div>
 </div>;
}
export function ResidentEditor({state:s,entry,task,sourceTaskId,kind='long-term',busy,mutate,close}:{state:State;entry?:Resident;task:TaskInput;sourceTaskId?:string;kind?:ResidentKind;busy:boolean;mutate:Mutation;close:()=>void}){
 const [draft,setDraft]=useState({...task}),[type,setType]=useState(entry?residentKind(entry):kind),[id]=useState(entry?.id||sourceTaskId||crypto.randomUUID());
 const set=(key:keyof TaskInput,value:unknown)=>setDraft(t=>({...t,[key]:value}));
 return <form className="resident-editor" onSubmit={async e=>{e.preventDefault();if(await mutate({type:'template.save',payload:{id,task:draft,kind:type,...(sourceTaskId?{sourceTaskId}:{})}},ui('常驻入口已保存，历史执行记录保持不变。')))close();}}><fieldset disabled={busy}>
 <label>{ui('入口名称')}<input required maxLength={200} value={draft.title} onChange={e=>set('title',e.target.value)}/></label><label>{ui('任务类型')}<select value={type} onChange={e=>setType(e.target.value as ResidentKind)}><option value="long-term">{ui('长期常驻')}</option><option value="stage">{ui('阶段性常驻')}</option></select></label>
 <DurationInput label={ui('默认本次预计时长')} value={draft.minutes} max={1440} onChange={n=>set('minutes',n??0)}/>
 <div className="fields cols-2"><label>{ui('所属项目')}<select value={draft.projectId} onChange={e=>setDraft(t=>({...t,projectId:e.target.value,moduleId:''}))}><option value="">{ui('独立事项')}</option>{liveProjects(s).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>{ui('模块')}<select value={draft.moduleId} onChange={e=>set('moduleId',e.target.value)}><option value="">{ui('未分模块')}</option>{s.modules.filter(m=>m.projectId===draft.projectId).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
 {(!draft.activity||draft.activity.kind==='german')&&<LearningChoice state={s} value={draft.activity?.refId||''} onChange={id=>{const c=s.life.courses.find(c=>c.id===id);set('activity',c?{kind:'german',refId:c.id,category:c.category}:null);}}/>}
 <label>{ui('备注')}<textarea maxLength={4000} rows={3} value={draft.note} onChange={e=>set('note',e.target.value)}/></label><p className="hint">{ui('只保存入口，不自动排期；已有任务、实际投入与课程数量保持不变。')}</p>
 {entry&&<div className="resident-actions"><button type="button" onClick={async()=>{if(await mutate({type:'template.status',payload:{id:entry.id,status:residentStatus(entry)==='paused'?'active':'paused'}},ui('入口状态已更新，历史记录保留。')))close();}}>{ui(residentStatus(entry)==='paused'?'恢复入口':'暂停入口')}</button><button type="button" onClick={async()=>{if(await mutate({type:'template.status',payload:{id:entry.id,status:residentStatus(entry)==='archived'?'active':'archived'}},ui('入口状态已更新，历史记录保留。')))close();}}>{ui(residentStatus(entry)==='archived'?'恢复入口':'归档入口')}</button></div>}
 <div className="form-footer"><button type="button" onClick={close}>{ui('取消')}</button><button className="primary">{ui('保存入口')}</button></div></fieldset></form>;
}
export function ResidentUse({state:s,entry,date:initialDate,start:initialStart='',busy,mutate,close,view}:{state:State;entry:Resident;date:string;start?:string;busy:boolean;mutate:Mutation;close:()=>void;view:(t:Task)=>void}){
 const [date,setDate]=useState(initialDate||businessDate(s.settings)),[start,setStart]=useState(initialStart),[minutes,setMinutes]=useState<number|null>(entry.task.minutes),[id]=useState(crypto.randomUUID());
 const existing=residentOccurrence(s,entry,date);
 return <form onSubmit={async e=>{e.preventDefault();if(existing){view(existing);close();return;}if(await mutate({type:'template.use',payload:{id:entry.id,newId:id,date,start,minutes:minutes??0}},ui('已生成本次独立事项，模板保留。')))close();}}><fieldset disabled={busy}><h3>{entry.task.title}</h3><div className="fields cols-2"><label>{ui('安排日期')}<input required type="date" value={date} onInput={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label><label>{ui('开始时间（可不填）')}<input type="time" value={start} onInput={e=>setStart(e.currentTarget.value)} onChange={e=>setStart(e.target.value)}/></label></div><DurationInput label={ui('本次预计时长')} value={minutes} max={1440} onChange={setMinutes}/>{existing?<p role="status">{ui('当天已有此入口的任务，请查看或继续原任务。')}</p>:<p className="hint">{ui('本次执行独立记录，入口继续保留；数量进度另行记录。')}</p>}<div className="form-footer"><button type="button" onClick={close}>{ui('取消')}</button><button className="primary" disabled={!date}>{ui(existing?'查看 / 继续原任务':'确认加入')}</button></div></fieldset></form>;
}
