import {financeBudgets} from './finance.ts';
import type {State} from './model.ts';
import type {LifeTable,Transaction} from './life-schema.ts';
export function validateLife(s:State){
 const l=s.life;
 const wereadIds=l.books.flatMap(b=>b.weread?[b.weread.bookId]:[]);if(new Set(wereadIds).size!==wereadIds.length)throw Error('同一本微信读书书籍不能重复关联。');
 for(const [key,items] of Object.entries(l)){if(key==='preferences')continue;const a=items as {id:string}[];if(new Set(a.map(x=>x.id)).size!==a.length)throw new Error('模块内存在重复记录 ID。');}
 const has=(table:LifeTable,id:string)=> (l[table] as {id:string}[]).some(x=>x.id===id);
 const refs={german:'courses',reading:'books',fitness:'workouts'} as const;
 for(const t of s.tasks)if(t.activity&&!has(refs[t.activity.kind],t.activity.refId))throw new Error('事项关联的学习、书籍或训练计划不存在。');
 const entryKeys=l.entries.filter(e=>!e.deletedAt&&e.taskId).map(e=>[e.taskId,e.sessionId||'',e.kind,e.refId].join('|'));if(new Set(entryKeys).size!==entryKeys.length)throw new Error('同一任务的同一活动存在重复记录。');
 for(const e of l.entries)if(e.timeRefId&&(e.kind!=='german'||!has('courses',e.timeRefId)))throw Error('学习时长归属不存在。');
 for(const e of l.entries){if(e.sessionId&&!s.sessions.some(x=>x.id===e.sessionId&&x.taskId===e.taskId))throw Error('进度关联的投入不存在。');if(e.startPage!==undefined&&(e.page===undefined||e.startPage>e.page))throw Error('起始页不能大于读到的页码。');if(!has(refs[e.kind],e.refId))throw new Error('执行记录的所属内容不存在。');if(e.taskId&&!s.tasks.some(t=>t.id===e.taskId))throw new Error('执行记录关联任务不存在。');}
 for(const e of l.entries)if(e.page!==undefined&&(e.kind!=='reading'||e.page>(l.books.find(b=>b.id===e.refId)?.total??100000)))throw new Error('页码须为 0 到书籍总页数之间的整数。');
 for(const b of l.books){if(b.total!==null&&b.initial>b.total)throw new Error('初始阅读页数不能超过总页数。');if(b.started&&b.finished&&b.finished<b.started)throw new Error('读完日期不能早于开始日期。');}
 for(const c of l.courses){
  if(c.mode==='course'&&(c.total===null||c.initial>c.total))throw new Error('课程需要总量，初始进度不能超过总量。');
  if(c.mode==='practice'&&(c.total!==null||c.initial!==0))throw new Error('日常练习只记录用时，不设置数量进度。');
  if(c.mode==='practice'&&l.entries.some(e=>e.kind==='german'&&e.refId===c.id&&e.units>0))throw new Error('已有数量记录的课程不能改为日常练习，请新建练习并分离关联。');
  if(c.moduleIds.some(id=>!s.modules.some(m=>m.id===id&&m.projectId===c.projectId)))throw new Error('映射模块必须属于关联项目。');
 }
 const mapped=l.courses.filter(c=>!c.deletedAt);for(const c of mapped)for(const other of mapped.filter(x=>x.id!==c.id&&x.projectId===c.projectId)){
  if(c.includeProject&&other.includeProject||c.moduleIds.some(id=>other.moduleIds.includes(id)))throw new Error('同一项目或模块只能映射一次，请先取消原映射。');
 }
 for(const h of l.checkins)if(!has('habits',h.habitId))throw new Error('打卡所属习惯不存在。');
 const checkKeys=l.checkins.filter(x=>!x.deletedAt).map(x=>x.habitId+x.date);if(new Set(checkKeys).size!==checkKeys.length)throw new Error('同一习惯同一天只能有一条打卡。');
 for(const table of ['sleep','body'] as const){const dates=l[table].filter(x=>!x.deletedAt).map(x=>x.date);if(new Set(dates).size!==dates.length)throw new Error('同一天已有记录，请编辑原记录。');}
 for(const sleep of l.sleep){const min=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3)),hours=(Date.parse(sleep.date)-Date.parse(sleep.bedDate))/3600000+(min(sleep.wake)-min(sleep.bed))/60;if(hours<=0||hours>24)throw new Error('睡眠结束应晚于入睡，且不超过 24 小时。');}
 const account=(id:string)=>l.accounts.find(x=>x.id===id);
 const budgets=[...financeBudgets(s),...l.budgets.filter(b=>b.deletedAt)];
 const validateBudget=(bucket:string,currency:string)=>{if(bucket==='other')return;const b=budgets.find(b=>b.id===bucket);if(!b)throw new Error('预算不存在，请重新选择。');if(b.currency!==currency)throw new Error('预算币种必须与支出账户币种一致。');};
 for(const t of l.transactions){validateTransaction(t,account);if(t.kind==='expense')validateBudget(t.bucket,t.currency);if(t.taskId&&!s.tasks.some(x=>x.id===t.taskId))throw new Error('关联日程不存在。');if(t.projectId&&!s.projects.some(x=>x.id===t.projectId))throw new Error('关联项目不存在。');}
 const billKeys=l.transactions.filter(t=>!t.deletedAt&&t.billKey).map(t=>t.billKey);if(new Set(billKeys).size!==billKeys.length)throw new Error('这期账单已经入账。');
 for(const b of l.bills){validateBudget(b.bucket,account(b.accountId)?.currency||'EUR');if(!has('accounts',b.accountId))throw new Error('账单账户不存在。');if(account(b.accountId)?.kind==='blocked')throw new Error('冻结本金不能作为账单扣款账户。');if(b.end&&b.end<b.start)throw new Error('账单结束不能早于开始。');}
 for(const saving of l.savings)if(new Set(saving.allocations.map(a=>a.accountId)).size!==saving.allocations.length)throw new Error('同一储蓄目标不能重复分配到同一账户。');
 for(const saving of l.savings)for(const a of saving.allocations){if(!account(a.accountId)||account(a.accountId)?.kind==='external')throw new Error('储蓄只能分配到自己的账户。');if(account(a.accountId)?.currency!==saving.currency)throw new Error('储蓄预留只能使用同币种账户，不能混合相加。');}
}
export function validateTransaction(t:Transaction,account:(id:string)=>{kind:string;currency:string}|undefined){
 const from=account(t.fromId),to=account(t.toId);
 const source=t.kind==='income'?to:from;
 if(source&&t.currency!==source.currency)throw new Error('流水币种必须与收支账户币种一致。');
 if(t.kind==='transfer'||t.kind==='release'){
  if(from&&to&&from.currency!==to.currency&&(t.toCents===null||t.toCents<=0))throw new Error('跨币种转账需要填写实际到账金额。');
  if(from&&to&&from.currency===to.currency&&t.toCents!==null&&t.toCents!==t.cents)throw new Error('同币种转账金额应一致，手续费请单独记为支出。');
 }else if(t.toCents!==null)throw new Error('仅转账或资金解冻可以填写到账金额。');
 if(t.kind==='expense'){if(!from||from.kind==='blocked')throw new Error('消费请选择个人支付账户或外部代付。');}
 if(t.kind==='income'&&(!to||to.kind!=='personal'))throw new Error('收入请选择自己的收款账户。');
 if(t.kind==='transfer'&&(!from||!to||from.kind==='external'||to.kind==='external'||t.fromId===t.toId))throw new Error('转账必须在两个不同的本人账户间。');
 if(t.kind==='release'&&(!from||from.kind!=='blocked'||!to||to.kind!=='personal'))throw new Error('资金解冻必须从冻结资金转入本人可用账户。');
}
