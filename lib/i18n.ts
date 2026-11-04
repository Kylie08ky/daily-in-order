import {english} from './english.ts';
import {german} from './german.ts';
export type Language='zh'|'en'|'de';
let current:Language='zh';const listeners=new Set<()=>void>();
export function detectLanguage(query:string,saved:string|null,browser:string):Language{
 const requested=new URLSearchParams(query).get('lang');
 if(requested==='en'||requested==='zh'||requested==='de')return requested;
 if(saved==='en'||saved==='zh'||saved==='de')return saved;
 return browser.toLowerCase().startsWith('zh')?'zh':browser.toLowerCase().startsWith('de')?'de':'en';
}
if(typeof window!=='undefined'){
 let saved=null;try{saved=localStorage.getItem('daily-in-order:language');}catch{}
 current=detectLanguage(location.search,saved,navigator.language);
}
export function language(){return current;}
export function locale(){return current==='zh'?'zh-CN':current==='de'?'de-DE':'en-GB';}
export function subscribeLanguage(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function setLanguage(value:Language){
 current=value;
 if(typeof window!=='undefined'){
  try{localStorage.setItem('daily-in-order:language',value);}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',value);history.replaceState(history.state,'',url);
  document.documentElement.lang=value==='zh'?'zh-CN':value;document.title=value==='zh'?'日常有序':'Daily in Order';
 }
 listeners.forEach(fn=>fn());
}
/** Use only on interface text, never task titles, notes, names or input values. */
export function t(value:string):string{
 if(current==='zh')return value;
 const catalog=current==='de'?german:english;
 if(Object.prototype.hasOwnProperty.call(catalog,value))return catalog[value];
 const key=value.trim().replace(/\s+/g,' ');
 if(Object.prototype.hasOwnProperty.call(catalog,key))return catalog[key];
 return value;
}
export function tr(template:string,...values:unknown[]){return t(template).replace(/\{(\d+)\}/g,(_,index)=>String(values[Number(index)]??''));}
