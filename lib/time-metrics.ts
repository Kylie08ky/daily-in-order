import type {State,Task} from './model.ts';

export function recordedTime(tasks:Task[]){
 const completed=tasks.filter(t=>!t.deletedAt&&!t.templateOnly&&t.progress===100);
 const missing=completed.filter(t=>t.actual===null);
 return {actual:completed.reduce((n,t)=>n+(t.actual??0),0),missing,estimated:missing.reduce((n,t)=>n+t.minutes,0)};
}
const minute=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
export function calendarOccupancy(tasks:Task[]){
 const live=tasks.filter(t=>!t.deletedAt&&!t.templateOnly),intervals=live.filter(t=>t.start).map(t=>[minute(t.start),minute(t.start)+t.minutes]).sort((a,b)=>a[0]-b[0]);
 let fixed=0,end=0;for(const [a,b] of intervals){fixed+=Math.max(0,b-Math.max(end,a));end=Math.max(end,b);}
 const covered=(t:Task)=>!!t.parentId&&live.some(p=>p.id===t.parentId&&p.start&&p.date===t.date);
 const flexible=live.filter(t=>!t.start&&!covered(t)).reduce((n,t)=>n+t.minutes,0);
 return {fixed,flexible,total:fixed+flexible,effort:live.reduce((n,t)=>n+t.minutes,0),contained:live.filter(covered).length};
}
export function validateRelations(s:State){
 const live=s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly),map=new Map(s.tasks.map(t=>[t.id,t]));
 for(const t of live){
  if(!t.parentId)continue;
  const p=map.get(t.parentId);if(!p)throw new Error('关联时段不存在。');
  const seen=new Set([t.id]);let current:Task|undefined=t;
  while(current?.parentId){if(seen.has(current.parentId))throw new Error('任务包含关系不能循环。');seen.add(current.parentId);current=map.get(current.parentId);}
  if(p.deletedAt)continue;
  if(p.parentId)throw new Error('请选择独立时段作为容器，暂不支持多层包含。');
  if(!p.start||!t.date||p.date!==t.date)throw new Error('包含或并行的任务必须与关联时段在同一天；请先解除关联再单独移日。');
  if(t.minutes>p.minutes&&!t.start)throw new Error('未定位的练习不能长于关联时段。');
  if(t.start){const a=minute(t.start),b=a+t.minutes,pa=minute(p.start),pb=pa+p.minutes;
   if(t.relation==='contained'&&(a<pa||b>pb))throw new Error('子任务时间必须在关联时段内；请先调整时段或解除关联。');
   if(t.relation==='parallel'&&(a>=pb||b<=pa))throw new Error('并行任务的时间必须与关联时段重叠。');
  }
 }
 for(const series of s.series)if(series.template.parentId)throw new Error('包含关系只用于单次日程，不能写入重复模板。');
 for(const template of s.templates)if(template.task.parentId)throw new Error('常驻模板不能关联某一天的时段。');
}
export function moveRelatedChildren(s:State,before:State){
 for(const parent of s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly)){
  const old=before.tasks.find(t=>t.id===parent.id);if(!old||old.date===parent.date&&old.start===parent.start)continue;
  for(const child of s.tasks.filter(t=>!t.deletedAt&&!t.templateOnly&&t.parentId===parent.id)){
   const previous=before.tasks.find(t=>t.id===child.id);if(!previous||previous.parentId!==parent.id)continue;
   child.date=parent.date;
   if(child.start&&old.start&&parent.start){const n=minute(child.start)+minute(parent.start)-minute(old.start);if(n<0||n+child.minutes>1440)throw new Error('移动后子任务超出当天，请先调整子任务。');child.start=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  }
 }
}
