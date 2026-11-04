import {z} from 'zod';
import {type State,type Command,idString,dateString,workSpanSchema} from './model.ts';
import {localParts,refreshTimeProgress} from './task-investment.ts';
import {potentialWealth} from './focus-clock.ts';

// All corrections use the change in rounded recorded totals, preserving older
// task-level time that was entered before individual sessions were supported.
export function changeSession(state:State,command:Command,instant:Date){
 const {id}=z.object({id:idString}).parse(command.payload),session=state.sessions.find(x=>x.id===id);
 if(!session)throw Error('投入记录不存在。');
 const task=state.tasks.find(t=>t.id===session.taskId&&!t.deletedAt);
 if(!task)throw Error('请先恢复所属事项。');
 const total=()=>Math.round(state.sessions.filter(x=>x.taskId===task.id&&!x.deletedAt).reduce((n,x)=>n+x.seconds,0)/60);
 const before=total(),oldSeconds=session.seconds;let restoreAdjustment=0;
 const rate=session.growthRate??(oldSeconds?session.growth*3600/oldSeconds:0);
 if(command.type==='session.delete'){
  if(session.deletedAt)return;
  session.deletedAt=instant.toISOString();
  session.removedActualAdjustment=Math.max(0,before-total()-(task.actual||0));
 }else if(command.type==='session.restore'){
  if(!session.deletedAt)return;
  session.deletedAt=null;restoreAdjustment=session.removedActualAdjustment||0;delete session.removedActualAdjustment;
 }else{
  if(session.deletedAt)throw Error('请先恢复这段投入记录。');
  if(command.type==='session.move'){
   const p=z.object({id:idString,spanIndex:z.number().int().nonnegative(),startedAt:z.string().datetime()}).parse(command.payload);
   const span=session.spans?.[p.spanIndex];if(!span)throw Error('这段记录没有具体时间，请先补填。');
   const duration=Date.parse(span.endedAt)-Date.parse(span.startedAt);
   span.startedAt=p.startedAt;span.endedAt=new Date(Date.parse(p.startedAt)+duration).toISOString();
   session.spans!.sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  }else{
   const p=z.object({id:idString,date:dateString,spans:z.array(workSpanSchema).max(500),untimedSeconds:z.number().min(0).max(86400),note:z.string().max(1000)}).parse(command.payload);
   session.spans=p.spans;session.date=p.date;session.note=p.note;
   session.seconds=p.untimedSeconds+p.spans.reduce((n,b)=>n+(Date.parse(b.endedAt)-Date.parse(b.startedAt))/1000,0);
   if(session.seconds>86400)throw Error('每次投入合计不能超过 24 小时。');
  }
  let last=0;
  for(const b of session.spans||[]){const a=Date.parse(b.startedAt),z=Date.parse(b.endedAt);
   if(z<=a||a<last)throw Error('结束须晚于开始，各时间段不能重叠或倒序。');
   if(z>instant.valueOf()+60000)throw Error('实际记录不能移到未来时间。');last=z;
  }
  if(last){session.endedAt=new Date(last).toISOString();const known=(session.spans||[]).reduce((n,b)=>n+(Date.parse(b.endedAt)-Date.parse(b.startedAt))/1000,0);if(session.seconds-known<.01)session.date=localParts(last,state.settings.timezone).date;}
  if(session.date>localParts(instant.valueOf(),state.settings.timezone).date)throw Error('实际记录不能填写未来日期。');
  session.growthRate=rate;session.growth=potentialWealth(session.seconds,rate);
 }
 task.actual=Math.max(0,(task.actual||0)+total()-before-restoreAdjustment);
 refreshTimeProgress(task);
}
