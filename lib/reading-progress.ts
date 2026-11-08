import type {State,Task} from './model.ts';
import {entrySchema,type Entry} from './life-schema.ts';

/** New records are page checkpoints; old records retain their incremental meaning. */
export function readingPositions(s:State,entries:Entry[]){
 const positions=new Map<string,{page:number;units:number}>();
 const byBook=new Map<string,Entry[]>();
 for(const entry of entries)if(entry.kind==='reading'){const group=byBook.get(entry.refId)??[];group.push(entry);byBook.set(entry.refId,group);}
 for(const book of s.life.books){
  let page=book.initial;
  for(const entry of (byBook.get(book.id)??[]).sort((a,b)=>a.date.localeCompare(b.date))){
   const next=entry.page??page+entry.units;
   positions.set(entry.id,{page:next,units:entry.page===undefined?entry.units:Math.max(0,next-page)});
   page=next;
  }
 }
 return positions;
}

export function readingBookForTask(s:State,task:Task){
 const refId=task.activity?.kind==='reading'?task.activity.refId:s.life.entries.find(e=>!e.deletedAt&&e.taskId===task.id&&e.kind==='reading')?.refId;
 return s.life.books.find(b=>b.id===refId&&!b.deletedAt);
}

/** Attach a checkpoint to the existing task; never create a second task or time session. */
export function recordTaskReadingPage(s:State,task:Task,page:number,newId:()=>string){
 const book=readingBookForTask(s,task);
 if(!book)throw Error('请先将任务关联到书籍。');
 if(!Number.isInteger(page)||page<0||page>book.total)throw Error('页码须为 0 到书籍总页数之间的整数。');
 if(s.focus?.taskId===task.id)throw Error('请先在专注页结束当前计时，再记录进度。');
 const old=s.life.entries.find(e=>!e.deletedAt&&e.taskId===task.id&&e.kind==='reading'&&e.refId===book.id);
 const entry=entrySchema.parse({...old,id:old?.id??newId(),kind:'reading',refId:book.id,taskId:task.id,date:task.date,minutes:Math.min(1440,task.actual??0),page,units:0});
 if(old)Object.assign(old,entry);else s.life.entries.push(entry);
}
