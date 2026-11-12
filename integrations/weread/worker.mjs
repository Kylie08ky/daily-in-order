// Read-only gateway. No storage bindings, analytics, request logs or personal keys in config.
// Authentication is checked online by Firebase, including disabled/revoked accounts.
const UPSTREAM='https://i.weread.qq.com/api/agent/gateway';
const VERSION='1.0.5';
const APIs=new Set(['/shelf/sync','/book/getprogress']);
export async function limitedJSON(message,max){
 const reader=message.body?.getReader();if(!reader)throw Error('invalid');
 let size=0;const chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('size');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const joined=new Uint8Array(size);let i=0;for(const c of chunks){joined.set(c,i);i+=c.length;}return JSON.parse(new TextDecoder().decode(joined));
}
function claims(token){const parts=token.split('.');if(parts.length!==3)throw Error('auth');return JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));}
export async function authenticate(token,env,send=fetch){
 let c;try{c=claims(token);}catch{throw Error('auth-token-format');}const now=Date.now()/1000;
 // Workers supports manual redirects, not redirect:error. Non-2xx responses fail closed.
 // These are only preliminary checks. Google's response below authenticates the token.
 if(c.aud!==env.FIREBASE_PROJECT_ID||c.iss!=='https://securetoken.google.com/'+env.FIREBASE_PROJECT_ID||typeof c.sub!=='string'||!c.sub||c.sub.length>128||!Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.auth_time))throw Error('auth-token-claims');
 let response;try{response=await send('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),redirect:'manual',signal:AbortSignal.timeout(8000)});}catch(e){throw Error('auth-fetch-'+(/Illegal invocation/.test(e?.message||'')?'invocation':e?.name==='TimeoutError'?'timeout':e?.name==='TypeError'?'type':'network'));}
 if(!response.ok)throw Error('auth-lookup-'+response.status);let user;try{user=(await limitedJSON(response,64000)).users?.[0];}catch{throw Error('auth-response');}
 if(!user||user.localId!==c.sub)throw Error('auth-account');if(user.emailVerified!==true)throw Error('auth-email');if(user.disabled)throw Error('auth-disabled');if(Number(user.validSince||0)>c.auth_time)throw Error('auth-revoked');return user.localId;
}
export async function handle(request,env,send=fetch){
 const origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
 const headers={'Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(!origin||!allowed.includes(origin))return new Response('{"error":"origin"}',{status:403,headers});
 headers['Access-Control-Allow-Origin']=origin;
 const reply=(error,status)=>new Response(JSON.stringify({error}),{status,headers});
 if(new URL(request.url).pathname!=='/weread')return reply('not-found',404);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
 if(request.method!=='POST')return reply('method',405);
 if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_WEB_API_KEY||!env.RATE_LIMITER)return reply('not-configured',503);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply('content-type',415);
 const token=/^Bearer (.+)$/.exec(request.headers.get('Authorization')||'')?.[1];if(!token||token.length>16000)return reply('login',401);
 try{
  if(!(await env.RATE_LIMITER.limit({key:'ip:'+(request.headers.get('CF-Connecting-IP')||'unknown')})).success)return reply('rate-limit',429);
  let uid;try{uid=await authenticate(token,env,send);}catch(e){const code=typeof e?.message==='string'&&/^auth-(token-format|token-claims|lookup-[0-9]{3}|account|email|disabled|revoked|fetch-(invocation|timeout|type|network)|response)$/.test(e.message)?e.message:'auth-unavailable';const serviceFailure=/^auth-(fetch-|response|unavailable|lookup-(3|429|5))/.test(code);return new Response(JSON.stringify({error:serviceFailure?'unavailable':'login',diagnostic:code}),{status:serviceFailure?503:401,headers});}
  if(!(await env.RATE_LIMITER.limit({key:'user:'+uid})).success)return reply('rate-limit',429);
  const body=await limitedJSON(request,4096);
  if(!APIs.has(body.api)||typeof body.key!=='string'||!/^wrk-[A-Za-z0-9_-]{8,500}$/.test(body.key))return reply('invalid-request',400);
  if(Object.keys(body).some(k=>!['api','key','bookId'].includes(k)))return reply('invalid-request',400);
  if(body.api==='/book/getprogress'&&(typeof body.bookId!=='string'||!(/^[A-Za-z0-9_-]{1,80}$/).test(body.bookId)))return reply('invalid-request',400);
  const response=await send(UPSTREAM,{method:'POST',headers:{'Authorization':'Bearer '+body.key,'Content-Type':'application/json'},body:JSON.stringify({api_name:body.api,skill_version:VERSION,...(body.api==='/book/getprogress'?{bookId:body.bookId}:{})}),redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(response.status===401||response.status===403)return reply('weread-key',401);
  if(response.status===429)return reply('rate-limit',429);
  if(!response.ok)return reply('upstream',502);
  const data=await limitedJSON(response,3*1024*1024);
  if(data.upgrade_info)return reply('upgrade-required',503);
  if(data.errcode&&data.errcode!==0)return reply('weread-request',502);
  // Deliberately omit reading time, notes, social information and other unused data.
  let result;
  if(body.api==='/shelf/sync'){
   if(!Array.isArray(data.books))return reply('upstream-format',502);
   result={books:data.books.map(b=>({bookId:b.bookId,title:b.title,author:b.author,cover:b.cover,readerLink:b.readerLink}))};
  }else{if(!data.book)return reply('upstream-format',502);result={bookId:data.bookId||body.bookId,book:{progress:data.book.progress,updateTime:data.book.updateTime,chapterUid:data.book.chapterUid}};}
  return new Response(JSON.stringify(result),{status:200,headers});
 }catch{return reply('unavailable',502);}
}
export default {fetch:(request,env)=>handle(request,env)};
