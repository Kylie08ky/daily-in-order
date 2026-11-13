import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Monitor,ArrowRight} from 'lucide-react';
import LanguageSwitch,{useLanguage} from './language-switch';
import {t as ui} from '../lib/i18n';
import './desktop-recommendation.css';

const query='(max-width: 767px), (pointer: coarse) and (max-height: 500px)';
const key='daily-in-order:desktop-recommendation:v1';

export default function DesktopRecommendation({children}:{children:ReactNode}){
 useLanguage();
 const [mobile,setMobile]=useState(()=>window.matchMedia(query).matches);
 const [continued,setContinued]=useState(()=>{try{return sessionStorage.getItem(key)==='continued';}catch{return false;}});
 const button=useRef<HTMLButtonElement>(null);
 const visible=mobile&&!continued;
 useEffect(()=>{const media=window.matchMedia(query);const update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{if(visible)button.current?.focus();},[visible]);
 return <>
  {visible&&<main className="desktop-recommendation" aria-labelledby="desktop-recommendation-title">
   <section className="desktop-recommendation-card">
    <span className="desktop-recommendation-brand">{ui('日常有序')}</span>
    <div className="desktop-recommendation-icon" aria-hidden="true"><Monitor size={32}/></div>
    <h1 id="desktop-recommendation-title">{ui('建议使用电脑打开')}</h1>
    <p>{ui('当前版本优先支持电脑端，手机布局仍在完善中。使用电脑安排任务、查看时间轴，会有更完整的体验。')}</p>
    <p className="desktop-recommendation-note">{ui('你仍可以在手机上继续使用，已有记录会保留。')}</p>
    <button ref={button} type="button" onClick={()=>{try{sessionStorage.setItem(key,'continued');}catch{/* Continue even when browser storage is unavailable. */}setContinued(true);}}>{ui('仍然继续使用')}<ArrowRight size={18} aria-hidden="true"/></button>
    <small>{ui('本次打开期间不再提示。')}</small>
    <LanguageSwitch/>
   </section>
  </main>}
  {/* Keep authentication, sync and active timers mounted when the notice is shown. */}
  <div style={visible?{display:'none'}:undefined}>{children}</div>
 </>;
}
