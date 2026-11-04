import {useEffect,useRef,useState} from 'react';
import {Plus,Sparkles,ListPlus,ArrowRight,Check,Undo2,X} from 'lucide-react';
import {t as ui,tr} from '../lib/i18n';
import {type State,type Command,type Task,assertTask,taskInput} from '../lib/model';
import {parseList,duplicates,draftItem,INPUT_LIMIT,type DraftItem} from '../lib/quick-capture';
import {aiConfigured,organizeWithAI} from '../lib/ai-planner';
import DurationInput from './duration-input';
import './quick-capture.css';

type Row=DraftItem&{id:string;selected:boolean};
export default function QuickCapture({state,date,firstLogin,mutate,busy,error,onClose,onGoals,onForm}:{state:State;date:string;firstLogin:boolean;mutate:(c:Command)=>Promise<boolean>;busy:boolean;error:string;onClose:()=>void;onGoals:()=>void;onForm:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),locked=useRef(false),first=useRef(firstLogin);
 const [mode,setMode]=useState<'list'|'ai'>('list'),[step,setStep]=useState(0),[text,setText]=useState(''),[target,setTarget]=useState(date),[rows,setRows]=useState<Row[]>([]),[notes,setNotes]=useState(''),[consent,setConsent]=useState(false),[localError,setLocalError]=useState(''),[working,setWorking]=useState(false),[revision,setRevision]=useState(''),[added,setAdded]=useState<Task[]>([]),[savedIds,setSavedIds]=useState<string[]>([]),[undone,setUndone]=useState(false);
 const mounted=useRef(true),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{mounted.current=true;dialog.current?.showModal();return()=>{mounted.current=false;dialog.current?.close();};},[]);
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>{if(savedIds.length&&!added.length){const tasks=savedIds.map(id=>state.tasks.find(t=>t.id===id));if(tasks.every(Boolean))setAdded(structuredClone(tasks as Task[]));}},[savedIds,state,added.length]);
 const disabled=working||busy;
 const repeated=duplicates(rows,state);
 const update=(id:string,change:Partial<Row>)=>setRows(v=>v.map(t=>t.id===id?{...t,...change}:t));
 const install=(items:DraftItem[])=>{const dup=duplicates(items,state);setRows(items.map((t,i)=>({...t,id:crypto.randomUUID(),selected:!dup[i]})));setStep(1);};
 const run=async(action:()=>Promise<void>)=>{if(locked.current||busy)return;locked.current=true;setWorking(true);setLocalError('');try{await action();}catch(e){if(mounted.current)setLocalError(e instanceof Error&&e.name!=='ZodError'?ui(e.message):ui('请检查事项名称、日期、时间和时长的格式。'));}finally{locked.current=false;if(mounted.current)setWorking(false);}};
 const close=()=>void run(async()=>{if(first.current&&state.onboarding==='pending'){if(!await mutate({type:'life.onboarding',payload:{action:'skip'}}))return;}onClose();});
 const generate=()=>void run(async()=>{
  if(mode==='list'){install(parseList(text,target));setNotes('');return;}
  if(!consent)throw Error('请先确认将本次文字发送给 Google AI。');
  const plan=await organizeWithAI(text,target);if(mounted.current){install(plan.tasks);setNotes(plan.notes);}
 });
 const revise=()=>void run(async()=>{
  const plan=await organizeWithAI(revision,target,rows.filter(t=>t.selected).map(({title,date,start,minutes})=>({title,date,start,minutes})));
  if(mounted.current){install(plan.tasks);setNotes(plan.notes);setRevision('');}
 });
 const save=()=>void run(async()=>{
  const selected=rows.filter(t=>t.selected);
  if(!selected.length)throw Error('请至少选择一项。');
  const items=selected.map(t=>{const value=draftItem.parse(t);assertTask(state,taskInput.parse(value));return {...value,id:t.id};});
  if(await mutate({type:'quick.add',payload:{items,firstLogin:first.current}})){setSavedIds(items.map(t=>t.id));setStep(2);}
 });
 const undo=()=>void run(async()=>{if(await mutate({type:'quick.undo',payload:added}))setUndone(true);});
 const switchMode=(next:'list'|'ai')=>{setMode(next);setLocalError('');};
 return <dialog ref={dialog} className="modal quick-capture" aria-labelledby="quick-title" onCancel={e=>{e.preventDefault();if(!disabled)close();}}>
  <header className="quick-head"><div><span className="eyebrow">DAILY IN ORDER</span><h2 ref={heading} tabIndex={-1} id="quick-title">{ui(step===0?'今天，你想做些什么？':step===1?'检查一下，再加入清单':undone?'已撤销本次添加':'清单准备好了')}</h2></div><button type="button" className="icon-btn" aria-label={ui('关闭')} disabled={disabled} onClick={close}><X size={20}/></button></header>
  <ol className="quick-steps" aria-label={ui('引导进度')}>{['写下想法','确认草稿','开始行动'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i<step?<Check size={13}/>:i+1}</span>{ui(label)}</li>)}</ol>
  <div className="quick-body"><fieldset disabled={disabled}>
   {step===0&&<>
    <p className="quick-lead">{ui('不用先建项目或设置目标。写下要做的事，确认后就能开始。')}</p>
    <div className="quick-modes"><button type="button" aria-pressed={mode==='list'} onClick={()=>switchMode('list')}><ListPlus size={20}/><span><strong>{ui('清单录入')}</strong><small>{ui('每行一项 · 支持粘贴 · 离线可用')}</small></span></button><button type="button" aria-pressed={mode==='ai'} onClick={()=>switchMode('ai')}><Sparkles size={20}/><span><strong>{ui('AI 帮我整理')}</strong><small>{ui('描述想法，生成可编辑草稿')}</small></span></button></div>
    <label className="quick-date">{ui('默认安排日期')}<input type="date" value={target} onChange={e=>setTarget(e.target.value)}/><small>{ui('留空则放入任务池；每项还可以单独调整。')}</small></label>
    <label>{ui(mode==='list'?'写下或粘贴清单':'告诉 AI 你想做什么')}<textarea autoFocus rows={6} maxLength={INPUT_LIMIT} value={text} onChange={e=>setText(e.target.value)} placeholder={ui(mode==='list'?'整理资料\n阅读 20 页\n散步 | 18:00 | 30':'明天想读半小时书、准备演示文稿，晚上 7 点运动 45 分钟。帮我整理成清单。')}/></label>
    <div className="quick-hint"><span>{ui(mode==='list'?'每行一个事项。可选格式：事项 | 09:00 | 30（分钟）。不自动识别自然语言时间。':'只发送本次输入和你修改中的草稿，不读取其他个人记录。')}</span><small>{text.length} / {INPUT_LIMIT}</small></div>
    {mode==='ai'&&<div className="quick-ai-note"><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{ui('我同意将本次文字与草稿发送给 Google AI 处理。')}</span></label><small>{ui('本设备每个账号每天最多尝试 10 次（UTC）；服务的免费额度另有限制。失败请求也计入次数。')}</small><a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">{ui("Google AI 数据使用说明")}</a>{!aiConfigured&&<p role="status">{ui('AI 免费试用尚未配置，可以先使用清单录入。')}</p>}</div>}
   </>}
   {step===1&&<>
    <p className="quick-lead">{ui('只加入勾选的事项。时间可以留空；填写开始时间时，需要预计时长。')}</p>
    {notes&&<p className="quick-model-note">{ui('AI 提醒：')}{notes}</p>}
    <div className="quick-drafts">{rows.map((row,i)=><article className={'quick-row'+(!row.selected?' unselected':'')} key={row.id}>
     <div className="quick-row-title"><input type="checkbox" aria-label={tr('加入第 {0} 项',i+1)} checked={row.selected} onChange={e=>update(row.id,{selected:e.target.checked})}/><label><span>{tr('事项 {0}',i+1)}</span><input aria-label={tr('事项 {0}',i+1)} maxLength={200} value={row.title} onChange={e=>update(row.id,{title:e.target.value})}/></label></div>
     {repeated[i]&&<small className="quick-duplicate">{ui('已有相同名称与安排，请修改或取消勾选。')}</small>}
     <div className="quick-fields"><label>{ui('日期（可不填）')}<input type="date" value={row.date} onChange={e=>update(row.id,{date:e.target.value})}/></label><label>{ui('开始时间（可不填）')}<input type="time" value={row.start} onChange={e=>update(row.id,{start:e.target.value})}/></label><DurationInput label={ui('预计时长')} value={row.minutes||null} max={1440} onChange={v=>update(row.id,{minutes:v??0})}/></div>
    </article>)}</div>
    {mode==='ai'&&<details className="quick-revision"><summary>{ui('让 AI 再调整一下')}</summary><label>{ui('要修改哪里？')}<textarea rows={2} maxLength={INPUT_LIMIT} value={revision} onChange={e=>setRevision(e.target.value)} placeholder={ui('例如：把阅读改到后天，运动改成 30 分钟。')}/></label><button type="button" disabled={!revision.trim()} onClick={revise}><Sparkles size={15}/>{ui('调整草稿')}</button><small>{ui('会发送本次修改和已勾选的草稿，生成后仍需你确认。')}</small></details>}
   </>}
   {step===2&&<div className="quick-success"><span className="quick-success-icon"><Check size={30}/></span><h3>{undone?ui('可以重新整理，再开始。'):tr('已加入 {0} 项',savedIds.length)}</h3><p>{ui(undone?'撤销的事项保留在回收站。':'在今日清单中直接开始专注；有开始时间的事项会显示在时间轴。未安排日期的事项在任务池。')}</p>{!undone&&<button type="button" disabled={!added.length} onClick={undo}><Undo2 size={16}/>{ui('撤销本次添加')}</button>}<p className="quick-success-tip">{ui('学习、阅读、作息和运动目标，可以以后在设置中按需开启。问题和建议也可以在设置 → 问题反馈告诉我们。')}</p></div>}
  </fieldset>{(localError||error)&&<p className="quick-error" role="alert">{localError||error}</p>}{working&&<p role="status">{ui(mode==='ai'&&step!==2?'正在处理，请稍候…':'正在保存…')}</p>}</div>
  <footer className="quick-footer">
   {step===0?<><button type="button" disabled={disabled} onClick={close}>{ui(first.current?'先看看工作台':'取消')}</button><button type="button" className="quick-secondary" disabled={disabled} onClick={()=>void run(async()=>{if(first.current&&state.onboarding==='pending'&&!await mutate({type:'life.onboarding',payload:{action:'skip'}}))return;onForm();})}>{ui('完整事项表单')}</button><button type="button" className="primary" disabled={disabled||!text.trim()||(mode==='ai'&&(!consent||!aiConfigured))} onClick={generate}>{ui(mode==='ai'?'生成草稿':'预览清单')}<ArrowRight size={16}/></button></>:step===1?<><button type="button" disabled={disabled} onClick={()=>setStep(0)}>{ui('返回输入')}</button><button type="button" className="primary" disabled={disabled||!rows.some(t=>t.selected)} onClick={save}><Plus size={16}/>{tr('确认加入 {0} 项',rows.filter(t=>t.selected).length)}</button></>:<><button type="button" disabled={disabled} onClick={onGoals}>{ui('选择模块与目标')}</button><button type="button" className="primary" disabled={disabled} onClick={onClose}>{ui('进入工作台')}<ArrowRight size={16}/></button></>}
  </footer>
 </dialog>;
}
