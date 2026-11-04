'use client';
import {useEffect,useRef,useState,useCallback,useMemo} from 'react';
import {syncIssue,syncRetryDelay,WorkspaceRequestError,type SyncIssue} from '../lib/workspace-request';
import {useSession} from './session';
import {deviceProject} from '../lib/firebase';
import {createWorkspaceRequest} from '../lib/workspace-request';
import {type Command} from '../lib/model';
import {type Snapshot,type DeviceRecord,createDeviceStore,projected,receive,accept} from '../lib/offline';
export function useWorkspace(){
 const user=useSession();
 const {readDevice,writeDevice,clearDevice}=useMemo(()=>createDeviceStore(deviceProject,user.uid),[user.uid]);
 const requestWorkspace=useMemo(()=>createWorkspaceRequest(user),[user.uid]);
 const [record,setRecord]=useState<DeviceRecord>(),[snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[status,setStatus]=useState('正在读取…'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[ready,setReady]=useState(false),[connectionIssue,setConnectionIssue]=useState<SyncIssue|null>(null),[syncing,setSyncing]=useState(false);
 const active=useRef(false),channel=useRef<BroadcastChannel|null>(null),retryTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),failures=useRef(0),mounted=useRef(true);
 const savedStatus=(r:DeviceRecord)=>r.problem||(r.queue.length?'已存本机 · '+r.queue.length+' 项待同步':'已同步到你的云端空间');
 const present=useCallback((r:DeviceRecord)=>{setRecord(r);setSnapshot(projected(r));},[]);
 const persist=async(r:DeviceRecord,expected:number|undefined)=>{const saved=await writeDevice(r,expected);present(saved);channel.current?.postMessage('changed');return saved;};
 const refresh=useCallback(async(_silent=false)=>{
  if(active.current)return;clearTimeout(retryTimer.current);retryTimer.current=undefined;active.current=true;setSyncing(true);
  let local:DeviceRecord|undefined;
  try{
   local=await readDevice();if(local)present(local);
   setStatus(local?.queue.length?'正在连接云端 · '+local.queue.length+' 项待同步':'正在连接云端…');
   if(navigator.onLine===false)throw new WorkspaceRequestError({kind:'connection',message:'设备当前离线，可以继续在本机记录；恢复联网后会自动同步。',retryable:true});
   const response=await requestWorkspace();if(!response.ok)throw new Error(response.body.error||'读取云端记录失败');
   const next=receive(local,response.body);local=await persist(next,local?.generation);
   if(local.conflict){setStatus(savedStatus(local));setConnectionIssue(null);setError('');failures.current=0;return;}
   while(local.queue.length){
    const op=local.queue[0];setStatus('正在同步 · '+local.queue.length+' 项');
    const res=await requestWorkspace({...op,ownerId:local.base.ownerId,revision:local.base.revision});
    if(!res.ok){
     if(res.status===409){local=await persist({...local,conflict:res.body,problem:'云端已有更新，本机操作已保留。请处理同步冲突。'},local.generation);setStatus(savedStatus(local));setConnectionIssue(null);setError('');return;}
     if(res.status===400||res.status===413){local=await persist({...local,problem:res.body.error||'此操作未被云端接受，请导出后处理。'},local.generation);setStatus(savedStatus(local));setConnectionIssue(null);setError('');return;}
     throw new Error(res.body.error||'同步尚未确认');
    }
    local=await persist({...local,base:res.body,queue:local.queue.slice(1),problem:undefined},local.generation);
   }
   failures.current=0;setConnectionIssue(null);setError('');setStatus(savedStatus(local));
  }catch(e){
   const issue=syncIssue(e);setConnectionIssue(issue);if(!local)setError(issue.message);
   setStatus(local?.queue.length?'已存本机 · '+local.queue.length+' 项待同步':issue.kind==='auth'?'需要重新登录':local?'显示本机副本 · 云端尚未确认':'连接尚未完成');
   if(issue.retryable&&mounted.current){const delay=syncRetryDelay(++failures.current);retryTimer.current=setTimeout(()=>{retryTimer.current=undefined;if(mounted.current)void refresh(true);},delay);}
  }finally{active.current=false;setSyncing(false);setReady(true);}
 },[present,requestWorkspace,readDevice,writeDevice]);
 useEffect(()=>{mounted.current=true;void refresh();const update=()=>void refresh(true),visible=()=>{if(document.visibilityState==='visible')update();};window.addEventListener('online',update);window.addEventListener('focus',update);document.addEventListener('visibilitychange',visible);const timer=setInterval(()=>{if(!retryTimer.current)update();},60000);channel.current=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('friends-'+deviceProject+'-'+user.uid):null;if(channel.current)channel.current.onmessage=()=>{if(!active.current)void readDevice().then(r=>{if(r){present(r);if(r.queue.length)setStatus(savedStatus(r));}}).catch(e=>setConnectionIssue(syncIssue(e)));};return()=>{mounted.current=false;clearInterval(timer);clearTimeout(retryTimer.current);window.removeEventListener('online',update);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',visible);channel.current?.close();};},[refresh,present]);
 const mutate=async(command:Command,_message='已保存')=>{
  if(active.current){setError('正在同步，请稍后重试。');return false;}
  active.current=true;setBusy(true);setError('');let success=false;
  try{const local=await readDevice();if(!local)throw new Error('请先联网加载工作台。');const next=accept(local,{operationId:crypto.randomUUID(),command,instant:new Date().toISOString()});await persist(next,local.generation);setStatus(savedStatus(next));setNotice('已保存到本机，联网后同步');success=true;}
  catch(e){setError(e instanceof Error?e.message:'本机保存失败，未提交修改。');}
  finally{active.current=false;setBusy(false);}
  if(success)void refresh(true);return success;
 };
 const resolve=async(keep:boolean)=>{
  if(active.current)return;active.current=true;setBusy(true);
  try{const local=await readDevice();if(!local)return;const response=await requestWorkspace();if(!response.ok)throw new Error('处理冲突需要联网并登录。');if(response.body.ownerId!==local.base.ownerId)throw new Error('请使用原账号处理。');
   const queue=keep?local.queue.filter(o=>!response.body.state.receipts.includes(o.operationId)):[];
   const next={...local,base:response.body,queue,conflict:undefined,problem:undefined};projected(next);await persist(next,local.generation);setError('');
  }catch(e){setError(e instanceof Error?e.message:'处理失败');}finally{active.current=false;setBusy(false);}void refresh();
 };
 const clear=async()=>{if(active.current)return;const local=await readDevice();if(local)await clearDevice(local.generation);const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('niannian-friends-')).map(k=>caches.delete(k)));if('serviceWorker' in navigator)await Promise.all((await navigator.serviceWorker.getRegistrations()).map(r=>r.unregister()));location.reload();};
 return {snapshot,record,connectionIssue,syncing,error,setError,status,busy,notice,setNotice,ready,refresh,mutate,resolve,clear};
}
