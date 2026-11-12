import {progressRecordOrder} from './progress-records.ts';
import type {State,Task} from './model.ts';
import {entrySchema,type Entry} from './life-schema.ts';

/** New records are page checkpoints; old records retain their incremental meaning. */
export function readingPositions(_s:State,entries:Entry[]){
 const positions=new Map<string,{page:number|undefined;units:number}>();
 for(const e of entries)if(e.kind==='reading')positions.set(e.id,{page:e.page,units:e.page===undefined?e.units:e.startPage===undefined?0:Math.max(0,e.page-e.startPage)});
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
 if(!Number.isInteger(page)||page<0||page>(book.total??100000))throw Error('页码须为 0 到书籍总页数之间的整数。');
 if(s.focus?.taskId===task.id)throw Error('请先在专注页结束当前计时，再记录进度。');
 const old=s.life.entries.filter(e=>!e.deletedAt&&e.taskId===task.id&&e.kind==='reading'&&e.refId===book.id).sort((a,b)=>progressRecordOrder(s,b,a))[0];
 const entry=entrySchema.parse({...old,id:old?.id??newId(),kind:'reading',refId:book.id,taskId:task.id,date:old?.progressOnly?old.date:task.date,minutes:old?.progressOnly?old.minutes:Math.min(1440,task.actual??0),page,units:0});
 if(old)Object.assign(old,entry);else s.life.entries.push(entry);
}
