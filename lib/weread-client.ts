import {auth} from './firebase';
export const wereadEndpoint=(import.meta.env.VITE_WEREAD_GATEWAY||'').trim();
const errors:Record<string,string>={login:'请重新登录并完成邮箱验证。','weread-key':'微信读书密钥无效或已过期，请重新获取。','rate-limit':'请求较多，请稍等一分钟再试。','upgrade-required':'微信读书接口需要更新，请稍后再试。','not-configured':'微信读书连接服务尚未配置。','weread-request':'微信读书未能读取书籍，请检查密钥权限或稍后重试。'};
export async function requestWeRead(key:string,api:'/shelf/sync'|'/book/getprogress',bookId?:string,signal?:AbortSignal){
 if(!wereadEndpoint)throw Error(errors['not-configured']);
 const endpoint=new URL(wereadEndpoint);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw Error(errors['not-configured']);
 const user=auth.currentUser;if(!user||!user.emailVerified)throw Error(errors.login);
 const token=await user.getIdToken();
 const response=await fetch(endpoint,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({key,api,...(bookId?{bookId}:{})}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});
 const result=await response.json();if(!response.ok&&typeof result.diagnostic==='string'&&/^auth-[a-z0-9-]+$/.test(result.diagnostic))console.warn('WeRead authentication check:',result.diagnostic);if(!response.ok)throw Error(errors[result.error]||'连接微信读书失败，请稍后重试。');return result;
}
