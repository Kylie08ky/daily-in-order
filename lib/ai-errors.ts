/** Only fixed messages leave this boundary; provider text may contain input or URLs. */
export function aiFailure(error:unknown):string{
 const e=error as {code?:unknown;name?:unknown;customErrorData?:{status?:unknown;errorDetails?:{reason?:unknown}[]}}|null;
 const code=typeof e?.code==='string'?e.code:'';
 const status=e?.customErrorData?.status;
 if(status===400)return 'AI 请求配置无效，请联系维护者检查（AI-400）。你的输入已保留。';
 if(typeof status==='number'&&status>=500)return 'AI 服务暂时异常，请稍后重试（AI-5XX）。你的输入已保留。';
 if(code==='api-not-enabled'||e?.customErrorData?.errorDetails?.some(d=>d.reason==='SERVICE_DISABLED'))return 'AI 服务配置尚未完成，请联系维护者检查服务启用状态。你的输入已保留。';
 if(status===429||code.includes('quota'))return '免费 AI 额度暂时用完，请稍后重试，或使用清单录入。';
 if(status===401)return 'AI 登录状态已过期，请重新登录后重试。你的输入已保留。';
 if(status===403)return 'AI 服务拒绝了请求，请联系维护者检查访问配置（AI-403）。你的输入已保留。';
 if(status===404)return '当前 AI 模型不可用，请联系维护者检查模型配置（AI-404）。你的输入已保留。';
 if(e?.name==='AbortError'||e?.name==='TimeoutError'||code==='timeout')return 'AI 响应超时，请稍后重试。你的输入已保留。';
 if(code==='error'||code==='fetch-error')return 'AI 网络请求未完成，请稍后重试（AI-NETWORK）。你的输入已保留。';
 return 'AI 暂时无法生成有效草稿。原来的内容还在，请稍后重试，或使用清单录入。';
}
export async function verificationDeadline<T>(request:Promise<T>,ms=20000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([request,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('verification-timeout')),ms);})]);}
 finally{clearTimeout(timer);}
}
