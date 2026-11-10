import {t as ui,tr,locale} from '../lib/i18n';
'use client';

import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { Pause, Play, TrendingUp, Timer, X, Maximize2, Minimize2, Check } from 'lucide-react';
import type { Command, State, Task } from '../lib/model';
import {createPortal} from 'react-dom';
import DurationInput from './duration-input';
import {localParts} from '../lib/task-investment';
import { focusSeconds, potentialWealth } from '../lib/focus-clock';

function RollingNumber({ value }: { value: string }) {
  return <span className="wealth-digits" aria-hidden="true">{value.split('').map((digit, i) =>
    digit === '.' ? <span className="wealth-point" key={value.length - i}>.</span> :
    <span className="wealth-digit" key={value.length - i}><span className="wealth-reel" style={{ '--digit': Number(digit) } as CSSProperties}>{Array.from({ length: 10 }, (_, n) => <span key={n}>{n}</span>)}</span></span>
  )}</span>;
}

export function FocusSetup({task,defaultMinutes,busy,start,close,error}:{error:string;task:Task;defaultMinutes:number;busy:boolean;start:(mode:'countdown'|'countup',minutes:number)=>Promise<void>;close:()=>void}){
 const [mode,setMode]=useState<'countdown'|'countup'>('countdown');
 const [minutes,setMinutes]=useState<number|null>(task.minutes>(task.actual||0)?Math.min(defaultMinutes,task.minutes-(task.actual||0)):defaultMinutes);
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
 return createPortal(<dialog ref={ref} className="modal focus-setup" aria-label={ui("开始一段专注")} onCancel={e=>{e.preventDefault();close();}}><header><h2>{ui("开始一段专注")}</h2><button className="icon-btn" aria-label={ui("关闭专注设置")} onClick={close}><X/></button></header><form onSubmit={e=>{e.preventDefault();if(mode==='countup'||minutes&&minutes>=1)void start(mode,minutes||defaultMinutes);}}><p className="focus-task-name">{task.title}</p><div className="focus-mode-choices"><button type="button" aria-pressed={mode==='countdown'} onClick={()=>setMode('countdown')}><Timer/><strong>{ui("倒计时")}</strong><small>{ui("到点自动停止")}</small></button><button type="button" aria-pressed={mode==='countup'} onClick={()=>setMode('countup')}><Play/><strong>{ui("正向计时")}</strong><small>{ui("按自己的节奏结束")}</small></button></div>{mode==='countdown'&&<DurationInput label={ui("这次专注多久")} value={minutes} max={1440} onChange={setMinutes}/>}<p className="hint">{ui("开始后进入专注大屏；可以收起回到日程。")}</p>{error&&<p role="alert" className="inline-error">{ui(error)}</p>}<button className="primary focus-start-large" disabled={busy||(mode==='countdown'&&(!minutes||minutes<1))}><Play size={18}/>{ui("开始专注")}</button></form></dialog>,document.body);
}

export default function FocusPanel({state,busy,mutate,expanded,expand,minimize,error,onRecorded}:{onRecorded:(id:string,sessionId?:string)=>void;error:string;state:State;busy:boolean;mutate:(command:Command,message?:string)=>Promise<boolean>;expanded:boolean;expand:()=>void;minimize:()=>void}){
 const f=state.focus;
 const [now,setNow]=useState(Date.now),[settling,setSettling]=useState(false);
 const ref=useRef<HTMLDialogElement>(null),stopping=useRef<string|null>(null);
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const id=window.setInterval(tick,100);window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};},[]);
 useEffect(()=>{const el=ref.current;if(expanded&&f){el?.showModal();}return()=>el?.close();},[expanded,!!f]);
 const elapsed=focusSeconds(f,now),countdown=f?.mode==='countdown',reached=!!f&&countdown&&elapsed>=f.target,running=!!f?.startedAt&&!reached;
 useEffect(()=>{if(reached&&f?.startedAt&&!busy&&stopping.current!==f.startedAt){stopping.current=f.startedAt;void mutate({type:'focus.pause'});}},[reached,f?.startedAt,busy,mutate]);
 if(!f)return null;
 const seconds=countdown?Math.max(0,Math.ceil(f.target-elapsed)):Math.floor(elapsed);
 const clock=String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const value=potentialWealth(elapsed,state.settings.growthRate).toFixed(2),task=state.tasks.find(t=>t.id===f.taskId);
 const finish=async()=>{if(settling)return;setSettling(true);const sessionId=crypto.randomUUID();try{if(await mutate({type:'focus.finish',payload:{sessionId}},ui("本段真实起止与用时已记录，累计进度已更新。"))){minimize();onRecorded(f.taskId,elapsed>0?sessionId:undefined);}}finally{setSettling(false);}};
 const began=f.spans?.[0]?.startedAt||f.startedAt,startLabel=began?localParts(Date.parse(began),state.settings.timezone).time:'';
 const status=reached?'本段已完成 · 计时已停止':running?'专注进行中':'已暂停';
 if(!expanded)return <div className="focus-dock"><div><strong>{task?.title}</strong><small>{ui(status)}</small></div><b>{clock}</b><button className="primary" onClick={expand}><Maximize2 size={16}/>{ui("回到专注")}</button></div>;
 return createPortal(<dialog ref={ref} className={'focus-stage'+(state.settings.reducedMotion?' reduced-motion':'')} aria-label={ui("沉浸专注")} onCancel={e=>{e.preventDefault();minimize();}}><div className="focus-stage-inner"><header><span>{ui("日常有序 / FOCUS")}</span><button onClick={minimize}><Minimize2 size={17}/>{ui("收起，返回工作台")}</button></header><div className="focus-stage-title"><span className="focus-state"><i className={running?'running':''}/>{ui(status)}</span><h1>{task?.title||ui("当前专注")}</h1></div><div className="focus-stage-grid"><section className="focus-time-side"><small>{countdown?ui("本段剩余时间"):ui("已经专注")}</small><output aria-live="off" className="immersive-clock" aria-label={ui("专注时间 ")+clock}>{clock}</output><p>{countdown?ui("计划 ")+Math.round(f.target/60)+ui(" 分钟"):ui("正向计时 · 结束时记录实际投入")}</p>{startLabel&&<p>{ui("开始于")}{startLabel} {ui("· 暂停不计入用时")}</p>}</section><section className="wealth-meter" data-running={running}><div className="wealth-caption"><TrendingUp size={22}/><span>{ui("正在积累的潜在财富")}</span></div><output className="wealth-value" aria-label={tr("本段潜在财富 {0} 成长值",value)} aria-live="off"><RollingNumber value={value}/></output><span className="wealth-unit">{ui("成长值")}</span><p>{state.settings.growthRate} {ui("/ 小时 ·")}{running?ui("随每一秒投入增长"):reached?ui("本段积累已停止"):ui("暂停期间不增长")}</p><small>{ui("给努力一点看得见的反馈 · 虚拟激励")}</small></section></div>{reached&&<p className="focus-arrived" role="status">{ui("这段专注到点了。用时和成长值已停止增长，点击下方记录本段。")}</p>}{error&&<p role="alert" className="focus-arrived">{ui(error)}</p>}<div className="focus-stage-controls">{!reached&&<button disabled={busy||settling} onClick={()=>void mutate({type:running?'focus.pause':'focus.start',payload:{taskId:f.taskId}})}>{running?<Pause/>:<Play/>}{running?ui("暂停一下"):ui("继续专注")}</button>}<button className="primary" disabled={busy||settling} onClick={()=>void finish()}><Check/>{ui("结束并记录")}</button><button className="text-btn" disabled={busy||settling} onClick={()=>{if(confirm(ui("放弃本段，不记录本次用时和成长值？")))void mutate({type:'focus.cancel'}).then(ok=>{if(ok)minimize();});}}>{ui("放弃本段")}</button></div><footer>{ui("结束会记录本段真实时间并累加投入；整项完成仍由你确认。")}</footer></div></dialog>,document.body);
}
