import {z} from 'zod';

export const monthKey=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const dayKey=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/);
const minutes=z.number().int().min(0).max(44640);
export const monthlyGoalSchema=z.object({
 projectId:z.string().min(1).max(100),minutes:minutes.refine(v=>v>0),
 outcome:z.string().trim().max(300).default(''),weeks:z.record(dayKey,minutes)
});
export const monthlyPlanSchema=z.object({month:monthKey,weekStart:z.enum(['monday','sunday']),goals:z.array(monthlyGoalSchema).max(500)});
export type MonthlyGoal=z.infer<typeof monthlyGoalSchema>;
export type MonthlyPlan=z.infer<typeof monthlyPlanSchema>;

const offset=(date:string,n:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export function monthWeeks(month:string,weekStart:MonthlyPlan['weekStart']='monday'){
 monthKey.parse(month);
 const first=month+'-01',last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0,12)).toISOString().slice(0,10);
 const day=new Date(first+'T12:00:00Z').getUTCDay(),back=(day+(weekStart==='monday'?6:0))%7;
 const weeks=[];
 for(let key=offset(first,-back);key<=last;key=offset(key,7)){
  const from=key<first?first:key,end=offset(key,6),to=end>last?last:end;
  weeks.push({key,from,to,days:Math.round((Date.parse(to)-Date.parse(from))/86400000)+1});
 }
 return weeks;
}
/** Largest-remainder apportionment: whole minutes, exact total, proportional to in-month days. */
export function distributeMonth(minutes:number,weeks:ReturnType<typeof monthWeeks>){
 if(!Number.isInteger(minutes)||minutes<0||minutes>44640)throw Error('月度目标时长无效。');
 const days=weeks.reduce((n,w)=>n+w.days,0);
 const parts=weeks.map((w,i)=>({key:w.key,i,value:Math.floor(minutes*w.days/days),fraction:minutes*w.days/days%1}));
 let left=minutes-parts.reduce((n,p)=>n+p.value,0);
 for(const p of parts.slice().sort((a,b)=>b.fraction-a.fraction||a.i-b.i)){if(left-->0)p.value++;}
 return Object.fromEntries(parts.map(p=>[p.key,p.value]));
}
export function assertMonthlyPlan(plan:MonthlyPlan){
 const weeks=monthWeeks(plan.month,plan.weekStart),valid=new Set(weeks.map(w=>w.key));
 if(new Set(plan.goals.map(g=>g.projectId)).size!==plan.goals.length)throw Error('同一个项目每月只能添加一次。');
 for(const goal of plan.goals){
  if(goal.minutes>weeks.reduce((n,w)=>n+w.days*1440,0)||weeks.some(w=>(goal.weeks[w.key]??0)>w.days*1440))throw Error('目标时长超过该时段的总时长。');
  if(Object.keys(goal.weeks).some(key=>!valid.has(key)))throw Error('周分配不属于这个月份。');
  if(Object.values(goal.weeks).reduce((a,b)=>a+b,0)>goal.minutes)throw Error('每周分配合计不能超过月度目标。');
 }
}
