import {type State,type Command} from './model.ts';
import {applyOperation,type Operation} from './operation.ts';
export type Snapshot={ownerId:string;state:State;revision:number;updatedAt:string};
export type DeviceRecord={generation:number;base:Snapshot;queue:Operation[];conflict?:Snapshot;problem?:string};
export function projected(r:DeviceRecord):Snapshot {return {...r.base,state:r.queue.reduce((s,o)=>applyOperation(s,o),r.base.state)};}
export function receive(r:DeviceRecord|undefined,remote:Snapshot):DeviceRecord {
 if(!r)return {generation:0,base:remote,queue:[]};
 if(r.base.ownerId!==remote.ownerId)throw new Error('登录账号与本机记录不同。请先导出本机备份，再清除此设备缓存后切换账号。');
 if(r.problem&&r.queue.length)return {...r,conflict:remote};
 let queue=r.queue.slice();while(queue.length&&remote.state.receipts.includes(queue[0].operationId))queue.shift();
 if(queue.length&&remote.revision!==r.base.revision+(r.queue.length-queue.length)){return {...r,conflict:remote,problem:'云端已有更新。本机记录已保留，请先处理同步冲突。'};}
 return {...r,base:remote,queue,conflict:undefined,problem:undefined};
}
export function accept(r:DeviceRecord,op:Operation):DeviceRecord {
 if(r.conflict||r.problem)throw new Error(r.problem||'请先处理同步冲突。');
 applyOperation(projected(r).state,op);return {...r,queue:[...r.queue,op]};
}

let dbPromise:Promise<IDBDatabase>|undefined;
function database(){return dbPromise??=new Promise<IDBDatabase>((resolve,reject)=>{const q=indexedDB.open('niannian-friends-offline-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('device');q.onsuccess=()=>resolve(q.result);q.onerror=()=>{dbPromise=undefined;reject(q.error);};});}
export function createDeviceStore(project:string,uid:string){
 if(!project||!uid)throw new Error('请先登录。');
 const key=project+':'+uid;
 const check=(r:DeviceRecord)=>{if(r.base.ownerId!==uid)throw new Error('记录不属于当前账号，已拒绝读取或写入。');};
 return {
 async readDevice():Promise<DeviceRecord|undefined>{const db=await database();return new Promise((resolve,reject)=>{const q=db.transaction('device').objectStore('device').get(key);q.onsuccess=()=>{try{if(q.result)check(q.result);resolve(q.result);}catch(e){reject(e);}};q.onerror=()=>reject(q.error);});},
 async writeDevice(next:DeviceRecord,expected:number|undefined):Promise<DeviceRecord>{check(next);const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('device','readwrite'),store=tx.objectStore('device'),q=store.get(key);let saved:DeviceRecord;let stale=false;q.onsuccess=()=>{if(q.result?.generation!==expected){stale=true;tx.abort();return;}saved={...next,generation:(expected??-1)+1};store.put(saved,key);};tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(new Error(stale?'其他窗口更新了本机记录，请刷新后重试。':'本机存储未成功，修改尚未保存。'));});},
 async clearDevice(expected:number){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('device','readwrite'),store=tx.objectStore('device'),q=store.get(key);q.onsuccess=()=>{if(q.result?.generation!==expected){tx.abort();return;}store.delete(key);};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('其他窗口有新记录，请重新检查。'));tx.onerror=()=>reject(tx.error);});}
 };
}
