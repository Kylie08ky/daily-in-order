import {useEffect,useRef,useState} from 'react';
import {Plus,Sparkles,ListPlus,ArrowRight,Check,Undo2,X} from 'lucide-react';
import {t as ui,tr} from '../lib/i18n';
import {type State,type Command,type Task,type Project,businessDate} from '../lib/model';
import {parseList,duplicates,planTask,prepareQuickBatch,projectNameKey,INPUT_LIMIT,type PlanTask,type DraftProject,type DraftPlan,type ConversationTurn} from '../lib/quick-capture';
import {aiConfigured,organizeWithAI} from '../lib/ai-planner';
import DurationInput from './duration-input';
import './quick-capture.css';

type Row=PlanTask&{id:string;selected:boolean};
export default function QuickCapture({state,date,firstLogin,initialMode='ai',mutate,busy,error,onClose,onGoals,onForm,onExplore}:{state:State;date:string;firstLogin:boolean;initialMode?:'ai'|'list';mutate:(c:Command)=>Promise<boolean>;busy:boolean;error:string;onClose:()=>void;onGoals:()=>void;onForm:()=>void;onExplore:(view:'projects'|'tasks'|'timeline'|'feedback',id?:string,date?:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),locked=useRef(false),first=useRef(firstLogin);
 const [mode,setMode]=useState<'list'|'ai'>(initialMode),[step,setStep]=useState(0),[text,setText]=useState(''),[target,setTarget]=useState(date),[rows,setRows]=useState<Row[]>([]),[projects,setProjects]=useState<DraftProject[]>([]),[history,setHistory]=useState<ConversationTurn[]>([]),[notes,setNotes]=useState(''),[consent,setConsent]=useState(false),[localError,setLocalError]=useState(''),[working,setWorking]=useState(false),[revision,setRevision]=useState(''),[added,setAdded]=useState<{tasks:Task[];projects:Project[]}|null>(null),[savedIds,setSavedIds]=useState<{tasks:string[];projects:string[];linked:string[]}|null>(null),[undone,setUndone]=useState(false);
 const mounted=useRef(true),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{mounted.current=true;dialog.current?.showModal();return()=>{mounted.current=false;dialog.current?.close();};},[]);
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>{if(savedIds&&!added){const tasks=savedIds.tasks.map(id=>state.tasks.find(t=>t.id===id)),projects=savedIds.projects.map(id=>state.projects.find(p=>p.id===id));if(tasks.every(Boolean)&&projects.every(Boolean))setAdded(structuredClone({tasks:tasks as Task[],projects:projects as Project[]}));}},[savedIds,state,added]);
 const disabled=working||busy;
 const repeated=duplicates(rows,state);
 const update=(id:string,change:Partial<Row>)=>setRows(v=>v.map(t=>t.id===id?{...t,...change}:t));
 const install=(plan:DraftPlan)=>{const dup=duplicates(plan.tasks,state);setRows(plan.tasks.map((t,i)=>({...t,id:crypto.randomUUID(),selected:!dup[i]})));setProjects(plan.projects);setNotes(plan.notes);setStep(1);};
 const remember=(request:string,reply:string)=>setHistory(v=>[...v,{role:'user',text:request},{role:'assistant',text:reply}]);
 const matching=(p:DraftProject)=>state.projects.filter(x=>!x.deletedAt&&projectNameKey(x.name)===projectNameKey(p.name));
 const removeProject=(key:string)=>{setProjects(v=>v.filter(p=>p.key!==key));setRows(v=>v.map(t=>t.projectKey===key?{...t,projectKey:''}:t));};
 const run=async(action:()=>Promise<void>)=>{if(locked.current||busy)return;locked.current=true;setWorking(true);setLocalError('');try{await action();}catch(e){if(mounted.current)setLocalError(e instanceof Error&&e.name!=='ZodError'?ui(e.message):ui('请检查事项名称、日期、时间和时长的格式。'));}finally{locked.current=false;if(mounted.current)setWorking(false);}};
 const close=()=>void run(async()=>{if(first.current&&state.onboarding==='pending'){if(!await mutate({type:'life.onboarding',payload:{action:'skip'}}))return;}onClose();});
 const generate=()=>void run(async()=>{
  if(mode==='list'){install({tasks:parseList(text,target),projects:[],notes:''});return;}
  if(!consent)throw Error('请先确认将本次文字发送给 Google AI。');
  const plan=await organizeWithAI(text,target,[],[],businessDate(state.settings));if(mounted.current){install(plan);setHistory([]);remember(text,plan.notes);}
 });
 const revise=()=>void run(async()=>{
  const plan=await organizeWithAI(revision,target,rows.filter(t=>t.selected).map(t=>planTask.parse(t)),projects,businessDate(state.settings),history);
  if(mounted.current){install(plan);remember(revision,plan.notes);setRevision('');}
 });
 const save=()=>void run(async()=>{
  const selected=rows.filter(t=>t.selected);
  const batch=prepareQuickBatch(state,{tasks:selected,projects,notes:''});
  if(await mutate({type:'quick.add',payload:{...batch,firstLogin:first.current}})){setSavedIds({tasks:batch.items.map(t=>t.id),projects:batch.projects.map(p=>p.id),linked:[...new Set([...batch.projects.map(p=>p.id),...batch.items.map(t=>t.projectId).filter(Boolean)])]});setStep(2);}
 });
 const undo=()=>void run(async()=>{if(added&&await mutate({type:'quick.undo',payload:added}))setUndone(true);});
 const switchMode=(next:'list'|'ai')=>{setMode(next);setLocalError('');};
 return <dialog ref={dialog} className="modal quick-capture" aria-labelledby="quick-title" onCancel={e=>{e.preventDefault();if(!disabled)close();}}>
  <header className="quick-head"><div><span className="eyebrow">DAILY IN ORDER</span><h2 ref={heading} tabIndex={-1} id="quick-title">{ui(step===0?(mode==='ai'?(first.current?'AI 帮我开始':'AI 助手'):'今天，你想做些什么？'):step===1?'检查一下，再加入清单':undone?'已撤销本次添加':'清单准备好了')}</h2></div><button type="button" className="icon-btn" aria-label={ui('关闭')} disabled={disabled} onClick={close}><X size={20}/></button></header>
  <ol className="quick-steps" aria-label={ui('引导进度')}>{['写下想法','确认草稿','开始行动'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i<step?<Check size={13}/>:i+1}</span>{ui(label)}</li>)}</ol>
  <div className="quick-body"><fieldset disabled={disabled}>
   {step===0&&<>
    <p className="quick-lead">{ui(mode==='ai'?'说说你的目标和可用时间。AI 帮你创建项目、拆分任务并安排日程；确认一次即可保存，不用重复填表。':'不用先建项目或设置目标。写下要做的事，确认后就能开始。')}</p>
    <div className="quick-modes"><button type="button" aria-pressed={mode==='ai'} onClick={()=>switchMode('ai')}><Sparkles size={20}/><span><strong>{ui('AI 帮我整理')}</strong><small>{ui('描述想法，生成可编辑草稿')}</small></span></button><button type="button" aria-pressed={mode==='list'} onClick={()=>switchMode('list')}><ListPlus size={20}/><span><strong>{ui('自己写清单')}</strong><small>{ui('每行一项 · 支持粘贴 · 离线可用')}</small></span></button></div>
    {mode==='ai'&&<div className="quick-examples"><span>{ui('不知道怎么开始？试试这样说')}</span>{['帮我创建「学习摄影」项目，明晚 7 点练习构图 30 分钟，再加一项整理作品，时间先不定。','我想准备一次旅行，帮我拆成几个起步任务，暂时不安排时间。'].map(example=><button type="button" key={example} onClick={()=>setText(ui(example))}>{ui(example)}</button>)}<small>{ui('点击只填入示例，可以修改，不会直接发送。')}</small></div>}
    <label className="quick-date">{ui('默认安排日期')}<input type="date" value={target} onChange={e=>setTarget(e.target.value)}/><small>{ui('留空则放入任务池；每项还可以单独调整。')}</small></label>
    <label>{ui(mode==='list'?'写下或粘贴清单':'告诉 AI 你想做什么')}<textarea autoFocus rows={6} maxLength={INPUT_LIMIT} value={text} onChange={e=>setText(e.target.value)} placeholder={ui(mode==='list'?'整理资料\n阅读 20 页\n散步 | 18:00 | 30':'明天想读半小时书、准备演示文稿，晚上 7 点运动 45 分钟。帮我整理成清单。')}/></label>
    <div className="quick-hint"><span>{ui(mode==='list'?'每行一个事项。可选格式：事项 | 09:00 | 30（分钟）。不自动识别自然语言时间。':'只发送本次对话和草稿，不读取其他个人记录；同名项目在本机匹配。')}</span><small>{text.length} / {INPUT_LIMIT}</small></div>
    {mode==='ai'&&<div className="quick-ai-note"><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{ui('我同意将本次对话与草稿发送给 Google AI 处理。')}</span></label><small>{ui('本设备每个账号每天最多尝试 10 次（UTC）；服务的免费额度另有限制。失败请求也计入次数。')}</small><a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">{ui("Google AI 数据使用说明")}</a>{!aiConfigured&&<p role="status">{ui('AI 免费试用尚未配置，可以先使用清单录入。')}</p>}</div>}
   </>}
   {step===1&&<>
    <p className="quick-lead">{ui('这是尚未保存的草稿。确认后才会一起创建项目、任务和日程；只加入勾选的任务，时间可以留空。')}</p>
    {notes&&<p className="quick-model-note">{ui('AI 提醒：')}{notes}</p>}

    {projects.length>0&&<section className="quick-projects" aria-label={ui('项目草稿')}><h3>{ui('项目草稿')}</h3>{projects.map((p,i)=><article className="quick-project" key={p.key}><div className="quick-row-title"><label>{tr('项目 {0}',i+1)}<input maxLength={80} value={p.name} onChange={e=>setProjects(v=>v.map(x=>x.key===p.key?{...x,name:e.target.value}:x))}/></label><button type="button" className="icon-btn" aria-label={tr('移除项目草稿 {0}',p.name)} title={ui('移除项目，任务保留为独立事项')} onClick={()=>removeProject(p.key)}><X size={16}/></button></div><small className="quick-project-status">{ui(matching(p).length?'使用已有同名项目，不修改原项目。':'将创建新项目')}</small><details><summary>{ui('项目目标与日期')}</summary><label>{ui('项目目标')}<textarea rows={2} maxLength={4000} value={p.note} onChange={e=>setProjects(v=>v.map(x=>x.key===p.key?{...x,note:e.target.value}:x))}/></label><div className="quick-fields"><label>{ui('开始日期')}<input type="date" value={p.start} onChange={e=>setProjects(v=>v.map(x=>x.key===p.key?{...x,start:e.target.value}:x))}/></label><label>{ui('截止日期')}<input type="date" value={p.deadline} onChange={e=>setProjects(v=>v.map(x=>x.key===p.key?{...x,deadline:e.target.value}:x))}/></label></div>{matching(p).length>0&&<small>{ui('草稿中的目标与日期不会覆盖已有项目。')}</small>}</details></article>)}</section>}
    {history.length>0&&<details className="quick-conversation"><summary>{ui('查看本次对话')}</summary>{history.map((turn,i)=><p key={i}><strong>{ui(turn.role==='user'?'你':'AI 助手')}</strong><span>{turn.text||ui('草稿已更新，请检查下方内容。')}</span></p>)}</details>}
    <div className="quick-drafts">{rows.map((row,i)=><article className={'quick-row'+(!row.selected?' unselected':'')} key={row.id}>
     <div className="quick-row-title"><input type="checkbox" aria-label={tr('加入第 {0} 项',i+1)} checked={row.selected} onChange={e=>update(row.id,{selected:e.target.checked})}/><label><span>{tr('事项 {0}',i+1)}</span><input aria-label={tr('事项 {0}',i+1)} maxLength={200} value={row.title} onChange={e=>update(row.id,{title:e.target.value})}/></label></div>
     {projects.length>0&&<label className="quick-project-choice">{ui('所属项目')}<select value={row.projectKey||''} onChange={e=>update(row.id,{projectKey:e.target.value})}><option value="">{ui('独立事项')}</option>{projects.map(p=><option key={p.key} value={p.key}>{p.name}</option>)}</select></label>}
     {repeated[i]&&<small className="quick-duplicate">{ui('已有相同名称与安排，请修改或取消勾选。')}</small>}
     <div className="quick-fields"><label>{ui('日期（可不填）')}<input type="date" value={row.date} onChange={e=>update(row.id,{date:e.target.value})}/></label><label>{ui('开始时间（可不填）')}<input type="time" value={row.start} onChange={e=>update(row.id,{start:e.target.value})}/></label><DurationInput label={ui('预计时长')} value={row.minutes||null} max={1440} onChange={v=>update(row.id,{minutes:v??0})}/></div>
    </article>)}</div>
    {mode==='ai'&&<section className="quick-revision"><h3>{ui('继续对话')}</h3><label>{ui('要修改哪里？')}<textarea rows={2} maxLength={INPUT_LIMIT} value={revision} onChange={e=>setRevision(e.target.value)} placeholder={ui('例如：把阅读改到后天，运动改成 30 分钟。')}/></label><button type="button" disabled={!revision.trim()} onClick={revise}><Sparkles size={15}/>{ui('调整草稿')}</button><small>{ui('可以补充目标、回答问题或调整安排。发送本次对话与勾选的草稿，确认后才保存。')}</small></section>}
   </>}
   {step===2&&<div className="quick-success"><span className="quick-success-icon"><Check size={30}/></span><h3>{undone?ui('可以重新整理，再开始。'):tr('已创建 {0} 个项目，加入 {1} 项任务',savedIds?.projects.length||0,savedIds?.tasks.length||0)}</h3><p>{ui(undone?'撤销的事项保留在回收站。':'在今日清单中直接开始专注；有开始时间的事项会显示在时间轴。未安排日期的事项在任务池。')}</p>{!undone&&<div className="quick-next-actions">{!!savedIds?.linked.length&&<button type="button" onClick={()=>onExplore('projects',savedIds.linked[0])}>{ui('查看项目')}</button>}{added?.tasks.some(t=>t.date&&t.start)&&<button type="button" onClick={()=>onExplore('timeline',undefined,added.tasks.find(t=>t.date&&t.start)?.date)}>{ui('查看时间轴')}</button>}<button type="button" onClick={()=>onExplore('tasks')}>{ui('查看任务池')}</button></div>}{!undone&&<button type="button" disabled={!added} onClick={undo}><Undo2 size={16}/>{ui('撤销本次添加')}</button>}<p className="quick-success-tip">{ui('学习、阅读、作息和运动目标，可以以后在设置中按需开启。问题和建议也可以在设置 → 问题反馈告诉我们。')}</p><button type="button" onClick={()=>onExplore('feedback')}>{ui('打开问题反馈')}</button></div>}
  </fieldset>{(localError||error)&&<p className="quick-error" role="alert">{localError||error}</p>}{working&&<p role="status">{ui(mode==='ai'&&step!==2?'正在处理，请稍候…':'正在保存…')}</p>}</div>
  <footer className="quick-footer">
   {step===0?<><button type="button" disabled={disabled} onClick={close}>{ui(first.current?'先看看工作台':'取消')}</button><button type="button" className="quick-secondary" disabled={disabled} onClick={()=>void run(async()=>{if(first.current&&state.onboarding==='pending'&&!await mutate({type:'life.onboarding',payload:{action:'skip'}}))return;onForm();})}>{ui('完整事项表单')}</button><button type="button" className="primary" disabled={disabled||!text.trim()||(mode==='ai'&&(!consent||!aiConfigured))} onClick={generate}>{ui(mode==='ai'?'生成草稿':'预览清单')}<ArrowRight size={16}/></button></>:step===1?<><button type="button" disabled={disabled} onClick={()=>setStep(0)}>{ui('返回输入')}</button><button type="button" className="primary" disabled={disabled||(!rows.some(t=>t.selected)&&!projects.some(p=>!matching(p).length))} onClick={save}><Plus size={16}/>{projects.length?ui('确认创建项目与任务'):tr('确认加入 {0} 项',rows.filter(t=>t.selected).length)}</button></>:<><button type="button" disabled={disabled} onClick={onGoals}>{ui('选择模块与目标')}</button><button type="button" className="primary" disabled={disabled} onClick={onClose}>{ui('进入工作台')}<ArrowRight size={16}/></button></>}
  </footer>
 </dialog>;
}
