import {SchemaCompatibilityError} from './schema-version';
import type {User} from 'firebase/auth';
import {z} from 'zod';
import {auth,db,dataSpace} from './firebase';
import {createCloudStore,RevisionConflict} from './cloud-store';
import type {Snapshot} from './offline';
export type SyncIssue={kind:'connection'|'timeout'|'auth'|'service'|'response'|'storage'|'local'|'compatibility';message:string;retryable:boolean};
export class WorkspaceRequestError extends Error {readonly issue:SyncIssue;constructor(issue:SyncIssue){super(issue.message);this.issue=issue;}}
export function syncIssue(error:unknown):SyncIssue {
 if(error instanceof SchemaCompatibilityError)return {kind:'compatibility',message:error.message,retryable:false};
 if(error instanceof WorkspaceRequestError)return error.issue;
 if(error instanceof DOMException)return {kind:'storage',message:'本机存储不可用或空间不足，请先备份记录。',retryable:false};
 const code=(error as {code?:string})?.code||'';
 if(code==='permission-denied')return {kind:'auth',message:'访问被拒绝。请确认邮箱已验证；若仍失败，需要部署应用的数据库安全规则。',retryable:false};
 if(['unavailable','deadline-exceeded','resource-exhausted','aborted'].includes(code))return {kind:'service',message:'云端暂时不可用，已保留本机记录并将自动重试。',retryable:true};
 return {kind:'local',message:error instanceof Error?error.message:'同步未完成，请先备份本机记录。',retryable:false};
}
export function syncRetryDelay(failures:number){return [2000,5000,15000,30000,60000][Math.min(Math.max(failures-1,0),4)];}
const operation=z.object({ownerId:z.string(),revision:z.number().int().nonnegative(),operationId:z.string().uuid(),instant:z.string().datetime(),command:z.object({type:z.string(),payload:z.unknown().optional()})});
export function createWorkspaceRequest(user:User){
 const assertSession=()=>{if(auth.currentUser?.uid!==user.uid||!auth.currentUser.emailVerified)throw new WorkspaceRequestError({kind:'auth',message:'请使用原账号登录并验证邮箱。本机待同步记录仍保留。',retryable:false});};
 const store=createCloudStore(db,{uid:user.uid,name:user.displayName||'朋友',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'},assertSession,dataSpace);
 return async(payload?:unknown):Promise<{ok:boolean;status:number;body:Snapshot&{error?:string}}>=>{
  assertSession();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   let pending:Promise<Snapshot>;
   if(payload){const op=operation.parse(payload);if(op.ownerId!==user.uid)throw new Error('禁止跨账号上传记录。');pending=store.commit(op,op.revision);}else pending=store.load();
   const body=await Promise.race([pending,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new WorkspaceRequestError({kind:'timeout',message:'云端响应超时，将自动重连。本机记录仍保留。',retryable:true})),15000);})]);
   assertSession();return {ok:true,status:200,body};
  }catch(e){if(e instanceof RevisionConflict)return {ok:false,status:409,body:e.snapshot};throw e;}finally{clearTimeout(timer);}
 };
}
