import {feedbackRoot,type DataSpace} from './data-space.ts';
import {collection,doc,getDocFromServer,getDocsFromServer,query,where,orderBy,limit,startAfter,setDoc,updateDoc,serverTimestamp,type Firestore,type QueryDocumentSnapshot} from 'firebase/firestore';
export const feedbackKinds=['出问题了','想要新功能','其他','夸夸'] as const;
export type FeedbackDraft={kind:string;content:string;contact:string;images:string[]};
export type FeedbackItem=FeedbackDraft&{id:string;ownerId:string;status:string;reply:string;createdAt:{toDate:()=>Date}|null};
export function validateFeedback(d:FeedbackDraft){
 if(!feedbackKinds.includes(d.kind as typeof feedbackKinds[number]))throw Error('请选择反馈类型。');
 if(!d.content.trim()||d.content.trim().length>2000)throw Error('请填写 1–2000 字的反馈内容。');
 if(d.contact.length>200)throw Error('联系方式不能超过 200 字。');
 if(d.images.length>3||d.images.some(x=>!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(x)||x.length>180000))throw Error('最多 3 张截图，请重新选择需要发送的图片。');
 return {...d,content:d.content.trim(),contact:d.contact.trim()};
}
export function createFeedbackStore(db:Firestore,uid:string,space:DataSpace='live'){
 const root=feedbackRoot(space);
 return {
  async isAdmin(){return (await getDocFromServer(doc(db,'feedbackAdmins',uid))).data()?.enabled===true;},
  async submit(id:string,draft:FeedbackDraft){const d=validateFeedback(draft);await setDoc(doc(db,root,id),{...d,ownerId:uid,status:'new',reply:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});},
  async list(all=false,cursor?:QueryDocumentSnapshot){const q=query(collection(db,root),...(all?[]:[where('ownerId','==',uid)]),orderBy('createdAt','desc'),...(cursor?[startAfter(cursor)]:[]),limit(20));const snap=await getDocsFromServer(q);return {items:snap.docs.map(d=>({...d.data(),id:d.id}) as FeedbackItem),cursor:snap.docs.at(-1),more:snap.size===20};},
  async respond(id:string,status:string,reply:string){if(!['new','reviewing','resolved'].includes(status)||reply.length>2000)throw Error('回复格式不正确。');await updateDoc(doc(db,root,id),{status,reply:reply.trim(),updatedAt:serverTimestamp()});}
 };
}
export type FeedbackStore=ReturnType<typeof createFeedbackStore>;
