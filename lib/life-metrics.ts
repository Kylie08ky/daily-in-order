import {parseMoney,type Currency} from './finance-currency.ts';
import {germanRecords,germanTarget} from './german-metrics.ts';
import {type State,offsetDate,weekday,minuteOf,finished,spent} from './model.ts';
import type {Entry,Bill,LifeTable,Sleep} from './life-schema.ts';
export const alive=<T extends {deletedAt:string|null}>(items:T[])=>items.filter(x=>!x.deletedAt);
export const refTable={german:'courses',reading:'books',fitness:'workouts'} as const;
export const euro=(cents:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export const cents=(value:string)=>parseMoney(value,'EUR');
export function activeEntries(s:State){const tasks=new Map(s.tasks.filter(t=>!t.deletedAt&&finished(t)).map(t=>[t.id,t]));return alive(s.life.entries).flatMap(e=>{if(!e.taskId)return[e];const t=tasks.get(e.taskId);return t?[{...e,date:t.date||e.date,minutes:spent(t)}]:[];});}
export function activityStats(s:State,kind:Entry['kind'],refId='',from='2000-01-01',to='2100-12-31'){
 if(kind==='german')return germanRecords(s,refId,from,to);
 const entries=activeEntries(s).filter(e=>e.kind===kind&&(!refId||e.refId===refId)&&e.date>=from&&e.date<=to),linked=new Map<string,Entry>();entries.filter(e=>e.taskId).forEach(e=>linked.set(e.taskId,e));
 const tasks=s.tasks.filter(t=>!t.deletedAt&&finished(t)&&t.activity?.kind===kind&&(!refId||t.activity.refId===refId)&&t.date>=from&&t.date<=to&&!s.life.entries.some(e=>!e.deletedAt&&e.taskId===t.id&&e.kind===kind&&(!refId||e.refId===refId)));
 const minutes=entries.filter(e=>!e.taskId).reduce((n,e)=>n+e.minutes,0)+[...linked.values()].reduce((n,e)=>n+e.minutes,0)+tasks.reduce((n,t)=>n+spent(t),0);
 const missingTasks=[...linked.keys(),...tasks.map(t=>t.id)].map(id=>s.tasks.find(t=>t.id===id)!).filter(t=>t.actual===null);
 return {entries,minutes,missing:missingTasks.length,estimated:missingTasks.reduce((n,t)=>n+t.minutes,0),units:entries.reduce((n,e)=>n+e.units,0),sessions:entries.filter(e=>!e.taskId).length+linked.size+tasks.length};
}
export function allActivityMinutes(s:State,from:string,to:string){const seen=new Set<string>();let minutes=0;for(const e of activeEntries(s).filter(e=>e.date>=from&&e.date<=to)){const key=e.taskId||e.id;if(!seen.has(key)){minutes+=e.minutes;seen.add(key);}}for(const t of s.tasks.filter(t=>!t.deletedAt&&finished(t)&&(t.activity||germanTarget(s,t))&&t.date>=from&&t.date<=to)){if(!seen.has(t.id)&&!s.life.entries.some(e=>!e.deletedAt&&e.taskId===t.id)){minutes+=spent(t);seen.add(t.id);}}return minutes;}
export function sleepHours(sleep:Sleep,timezone='Europe/Berlin'){
 const stamp=(date:string,time:string)=>{const target=Date.parse(date+'T'+time+':00Z');let result=target;for(let i=0;i<3;i++){const p=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(result)),v=(key:string)=>p.find(x=>x.type===key)!.value;result+=target-Date.parse(`${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}:00Z`);}return result;};return (stamp(sleep.date,sleep.wake)-stamp(sleep.bedDate,sleep.bed))/3600000;
}
export function habitStreak(s:State,id:string,today:string){const h=s.life.habits.find(x=>x.id===id);if(!h)return 0;let result=0,started=false;for(let d=today;d>=h.start&&result<10000;d=offsetDate(d,-1)){if(!h.days.includes(weekday(d)))continue;const done=alive(s.life.checkins).some(x=>x.habitId===id&&x.date===d&&x.value>=h.target);if(done){result++;started=true;}else if(d!==today||started)break;}return result;}
export function accountBalance(s:State,id:string,asOf='2100-12-31'){
 const a=s.life.accounts.find(x=>x.id===id);if(!a||a.opening===null||a.kind==='external'||a.asOf>asOf)return null;let balance=a.opening;
 for(const t of alive(s.life.transactions).filter(t=>t.date>=a.asOf&&t.date<=asOf)){if(t.fromId===id&&t.kind!=='income')balance-=t.cents;if(t.toId===id&&t.kind!=='expense')balance+=t.toCents??t.cents;}return balance;
}
export function monthlyFinance(s:State,month:string,currency:Currency=s.life.preferences.financeCurrency){
 const all=alive(s.life.transactions).filter(t=>t.date.startsWith(month)),destination=(id:string)=>s.life.accounts.find(a=>a.id===id)?.currency;
 const records=all.filter(t=>t.currency===currency||(['transfer','release'].includes(t.kind)&&destination(t.toId)===currency));
 const own=(id:string)=>s.life.accounts.some(a=>a.id===id&&a.kind!=='external'),expense=records.filter(t=>t.kind==='expense'&&t.currency===currency);
 const sum=(rows:typeof expense)=>rows.reduce((n,t)=>n+t.cents,0),living=sum(expense.filter(t=>t.bucket==='living')),travel=sum(expense.filter(t=>t.bucket==='travel')),self=sum(expense.filter(t=>own(t.fromId))),family=sum(expense.filter(t=>!own(t.fromId))),income=sum(records.filter(t=>t.kind==='income'&&t.currency===currency)),release=records.filter(t=>t.kind==='release'&&destination(t.toId)===currency).reduce((n,t)=>n+(t.toCents??t.cents),0);
 return {records,living,travel,self,family,income,release,expense:sum(expense),cash:income+release-self,newSavings:income-self};
}
export function billOccurrences(s:State,from:string,to:string){const result:Array<{bill:Bill;date:string;key:string;paid:boolean}>=[];for(const b of alive(s.life.bills).filter(x=>x.active)){for(let month=from.slice(0,7)+'-01';month<=to;){const [y,m]=month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate(),date=month.slice(0,7)+'-'+String(Math.min(last,b.day)).padStart(2,'0'),key=b.id+':'+date;if(date>=from&&date<=to&&date>=b.start&&(!b.end||date<=b.end))result.push({bill:b,date,key,paid:alive(s.life.transactions).some(t=>t.billKey===key)});month=offsetDate(month,last);}}return result.sort((a,b)=>a.date.localeCompare(b.date));}
export function reservedSavings(s:State,id:string){return alive(s.life.savings).reduce((n,g)=>n+g.allocations.filter(x=>x.accountId===id).reduce((a,x)=>a+x.cents,0),0);}
export function plannedCash(s:State,accountId:string,from:string,to:string){const bills=billOccurrences(s,from,to).filter(x=>x.bill.accountId===accountId&&!x.paid),balance=accountBalance(s,accountId,from),reserved=reservedSavings(s,accountId),due=bills.reduce((n,x)=>n+(x.bill.cents||0),0),unknown=bills.filter(x=>x.bill.cents===null).length;return{bills,balance,reserved,due,unknown,available:balance===null?null:balance-reserved-due,gap:balance===null?null:Math.max(0,due+reserved-balance)};}
export function bookProgress(s:State,id:string){const b=s.life.books.find(b=>b.id===id);if(!b)return{pages:0,percent:0,finished:'',started:''};const entries=activeEntries(s).filter(e=>e.kind==='reading'&&e.refId===id).sort((a,b)=>a.date.localeCompare(b.date));let pages=b.initial,finish=b.finished;for(const e of entries){pages+=e.units;if(!finish&&pages>=b.total)finish=e.date;}if(b.status==='done'||b.finished)pages=b.total;return{pages:Math.min(b.total,pages),percent:Math.min(100,Math.round(pages/b.total*100)),finished:finish,started:b.started||entries[0]?.date||''};}
