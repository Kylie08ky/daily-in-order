import {t as ui,tr,locale} from '../lib/i18n';
import ModulePicker,{optionalModules,type OptionalModule} from './module-picker';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,GraduationCap,Moon,Activity} from 'lucide-react';
import {formatTime,type State,type Command} from '../lib/model';
import DurationInput from './duration-input';
import './welcome-guide.css';

export default function WelcomeGuide({state,mutate,busy,error,onClose,onComplete}:{state:State;mutate:(command:Command,message?:string)=>Promise<boolean>;busy:boolean;error:string;onClose?:()=>void;onComplete?:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),saving=useRef(false);
 const initial=useRef(state.life.preferences),p=initial.current;
 const [step,setStep]=useState(0),stepHeading=useRef<HTMLHeadingElement>(null),body=useRef<HTMLDivElement>(null);
 const [modules,setModules]=useState<OptionalModule[]>(state.settings.visibleModules??(state.onboarding==='pending'?[]:['german','reading','habits','fitness','finance'])),[nutrition,setNutrition]=useState(state.settings.nutritionEnabled);
 const keys=['modules',...(['german','reading','habits','fitness'] as const).filter(m=>modules.includes(m)),'confirm'];
 const names:Record<string,string>={modules:'选择模块',german:'学习',reading:'阅读',habits:'作息',fitness:'运动',confirm:'确认'};
 const steps=keys.map(k=>names[k]),current=keys[step],last=step===keys.length-1;
 const [learning,setLearning]=useState<number|null>(p.germanWeekly||null),[reading,setReading]=useState(p.readingYearly?String(p.readingYearly):''),[bed,setBed]=useState(p.sleepBed),[wake,setWake]=useState(p.sleepWake),[movement,setMovement]=useState<number|null>(p.fitnessWeekly||null),[submitting,setSubmitting]=useState(false),[localError,setLocalError]=useState('');
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 useEffect(()=>{stepHeading.current?.focus();if(body.current)body.current.scrollTop=0;},[step]);
 const skipStep=()=>{if(current==='german')setLearning(p.germanWeekly||null);if(current==='reading')setReading(p.readingYearly?String(p.readingYearly):'');if(current==='habits'){setBed(p.sleepBed);setWake(p.sleepWake);}if(current==='fitness')setMovement(p.fitnessWeekly||null);setStep(v=>v+1);};
 const finish=async(action:'skip'|'complete',learn=false)=>{
  if(onClose&&action==='skip'){onClose();if(learn)onComplete?.();return;}
  if(busy||saving.current)return;
  saving.current=true;setSubmitting(true);setLocalError('');
  try{const goals={germanWeekly:learning??0,readingYearly:reading===''?0:Number(reading),sleepBed:bed,sleepWake:wake,fitnessWeekly:movement??0};const ok=await mutate(action==='skip'?{type:'life.onboarding',payload:{action:'skip'}}:{type:'life.setup',payload:{firstLogin:!onClose,modules,nutritionEnabled:nutrition,goals}},action==='skip'?ui("已跳过，之后可在设置里开启模块。"):ui("模块与目标已保存。"));if(ok){onClose?.();if(action==='complete'||learn)onComplete?.();}}
  catch{setLocalError(ui("暂未保存成功，请重试；填写的内容还在。"));}
  finally{saving.current=false;setSubmitting(false);}
 };
 return <dialog ref={dialog} className="modal wide welcome-guide" aria-labelledby="welcome-title" aria-describedby="welcome-description" onCancel={e=>{e.preventDefault();if(onClose&&!submitting)onClose();}}>
  <header><div><span className="eyebrow">{ui("日常有序 · 从你的节奏开始")}</span><h2 id="welcome-title">{ui("欢迎，")}{state.settings.name}</h2></div><span className="welcome-mark" aria-hidden="true">{ui("序")}</span></header>
  <p id="welcome-description" className="welcome-intro">{onClose?ui("已带入当前目标。一步一步调整，最后确认后保存。"):ui("先选需要的模块，再设置目标、学习创建项目和安排任务。随时可到「设置 → 问题反馈」提出建议，每一步都可以跳过。")}</p>
  <ol className="welcome-steps" aria-label={ui("引导进度")}>{steps.map((name,i)=><li key={name} aria-current={i===step?'step':undefined} className={i<step?'visited':''}><span>{i+1}</span>{ui(name)}</li>)}</ol>
  <form onSubmit={e=>{e.preventDefault();if(!last)setStep(v=>v+1);else void finish('complete');}}><fieldset disabled={busy||submitting}>
   <div className="welcome-body" ref={body}><h3 className="welcome-step-title" ref={stepHeading} tabIndex={-1}>{tr("第{0} / {1}步 · {2}",step+1,steps.length,last?ui("确认你的选择"):current==='modules'?ui("选择你需要的功能"):tr("{0}目标",ui(steps[step])))}</h3><div className="welcome-step-content">
    {current==='modules'&&<section className="welcome-goal"><p>{ui("只选择你需要的部分。可以全部不选，先使用日程和项目。")}</p><ModulePicker modules={modules} nutrition={nutrition} change={(m,n)=>{setModules(m);setNutrition(n);}}/></section>}
    {current==='german'&&<section className="welcome-goal"><h3><GraduationCap size={19}/>{ui("学习")}</h3><p>{ui("一周想留多少时间学习？")}</p><DurationInput label={ui("每周学习目标")} value={learning} max={10080} onChange={setLearning}/></section>}
    {current==='reading'&&<section className="welcome-goal"><h3><BookOpen size={19}/>{ui("阅读")}</h3><p>{ui("今年想读几本书？")}</p><label>{ui("年度阅读目标（本）")}<input type="number" inputMode="numeric" min={0} max={1000} step={1} placeholder={ui("暂不设定")} value={reading} onChange={e=>setReading(e.target.value)}/></label></section>}
    {current==='habits'&&<section className="welcome-goal"><h3><Moon size={19}/>{ui("作息")}</h3><p>{ui("按自己的节奏，白天睡觉也可以。")}</p><div className="welcome-sleep"><label>{ui("目标入睡时间")}<input type="time" value={bed} onInput={e=>setBed(e.currentTarget.value)} onChange={e=>setBed(e.target.value)}/></label><label>{ui("目标起床时间")}<input type="time" value={wake} onInput={e=>setWake(e.currentTarget.value)} onChange={e=>setWake(e.target.value)}/></label></div></section>}
    {current==='fitness'&&<section className="welcome-goal"><h3><Activity size={19}/>{ui("运动")}</h3><p>{ui("散步、跑步或任何喜欢的运动。")}</p><DurationInput label={ui("每周运动目标")} value={movement} max={10080} onChange={setMovement}/></section>}
    {last&&<section className="welcome-summary"><p>{ui("已选：")}{modules.length?optionalModules.filter(([id])=>modules.includes(id)).map(([,label])=>ui(label)).join(locale()==='zh-CN'?'、':', '):ui("仅日程与项目")}{nutrition?ui("，含饮食与摄入"):''}</p><p>{ui("确认后保存目标，接着带你创建项目、添加任务并安排到时间轴。你随时可以再修改目标。")}</p>{[
     ['学习',learning?ui('每周 ')+formatTime(learning):'暂不设目标'],
     ['阅读',Number(reading)>0?tr('每年 {0} 本',reading):'暂不设目标'],
     ['作息',(bed||ui("入睡未设"))+' — '+(wake||ui("起床未设"))],
     ['运动',movement?ui('每周 ')+formatTime(movement):'暂不设目标']
    ].filter((_,i)=>modules.includes((['german','reading','habits','fitness'] as const)[i])).map(([name,value])=><div className="welcome-summary-row" key={name}><span><strong>{ui(name)}</strong><small>{ui(value)}</small></span><button type="button" className="text-btn" aria-label={ui("修改")+name+ui("目标")} onClick={()=>setStep(keys.indexOf(Object.keys(names).find(key=>names[key]===name)!))}>{ui("修改")}</button></div>)}</section>}
   </div>
   <p className="welcome-hint">{current==='modules'?ui("未选择的功能不会出现在首页和目录。"):last?ui("不会自动生成任务。"):ui("留空或填 0 表示暂不设目标。跳过本项会保留原目标。")} {ui("模块可在「设置 → 显示模块」调整，目标可在「生活偏好」修改。")}</p>
   </div>{(localError||error)&&<p role="alert" className="inline-error">{ui(localError||error)}</p>}
   <div className="form-footer welcome-step-actions"><div className="welcome-step-nav">{step>0&&<button type="button" onClick={()=>setStep(v=>v-1)}>{ui("上一步")}</button>}{!last&&current!=='modules'&&<button type="button" onClick={skipStep}>{ui("跳过本项")}</button>}<button type="submit" className="primary">{submitting?ui("正在保存…"):!last?ui("下一步"):onComplete?ui("保存并学习怎么用"):ui("保存并进入工作台")}</button></div><button type="button" className="text-btn" onClick={()=>void finish('skip')}>{ui("稍后再设置")}</button><small>{ui("关闭引导，不保存本次填写")}</small>{onComplete&&<button type="button" className="text-btn" onClick={()=>void finish('skip',true)}>{ui("跳过目标，直接学习怎么用")}</button>}</div>
  </fieldset></form>
 </dialog>;
}
