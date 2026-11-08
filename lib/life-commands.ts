import {nutritionTargets} from './nutrition.ts';
import {z} from 'zod';
import {financeBudgets,paymentCurrency} from './finance.ts';
import {type State,type Command,taskInput,businessDate,initializeDay,recommendations,validateState} from './model.ts';
import {mealSchema,expenditureSchema,nutritionProfileSchema,courseSchema,bookSchema,workoutSchema,entrySchema,habitSchema,checkinSchema,sleepSchema,bodySchema,accountSchema,transactionSchema,billSchema,savingSchema,budgetSchema,lifePreferences,type LifeTable,type Entry} from './life-schema.ts';
import {billOccurrences,refTable,alive,activityStats} from './life-metrics.ts';
const schemas={meals:mealSchema,expenditures:expenditureSchema,budgets:budgetSchema,courses:courseSchema,books:bookSchema,workouts:workoutSchema,entries:entrySchema,habits:habitSchema,checkins:checkinSchema,sleep:sleepSchema,body:bodySchema,accounts:accountSchema,transactions:transactionSchema,bills:billSchema,savings:savingSchema};
const table=z.enum(['meals','expenditures','budgets','courses','books','workouts','entries','habits','checkins','sleep','body','accounts','transactions','bills','savings']);
type RecordRow={id:string;deletedAt:string|null};
export function applyLifeCommand(input:State,command:Command,instant=new Date(),newId:()=>string=()=>crypto.randomUUID()):State{
 const s=structuredClone(input),now=instant.toISOString(),today=businessDate(s.settings,instant);
 const rows=(key:LifeTable)=>s.life[key] as RecordRow[];
 const upsert=(key:LifeTable,record:RecordRow)=>{const list=rows(key),i=list.findIndex(x=>x.id===record.id);if(i>=0){if(list[i].deletedAt)throw new Error('请先恢复记录。');list[i]=record;}else list.push(record);};
 if(command.type==='life.modules'||command.type==='life.setup'){
  const p=z.object({modules:z.array(z.enum(['german','reading','habits','fitness','finance'])).max(5),nutritionEnabled:z.boolean(),firstLogin:z.boolean().optional(),goals:lifePreferences.pick({germanWeekly:true,readingYearly:true,sleepBed:true,sleepWake:true,fitnessWeekly:true}).strict().optional()}).strict().parse(command.payload);
  if(!p.firstLogin||s.onboarding==='pending'){
   s.settings.visibleModules=[...new Set(p.modules)];s.settings.nutritionEnabled=p.nutritionEnabled&&p.modules.includes('fitness');
   if(p.goals)s.life.preferences=lifePreferences.parse({...s.life.preferences,...p.goals});
   if(p.firstLogin)s.onboarding='completed';
  }
 }else if(command.type==='life.nutrition.profile'){
  const profile=nutritionProfileSchema.parse(command.payload);
  const result=nutritionTargets(profile);
  if((profile.calories!==null||profile.protein!==null)&&result.issue)throw new Error(result.issue);
  s.life.preferences.nutrition=profile;
 }else if(command.type==='life.goals'){
  const goals=lifePreferences.pick({germanWeekly:true,readingYearly:true,sleepBed:true,sleepWake:true,fitnessWeekly:true}).strict().parse(command.payload);
  s.life.preferences=lifePreferences.parse({...s.life.preferences,...goals});
 }else if(command.type==='life.onboarding'){
  const p=z.discriminatedUnion('action',[
   z.object({action:z.literal('skip')}).strict(),
   z.object({action:z.literal('complete'),goals:lifePreferences.pick({germanWeekly:true,readingYearly:true,sleepBed:true,sleepWake:true,fitnessWeekly:true}).strict()}).strict()
  ]).parse(command.payload);
  // A retry or another device cannot reopen the guide or overwrite later preferences.
  if(s.onboarding==='pending'){
   if(p.action==='complete')s.life.preferences=lifePreferences.parse({...s.life.preferences,...p.goals});
   s.onboarding=p.action==='skip'?'skipped':'completed';
  }
 }else if(command.type==='life.course.progress'){
  const p=z.object({id:z.string(),current:z.number().int().min(0)}).parse(command.payload),c=s.life.courses.find(c=>c.id===p.id&&!c.deletedAt);
  if(!c||c.mode!=='course')throw new Error('请选择课程。');const units=activityStats(s,'german',c.id).units;
  if(p.current<units||p.current>c.total!)throw new Error('确认累计不能小于已记数量或超过课程总量。');c.initial=p.current-units;
 }else if(command.type==='life.course.movePractice'){
  const p=z.object({fromId:z.string(),toId:z.string()}).parse(command.payload),source=s.life.courses.find(c=>c.id===p.fromId&&!c.deletedAt),target=s.life.courses.find(c=>c.id===p.toId&&!c.deletedAt&&c.mode==='practice');
  if(!source||!target||source.id===target.id)throw new Error('请选择不同的课程与日常练习。');
  const ids=new Set(s.tasks.filter(t=>!t.deletedAt&&t.activity?.kind==='german'&&t.activity.refId===source.id&&!s.life.entries.some(e=>!e.deletedAt&&e.taskId===t.id&&e.kind==='german'&&e.units>0)).map(t=>t.id));
  for(const t of s.tasks)if(ids.has(t.id))t.activity={kind:'german',refId:target.id,category:target.category};
  for(const e of s.life.entries)if(!e.deletedAt&&e.kind==='german'&&e.refId===source.id&&ids.has(e.taskId)&&e.units===0)e.refId=target.id;
  for(const series of s.series)if(series.template.activity?.kind==='german'&&series.template.activity.refId===source.id)series.template.activity={kind:'german',refId:target.id,category:target.category};
 }else if(command.type==='life.preferences')s.life.preferences=lifePreferences.parse(command.payload);
 else if(command.type==='life.save'){
  const p=z.object({table,record:z.unknown()}).parse(command.payload),r=schemas[p.table].parse(p.record);r.deletedAt=null;
  if(p.table==='entries'){
   const e=r as Entry,source=s.life[refTable[e.kind]].find(x=>x.id===e.refId&&!x.deletedAt);if(!source)throw new Error('请先创建对应的课程、书籍或训练。');
   if(e.page!==undefined){if(e.kind!=='reading'||!('total' in source)||e.page>source.total!)throw Error('页码须为 0 到书籍总页数之间的整数。');e.units=0;}
   if(e.kind==='german'&&'mode' in source&&source.mode==='practice'&&e.units!==0)throw new Error('日常练习不累计课程数量。');
   const old=s.life.entries.find(x=>x.id===e.id);if(old?.taskId&&e.taskId!==old.taskId)throw new Error('已联动任务的记录请保留原关联；如需更换请删除后重建。');
   if(!e.taskId){e.taskId='activity:'+e.id;s.tasks.push({...taskInput.parse({title:e.kind==='reading'?'阅读 · '+('title' in source?source.title:''):e.kind==='german'?'学习 · '+('name' in source?source.name:''):'训练 · '+('name' in source?source.name:''),date:e.date,minutes:e.minutes,actual:e.minutes,progress:100,projectId:source.projectId,category:e.kind==='fitness'?'运动':'学习',activity:{kind:e.kind,refId:e.refId,category:e.kind==='german'&&'category' in source?source.category:'other'}}),id:e.taskId,seriesId:'',occurrence:'',createdAt:now,completedAt:now,deletedAt:null,order:s.tasks.length});}
   const t=s.tasks.find(t=>t.id===e.taskId&&!t.deletedAt);if(!t)throw new Error('关联任务不存在或已删除。');if(s.focus?.taskId===t.id)throw new Error('请先在专注页结束当前计时，再记录进度。');
   if(s.life.entries.some(x=>!x.deletedAt&&x.id!==e.id&&x.taskId===e.taskId&&x.kind===e.kind&&x.refId===e.refId))throw new Error('这次任务已有进度记录，请编辑原记录，避免重复计数。');
   t.actual=e.minutes;t.date=e.date;t.progress=100;t.completedAt=t.completedAt||now;
   if(!t.activity)t.activity={kind:e.kind,refId:e.refId,category:e.kind==='german'&&'category' in source?source.category:'other'};
   s.life.entries.filter(x=>!x.deletedAt&&x.taskId===e.taskId).forEach(x=>{x.minutes=e.minutes;x.date=e.date;});
  }
  if(['courses','books','workouts'].includes(p.table)){const value=r as {projectId?:string};if(value.projectId&&!s.projects.some(x=>x.id===value.projectId&&!x.deletedAt))throw new Error('关联项目不存在。');}
  if(p.table==='budgets'){const b=r as z.infer<typeof budgetSchema>,old=financeBudgets(s).find(x=>x.id===b.id);if(old&&old.currency!==b.currency&&(s.life.transactions.some(t=>t.bucket===b.id)||s.life.bills.some(x=>x.bucket===b.id)))throw new Error('已有流水或账单的预算不能直接更改币种，请新建预算。');}
  if(p.table==='accounts'){const a=r as z.infer<typeof accountSchema>,old=s.life.accounts.find(x=>x.id===a.id);if(old&&old.currency!==a.currency&&(old.opening!==null&&old.opening!==0||s.life.transactions.some(t=>t.fromId===a.id||t.toId===a.id)||s.life.bills.some(b=>b.accountId===a.id)||s.life.savings.some(g=>g.allocations.some(x=>x.accountId===a.id))))throw new Error('已有余额、流水或关联记录的账户不能直接改币种，请新建账户。');if(old&&old.kind!==a.kind&&(s.life.transactions.some(t=>t.fromId===a.id||t.toId===a.id)||s.life.bills.some(b=>b.accountId===a.id)))throw new Error('已有流水的账户不能改变归属类型，请新增账户。');}
  if(p.table==='transactions'){const t=r as z.infer<typeof transactionSchema>;for(const id of [t.fromId,t.toId].filter(Boolean))if(!s.life.accounts.some(a=>a.id===id&&!a.deletedAt))throw new Error('请使用未归档账户。');}
  if(p.table==='sleep'){const v=r as z.infer<typeof sleepSchema>,existing=s.life.sleep.find(x=>!x.deletedAt&&x.date===v.date);if(existing&&existing.id!==v.id)throw new Error('当晚已有记录，请编辑原记录。');}
  if(p.table==='transactions'||p.table==='bills'){const value=r as {bucket:string};if(value.bucket!=='other'&&s.life.budgets.some(b=>b.id===value.bucket&&b.deletedAt)&&!(rows(p.table).some(old=>old.id===r.id&&(old as unknown as {bucket:string}).bucket===value.bucket)))throw new Error('预算已归档，请选择其他预算。');}
  upsert(p.table,r);
 }else if(command.type==='life.remove'||command.type==='life.restore'){
  const p=z.object({table,id:z.string()}).parse(command.payload);let r=rows(p.table).find(x=>x.id===p.id);if(!r&&p.table==='budgets'){const legacy=financeBudgets(s).find(b=>b.id===p.id);if(legacy){s.life.budgets.push(legacy);r=legacy;}}if(!r)throw new Error('记录不存在。');r.deletedAt=command.type==='life.remove'?now:null;
  if(p.table==='transactions'){const expense=r as z.infer<typeof transactionSchema>;const reminder=s.tasks.find(t=>expense.billKey&&t.id==='bill:'+expense.billKey&&!t.deletedAt);if(reminder){reminder.progress=r.deletedAt?0:100;reminder.completedAt=r.deletedAt?null:now;}}
  if(p.table==='entries'){const e=r as Entry,t=s.tasks.find(x=>x.id===e.taskId);if(t?.id==='activity:'+e.id&&!s.life.entries.some(x=>x.id!==e.id&&!x.deletedAt&&x.taskId===t.id)){t.deletedAt=r.deletedAt;}}
 }else if(command.type==='life.checkin'){
  const p=z.object({habitId:z.string(),date:z.string(),value:z.number().min(0),note:z.string().optional()}).parse(command.payload),h=s.life.habits.find(x=>x.id===p.habitId&&!x.deletedAt);if(!h)throw new Error('习惯不存在。');if(p.date<h.start)throw new Error('打卡日期不能早于习惯开始日期。');const old=s.life.checkins.find(x=>x.habitId===p.habitId&&x.date===p.date);const record=checkinSchema.parse({...old,id:old?.id||newId(),...p,deletedAt:null});if(old)Object.assign(old,record);else s.life.checkins.push(record);
 }else if(command.type==='life.bill.plan'||command.type==='life.bill.pay'){
  const p=z.object({billId:z.string(),date:z.string(),paidDate:z.string().optional(),cents:z.number().int().positive().optional()}).parse(command.payload),occ=billOccurrences(s,p.date,p.date).find(x=>x.bill.id===p.billId);if(!occ)throw new Error('这一天没有对应账单。');const b=occ.bill,taskId='bill:'+occ.key;
  if(command.type==='life.bill.plan'){
   if(!s.tasks.some(t=>t.id===taskId))s.tasks.push({...taskInput.parse({title:'账单 · '+b.name,date:p.date,minutes:0,category:'生活',note:'支付后请在财务页确认入账，勾选任务本身不会扣余额。'}),id:taskId,seriesId:'',occurrence:'',createdAt:now,completedAt:null,deletedAt:null,order:s.tasks.length});
   else{const t=s.tasks.find(t=>t.id===taskId)!;t.deletedAt=null;}
  }else{
   if(occ.paid)throw new Error('这期账单已入账，不能重复扣款。');if(!s.life.accounts.some(a=>a.id===b.accountId&&!a.deletedAt))throw new Error('扣款账户已归档，请先更换账单账户或恢复账户。');const amount=p.cents??b.cents;if(!amount)throw new Error('请填写这期实际扣款金额。');
   s.life.transactions.push(transactionSchema.parse({id:newId(),date:p.paidDate||p.date,kind:'expense',currency:paymentCurrency(s,b.accountId),title:b.name,cents:amount,fromId:b.accountId,bucket:b.bucket,category:b.category,billKey:occ.key,taskId:s.tasks.some(t=>t.id===taskId)?taskId:'',note:b.currency===paymentCurrency(s,b.accountId)?'账单确认入账':`原币 ${b.foreignAmount??''} ${b.currency}；按扣款账户币种记录实际金额`}));const t=s.tasks.find(t=>t.id===taskId&&!t.deletedAt);if(t){t.progress=100;t.completedAt=now;t.actual=0;}
  }
 }else throw new Error('不支持的生活模块操作。');
 initializeDay(s,instant);if(command.type==='life.bill.plan')s.targets[today]=recommendations(s,today);return validateState(s);
}
