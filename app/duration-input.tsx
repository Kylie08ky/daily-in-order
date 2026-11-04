import {t as ui,tr,locale} from '../lib/i18n';
'use client';
import {useEffect,useRef,useState} from 'react';

/** Blank is unrecorded; an explicit zero is a recorded duration. */
export default function DurationInput({label,value,onChange,max=100000,autoFocus=false}:{label:string;value:number|null;onChange:(value:number|null)=>void;max?:number;autoFocus?:boolean}){
 const [hours,setHours]=useState(value===null?'':String(Math.floor(value/60)));
 const [minutes,setMinutes]=useState(value===null?'':String(value%60));
 const lastValue=useRef(value);
 useEffect(()=>{
  if(value===lastValue.current)return;
  lastValue.current=value;
  setHours(value===null?'':String(Math.floor(value/60)));
  setMinutes(value===null?'':String(value%60));
 },[value]);
 const update=(h:string,m:string)=>{
  setHours(h);setMinutes(m);
  const total=h===''&&m===''?null:Number(h)*60+Number(m);
  lastValue.current=total;onChange(total);
 };
 return <fieldset className="duration-input"><legend>{label}</legend><div className="duration-parts">
  <label><input aria-label={tr("{0}（小时）",label)} autoFocus={autoFocus} type="number" inputMode="numeric" min={0} max={Math.floor(max/60)} step={1} value={hours} placeholder="—" onChange={e=>update(e.target.value,minutes)}/><span>{ui("小时")}</span></label>
  <label><input aria-label={tr("{0}（分钟）",label)} type="number" inputMode="numeric" min={0} max={Math.min(59,Math.max(0,max-Number(hours)*60))} step={1} value={minutes} placeholder="—" onChange={e=>update(hours,e.target.value)}/><span>{ui("分钟")}</span></label>
 </div></fieldset>;
}
