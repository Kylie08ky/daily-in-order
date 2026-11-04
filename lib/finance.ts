import type {State} from './model.ts';
import type {Budget} from './life-schema.ts';
import type {Currency} from './finance-currency.ts';
export function financeBudgets(s:State):Budget[]{
 const budgets=[...s.life.budgets];
 for(const [id,name,limit] of [['living','生活预算',s.life.preferences.monthlyLiving],['travel','旅行预算',s.life.preferences.monthlyTravel]] as const){
  if(!budgets.some(b=>b.id===id)&&(limit!==null||s.life.transactions.some(t=>t.bucket===id)||s.life.bills.some(b=>b.bucket===id)))budgets.push({id,name,currency:'EUR',limit,deletedAt:null});
 }
 return budgets.filter(b=>!b.deletedAt);
}
export function budgetSummary(s:State,month:string,currency:Currency=s.life.preferences.financeCurrency){
 const expenses=s.life.transactions.filter(t=>!t.deletedAt&&t.kind==='expense'&&t.currency===currency&&t.date.startsWith(month));
 const rows=financeBudgets(s).filter(b=>b.currency===currency).map(b=>({...b,spent:expenses.filter(t=>t.bucket===b.id).reduce((n,t)=>n+t.cents,0)}));
 const configured=rows.filter(b=>b.limit!==null),ids=new Set(configured.map(b=>b.id));
 return {rows,limit:configured.length?configured.reduce((n,b)=>n+b.limit!,0):null,spent:configured.reduce((n,b)=>n+b.spent,0),unbudgeted:expenses.filter(t=>!ids.has(t.bucket)).reduce((n,t)=>n+t.cents,0)};
}
export const paymentCurrency=(s:State,accountId:string)=>s.life.accounts.find(a=>a.id===accountId)?.currency||s.life.preferences.financeCurrency;
