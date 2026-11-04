import {auth,firebaseApp,firebaseProject,deviceProject} from './firebase';
import {plannerPrompt,parseAIPlan,type DraftItem} from './quick-capture';
import {language} from './i18n';

export const aiConfigured=import.meta.env.VITE_AI_ENABLED==='true'&&!!import.meta.env.VITE_APPCHECK_SITE_KEY&&!firebaseProject.startsWith('demo-');
let appCheckReady:Promise<unknown>|undefined;
let running=false;
export async function organizeWithAI(text:string,date:string,draft:DraftItem[]=[]){
 if(!aiConfigured)throw Error('AI 免费试用尚未配置，可以先使用清单录入。');
 const user=auth.currentUser;
 if(!user?.emailVerified)throw Error('请先登录并验证邮箱。');
 if(!navigator.onLine)throw Error('AI 整理需要联网，清单录入可以离线使用。');
 if(running)throw Error('AI 正在整理，请稍候。');
 const prompt=plannerPrompt(text,date,language(),draft);
 const key=`${deviceProject}:${user.uid}:ai-trial:${new Date().toISOString().slice(0,10)}`;
 let used=0;
 try{used=Number(localStorage.getItem(key)||0);if(!Number.isFinite(used))used=10;}catch{throw Error('无法读取本设备试用次数，请检查浏览器存储权限。');}
 if(used>=10)throw Error('本设备今天的 10 次 AI 试用已用完，可以继续手动填写或明天再试。');
 running=true;
 try{
  localStorage.setItem(key,String(used+1));
  appCheckReady??=import('firebase/app-check').then(({initializeAppCheck,ReCaptchaEnterpriseProvider})=>initializeAppCheck(firebaseApp,{provider:new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APPCHECK_SITE_KEY),isTokenAutoRefreshEnabled:true})).catch(e=>{appCheckReady=undefined;throw e;});
  await appCheckReady;
  const {getAI,getGenerativeModel,GoogleAIBackend}=await import('firebase/ai');
  const model=getGenerativeModel(getAI(firebaseApp,{backend:new GoogleAIBackend()}),{model:import.meta.env.VITE_AI_MODEL||'gemini-3.8-flash',generationConfig:{responseMimeType:'application/json',temperature:0.2,maxOutputTokens:6000}},{timeout:45000});
  const result=await model.generateContent(prompt);
  if(auth.currentUser?.uid!==user.uid)throw Error('账号已切换，草稿未保存。');
  return parseAIPlan(result.response.text());
 }catch(e){
  // Do not expose raw provider output, request contents or tokens in the UI.
  const code=String((e as {code?:string})?.code||'');
  if(code.includes('429')||code.includes('quota'))throw Error('免费 AI 额度暂时用完，请稍后重试，或使用清单录入。');
  if(e instanceof Error&&e.message==='账号已切换，草稿未保存。')throw e;
  throw Error('AI 暂时无法生成有效草稿。原来的内容还在，请稍后重试，或使用清单录入。');
 }finally{running=false;}
}
