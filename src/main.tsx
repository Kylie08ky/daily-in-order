import LanguageSwitch,{LanguageMetadata,useLanguage} from '../app/language-switch';
import {t as ui,tr,locale} from '../lib/i18n';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile,reload,signOut,setPersistence,browserLocalPersistence,browserSessionPersistence,type User} from 'firebase/auth';
import {auth} from '../lib/firebase';
import Workbench from '../app/workbench';
import BrandMark from '../app/brand-mark';
import {SessionContext} from '../app/session';
import '../app/globals.css';import '../app/life.css';import '../app/home.css';import '../app/focus.css';import '../app/scenes.css';import '../app/readability.css';import '../app/offline.css';import './auth.css';

const message=(error:unknown)=>{
 const code=(error as {code?:string})?.code;
 return ({'auth/invalid-credential':'邮箱或密码不正确。','auth/email-already-in-use':'这个邮箱已经注册，请登录或找回密码。','auth/invalid-email':'请填写有效的邮箱地址。','auth/weak-password':'密码至少需要 8 个字符。','auth/password-does-not-meet-requirements':'密码至少需要 8 个字符。','auth/too-many-requests':'操作过于频繁，请稍后再试。','auth/network-request-failed':'暂时无法连接登录服务，请检查网络后重试。','auth/unauthorized-domain':'此网址尚未加入 Firebase 授权域名。','auth/operation-not-allowed':'邮箱密码登录尚未启用。'} as Record<string,string>)[code||'']||'操作未完成，请稍后重试。';
};
function PasswordField({id,label,value,onChange,register=false}:{id:string;label:string;value:string;onChange:(value:string)=>void;register?:boolean}){
 const [visible,setVisible]=useState(false);
 return <div className="auth-password-field"><label htmlFor={id}>{label}</label><div className="auth-password-control"><input id={id} type={visible?'text':'password'} required minLength={register?8:undefined} autoComplete={register?'new-password':'current-password'} value={value} onChange={e=>onChange(e.target.value)} placeholder={register?ui("至少 8 个字符"):ui("输入密码")} aria-describedby={register?'password-requirement':undefined}/><button type="button" className="auth-password-toggle" aria-label={(visible?ui("隐藏"):ui("显示"))+(locale()==='zh-CN'?'':' ')+label} aria-pressed={visible} aria-controls={id} onClick={()=>setVisible(v=>!v)}>{visible?ui("隐藏"):ui("显示")}</button></div></div>;
}
function App(){useLanguage();
 const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[mode,setMode]=useState<'login'|'register'|'reset'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[remember,setRemember]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[verified,setVerified]=useState(false);
 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setVerified(!!u?.emailVerified);if(!u){setMode('login');setName('');setEmail('');}setPassword('');setConfirmPassword('');setReady(true);setError('');setNotice('');}),[]);
 const action=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(message(e));}finally{setBusy(false);}};
 if(!ready)return <main className="auth-page"><p>{ui("正在确认登录状态…")}</p></main>;
 if(user&&verified)return <SessionContext.Provider value={user}><Workbench key={user.uid}/></SessionContext.Provider>;
 return <main className="auth-page"><section className="auth-story"><span className="auth-brand"><BrandMark className="auth-mark"/>{ui("日常有序")}</span><h1>{ui("把在意的事，")}<br/>{ui("放进每一天。")}</h1><p>{ui("日程、项目与生活进度，")}<br/>{ui("在属于你的工作台里慢慢积累。")}</p></section><section className="auth-card">
 {user?<><span className="auth-kicker">{ui("最后一步")}</span><h2>{ui("验证你的邮箱")}</h2><p>{ui("请打开")}<strong>{user.email}</strong> {ui("收到的邮件，点击验证链接，再回来继续。")}</p><p className="hint">{ui("验证通过后才会建立你的独立云端空间。")}</p><div className="auth-buttons"><button disabled={busy} className="primary" onClick={()=>void action(async()=>{await reload(user);await user.getIdToken(true);setVerified(user.emailVerified);if(!user.emailVerified)setNotice(ui("还没有检测到验证完成，请先点击邮件中的链接。"));})}>{ui("我已验证，继续")}</button><button disabled={busy} onClick={()=>void action(async()=>{auth.languageCode=locale()==='zh-CN'?'zh-CN':locale().split('-')[0];await sendEmailVerification(user,{url:location.origin+'/'});setNotice(ui("验证邮件已发送，请检查收件箱和垃圾邮件。"));})}>{ui("重新发送验证邮件")}</button><button disabled={busy} onClick={()=>void action(()=>signOut(auth))}>{ui("返回登录")}</button></div></>:<>
 <span className="auth-kicker">{ui("你的日常，自成一页")}</span><h2>{mode==='register'?ui("创建你的工作台"):mode==='reset'?ui("找回密码"):ui("欢迎回来")}</h2><p>{mode==='register'?ui("注册后从空白开始，每个人的记录独立保存。"):mode==='reset'?ui("我们会向你的邮箱发送重置密码链接。"):ui("用你的邮箱登录，继续今天的进度。")}</p>
 <form onSubmit={e=>{e.preventDefault();if(mode==='register'&&password.length<8){setError(ui("密码至少需要 8 个字符。"));return;}if(mode==='register'&&password!==confirmPassword){setError(ui("两次填写的密码不一致。"));return;}void action(async()=>{
  if(mode==='reset'){auth.languageCode=locale()==='zh-CN'?'zh-CN':locale().split('-')[0];await sendPasswordResetEmail(auth,email.trim(),{url:location.origin+'/'});setNotice(ui("如果该邮箱已注册，会收到重置邮件，请检查收件箱。"));return;}
  await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);
  if(mode==='register'){const result=await createUserWithEmailAndPassword(auth,email.trim(),password);await updateProfile(result.user,{displayName:name.trim()||ui("朋友")});auth.languageCode=locale()==='zh-CN'?'zh-CN':locale().split('-')[0];await sendEmailVerification(result.user,{url:location.origin+'/'});setNotice(ui("验证邮件已发送。"));}
  else await signInWithEmailAndPassword(auth,email.trim(),password);
 });}}>
 {mode==='register'&&<label>{ui("称呼")}<input required maxLength={30} autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} placeholder={ui("你希望我们怎么称呼你")}/></label>}
 <label>{ui("邮箱")}<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
 {mode!=='reset'&&<PasswordField key={mode} id="account-password" label={ui("密码")} value={password} onChange={setPassword} register={mode==='register'}/>}
 {mode==='register'&&<><PasswordField id="account-confirm-password" label={ui("确认密码")} value={confirmPassword} onChange={setConfirmPassword} register/><p id="password-requirement" className="auth-password-hint">{ui("密码至少 8 个字符，两次填写须一致。")}</p></>}
 {mode!=='reset'&&<label className="auth-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>{ui("在这台个人设备上保持登录")}</label>}
 <button disabled={busy} type="submit" className="primary auth-submit">{busy?ui("请稍候…"):mode==='register'?ui("注册并发送验证邮件"):mode==='reset'?ui("发送重置邮件"):ui("登录")}</button>
 </form><div className="auth-links"><button disabled={busy} onClick={()=>{setMode(mode==='register'?'login':'register');setError('');setNotice('');}}>{mode==='register'?ui("已有账号，去登录"):ui("还没有账号？注册")}</button>{mode!=='reset'&&<button disabled={busy} onClick={()=>{setMode('reset');setError('');setNotice('');}}>{ui("忘记密码")}</button>}{mode==='reset'&&<button onClick={()=>setMode('login')}>{ui("返回登录")}</button>}</div></>}
 {error&&<p className="auth-error" role="alert">{ui(error)}</p>}{notice&&<p className="auth-notice" role="status">{ui(notice)}</p>}
 <p className="auth-foot">{ui("邮箱用于登录、验证及找回密码。请在共享设备上退出登录。")}</p><LanguageSwitch/></section></main>;
}
createRoot(document.getElementById('root')!).render(<><LanguageMetadata/><App/></>);

import '../app/identity.css';

import '../app/daily-flow.css';

import '../app/daily-agenda.css';

import '../app/learning-workspace.css';

import '../app/life-organized.css';
