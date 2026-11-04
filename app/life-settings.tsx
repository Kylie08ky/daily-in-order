import {t as ui,tr,locale} from '../lib/i18n';
import {useState} from 'react';
import type {State,Command} from '../lib/model';
import DurationInput from './duration-input';

export default function LifeSettings({state,mutate,busy}:{state:State;mutate:(command:Command,message?:string)=>Promise<boolean>;busy:boolean}){
 const [p,setP]=useState(state.life.preferences);
 const duration=(key:'germanWeekly'|'learningMinutes'|'readingMinutes'|'workoutMinutes'|'workoutTravel'|'fitnessWeekly',label:string,max:number,hint:string)=> <div className="settings-field-row"><div className="settings-field-label">{label}<small>{hint}</small></div><DurationInput label={label} value={p[key]} max={max} onChange={value=>setP(v=>({...v,[key]:value??0}))}/></div>;
 return <form className="settings-life" onSubmit={e=>{e.preventDefault();void mutate({type:'life.preferences',payload:p},ui("生活偏好已保存，首页和各模块已同步。"));}}><fieldset disabled={busy}>
 <section className="settings-card"><header><h3>{ui("学习")}</h3><p>{ui("为自己的学习方向安排合适的节奏。")}</p></header>{duration('germanWeekly',ui("每周学习目标"),10080,ui("设为 0 时，只记录投入，不设目标。"))}{duration('learningMinutes',ui("默认学习时长"),1440,ui("用于新安排的学习任务，可单独调整。"))}</section>
 <section className="settings-card"><header><h3>{ui("阅读")}</h3><p>{ui("用自己的步调积累阅读。")}</p></header><div className="settings-field-row"><label htmlFor="settings-reading-year">{ui("年度阅读目标")}<small>{ui("本；设为 0 时暂不设目标。")}</small></label><input id="settings-reading-year" type="number" min={0} max={1000} required value={p.readingYearly} onChange={e=>setP(v=>({...v,readingYearly:Number(e.target.value)}))}/></div>{duration('readingMinutes',ui("默认阅读时长"),1440,ui("用于新安排的阅读任务。"))}</section>
 <section className="settings-card"><header><h3>{ui("作息")}</h3><p>{ui("按自己的日常节奏设置，也可以留空。")}</p></header><div className="settings-field-row"><label htmlFor="settings-sleep-bed">{ui("目标入睡时间")}</label><input id="settings-sleep-bed" type="time" value={p.sleepBed} onChange={e=>setP(v=>({...v,sleepBed:e.target.value}))}/></div><div className="settings-field-row"><label htmlFor="settings-sleep-wake">{ui("目标起床时间")}</label><input id="settings-sleep-wake" type="time" value={p.sleepWake} onChange={e=>setP(v=>({...v,sleepWake:e.target.value}))}/></div></section>
 <section className="settings-card"><header><h3>{ui("运动")}</h3><p>{ui("训练、散步或其他运动，都可以纳入计划。")}</p></header>{duration('fitnessWeekly',ui("每周运动目标"),10080,ui("设为 0 时，只记录投入，不设目标。"))}{duration('workoutMinutes',ui("新训练默认时长"),300,ui("每次训练还可以单独调整时长与动作。"))}{duration('workoutTravel',ui("往返通勤预留"),180,ui("无需通勤时设为 0。"))}</section>
 <div className="settings-save"><span>{ui("保存后同步到首页与各模块，历史记录会保留。")}</span><button className="primary" type="submit">{busy?ui("保存中…"):ui("保存生活偏好")}</button></div>
 </fieldset></form>;
}
