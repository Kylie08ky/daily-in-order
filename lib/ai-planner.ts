import {auth,firebaseApp,firebaseProject,deviceProject} from './firebase';
import {plannerPrompt,parseAIPlan,type PlanTask,type DraftProject,type ConversationTurn,type PlanningDraft} from './quick-capture';
import {language} from './i18n';
import {aiFailure,verificationDeadline} from './ai-errors';
import type {AppCheck} from 'firebase/app-check';

export const aiConfigured=import.meta.env.VITE_AI_ENABLED==='true'&&!!import.meta.env.VITE_APPCHECK_SITE_KEY&&!firebaseProject.startsWith('demo-');
let appCheckReady:Promise<AppCheck>|undefined;
let running=false;
class TrialError extends Error{}
export async function organizeWithAI(text:string,date:string,draft:PlanTask[]=[],projects:DraftProject[]=[],referenceDate=date,history:ConversationTurn[]=[],planning?:PlanningDraft,context?:unknown){
 if(!aiConfigured)throw Error('AI 免费试用尚未配置，可以先使用清单录入。');
 const user=auth.currentUser;
 if(!user?.emailVerified)throw Error('请先登录并验证邮箱。');
 if(!navigator.onLine)throw Error('AI 整理需要联网，清单录入可以离线使用。');
 if(running)throw Error('AI 正在整理，请稍候。');
 const prompt=plannerPrompt(text,date,language(),draft,projects,referenceDate,history,planning,context);
 const key=`${deviceProject}:${user.uid}:ai-trial:${new Date().toISOString().slice(0,10)}`;
 let used=0;
 try{used=Number(localStorage.getItem(key)||0);if(!Number.isFinite(used))used=10;}catch{throw Error('无法读取本设备试用次数，请检查浏览器存储权限。');}
 if(used>=10)throw Error('本设备今天的 10 次 AI 试用已用完，可以继续手动填写或明天再试。');
 running=true;
 try{
  localStorage.setItem(key,String(used+1));
  appCheckReady??=import('firebase/app-check').then(({initializeAppCheck,ReCaptchaEnterpriseProvider})=>initializeAppCheck(firebaseApp,{provider:new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})).catch(e=>{appCheckReady=undefined;throw e;});
  const check=await appCheckReady;
  const {getToken}=await import('firebase/app-check');
  try{await verificationDeadline(getToken(check,false));}catch{throw new TrialError('安全验证未完成。若维护者刚修复配置，请刷新页面后再试；也可先用清单录入。本次文字未发送给 AI。');}
  const {getAI,getGenerativeModel,GoogleAIBackend}=await import('firebase/ai');
  const model=getGenerativeModel(getAI(firebaseApp,{backend:new GoogleAIBackend()}),{model:import.meta.env.VITE_AI_MODEL||'gemini-3.5-flash-lite',generationConfig:{responseMimeType:'application/json',temperature:0.2,maxOutputTokens:6000}},{timeout:45000});
  const result=await model.generateContent(prompt);
  if(auth.currentUser?.uid!==user.uid)throw new TrialError('账号已切换，草稿未保存。');
  try{return parseAIPlan(result.response.text());}catch{throw new TrialError('AI 返回的草稿格式不完整，请重试或缩短描述（AI-DRAFT）。你的输入已保留。');}
 }catch(e){
  // Do not expose raw provider output, request contents or tokens in the UI.
  if(e instanceof TrialError)throw e;
  throw Error(aiFailure(e));
 }finally{running=false;}
}
