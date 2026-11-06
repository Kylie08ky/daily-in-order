import {useEffect,useSyncExternalStore} from 'react';
import {language,setLanguage,subscribeLanguage} from '../lib/i18n';
import './language.css';
export function useLanguage(){return useSyncExternalStore(subscribeLanguage,language,()=> 'zh' as const);}
export function LanguageMetadata(){const lang=useLanguage();useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':lang;document.title=lang==='zh'?'日常有序':'Daily in Order';document.querySelector('link[rel=manifest]')?.setAttribute('href',lang==='zh'?'/manifest.webmanifest':`/manifest-${lang}.webmanifest`);},[lang]);return null;}
export default function LanguageSwitch(){const lang=useLanguage();return <nav className="language-switch" aria-label="Language / Sprache / 语言"><button type="button" lang="zh-CN" aria-pressed={lang==='zh'} onClick={()=>setLanguage('zh')}>中文</button><button type="button" lang="en" aria-pressed={lang==='en'} onClick={()=>setLanguage('en')}>English</button><button type="button" lang="de" aria-pressed={lang==='de'} onClick={()=>setLanguage('de')}>Deutsch</button></nav>;}
