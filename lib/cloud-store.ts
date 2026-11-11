import {CLOUD_ENVELOPE_VERSION,assertEnvelopeVersion} from './schema-version.ts';
import {initializePreviewModules} from './preview-defaults.ts';
import {doc,runTransaction,type Firestore,type Transaction,type DocumentData} from 'firebase/firestore';
import {FirebaseError} from 'firebase/app';
import {emptyState,initializeDay,type State} from './model.ts';
import {applyOperation,type Operation} from './operation.ts';
import {encodeState,decodeState} from './snapshot-codec.ts';
import type {Snapshot} from './offline.ts';
import {workspaceRoot,type DataSpace} from './data-space.ts';

export class RevisionConflict extends Error {snapshot:Snapshot;constructor(snapshot:Snapshot){super('云端已有更新，请复核本机操作。');this.snapshot=snapshot;}}
type Identity={uid:string;name:string;timezone:string};
export function freshState(identity:Identity,space:DataSpace='live'){const state=emptyState();state.settings.name=identity.name.trim().slice(0,30)||'朋友';state.settings.timezone=identity.timezone;return initializePreviewModules(initializeDay(state),space);}
export function createCloudStore(db:Firestore,identity:Identity,assertSession:()=>void=()=>{},space:DataSpace='live'){
 const root=workspaceRoot(space),uid=identity.uid,meta=doc(db,root,uid,'workspace','current'),part=(index:number)=>doc(db,root,uid,'chunks',String(index));
 const read=async(tx:Transaction,data:DocumentData):Promise<Snapshot>=>{
  if(data.ownerId!==uid||!Number.isInteger(data.chunks)||data.chunks<1||data.chunks>64||!Number.isInteger(data.revision))throw new Error('云端记录格式不完整，请保留本机备份。');
  assertEnvelopeVersion(data.schemaVersion);
  const chunks=await Promise.all(Array.from({length:data.chunks},(_,i)=>tx.get(part(i))));
  if(chunks.some(c=>!c.exists()||c.data().revision!==data.revision||c.data().ownerId!==uid))throw new FirebaseError('aborted','云端记录正在更新，请重新读取一致版本。');
  return {ownerId:uid,revision:data.revision,updatedAt:data.updatedAt,state:decodeState(chunks.map(c=>c.data()!.data))};
 };
 const write=(tx:Transaction,state:State,revision:number,previousChunks:number):Snapshot=>{
  assertSession();const chunks=encodeState(state),updatedAt=new Date().toISOString();
  chunks.forEach((data,i)=>tx.set(part(i),{ownerId:uid,revision,data}));
  for(let i=chunks.length;i<previousChunks;i++)tx.delete(part(i));
  tx.set(meta,{ownerId:uid,revision,updatedAt,chunks:chunks.length,schemaVersion:CLOUD_ENVELOPE_VERSION});
  return {ownerId:uid,state,revision,updatedAt};
 };
 const load=async():Promise<Snapshot>=>{assertSession();return runTransaction(db,async tx=>{
   assertSession();const current=await tx.get(meta);
   if(!current.exists())return write(tx,freshState(identity,space),0,0);
   const snapshot=await read(tx,current.data()),updated=initializePreviewModules(initializeDay(structuredClone(snapshot.state)),space);
   return JSON.stringify(updated)===JSON.stringify(snapshot.state)?snapshot:write(tx,updated,snapshot.revision+1,current.data().chunks);
  });};
 return {load,
  async commit(op:Operation,expectedRevision:number):Promise<Snapshot>{assertSession();try{return await runTransaction(db,async tx=>{
   assertSession();const current=await tx.get(meta);if(!current.exists())throw new Error('请先加载账号工作台。');
   const snapshot=await read(tx,current.data());
   if(snapshot.state.receipts.includes(op.operationId))return snapshot;
   if(snapshot.revision!==expectedRevision)throw new RevisionConflict(snapshot);
   const state=applyOperation(snapshot.state,op);state.receipts=[...state.receipts.slice(-99),op.operationId];
   return write(tx,state,snapshot.revision+1,current.data().chunks);
  });}catch(error){
   // Rules can reject a stale revision before the transaction precondition is checked.
   // Re-read under the same authenticated identity; never weaken the rules or overwrite.
   if((error as {code?:string}).code==='permission-denied'){
    const latest=await load();
    if(latest.state.receipts.includes(op.operationId))return latest;
    if(latest.revision!==expectedRevision)throw new RevisionConflict(latest);
   }
   throw error;
  }}
 };
}
