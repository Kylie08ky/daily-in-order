import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {accountBalance,monthlyFinance,plannedCash} from '../lib/life-metrics.ts';
import {budgetSummary,financeBudgets} from '../lib/finance.ts';
import {parseMoney,moneyInput,formatMoney} from '../lib/finance-currency.ts';
const now=new Date('2026-11-03T12:00:00Z'),apply=(s,type,payload)=>applyCommand(s,{type,payload},now),save=(s,table,record)=>apply(s,'life.save',{table,record});
const acc=(s,id,currency,opening=100000,kind='personal')=>save(s,'accounts',{id,name:id,currency,opening,kind,asOf:'2026-11-01'});
const tx=(s,id,record)=>save(s,'transactions',{id,title:id,date:'2026-11-03',bucket:'other',...record});
const base=()=>acc(acc(emptyState(),'cny','CNY'),'usd','USD',20000);
test('cross-currency transfers use actual debit and credit amounts without inventing income',()=>{
 let s=tx(base(),'exchange',{kind:'transfer',fromId:'cny',toId:'usd',currency:'CNY',cents:70000,toCents:9800});
 assert.equal(accountBalance(s,'cny'),30000);assert.equal(accountBalance(s,'usd'),29800);
 for(const c of ['CNY','USD']){const m=monthlyFinance(s,'2026-11',c);assert.equal(m.records.length,1);assert.equal(m.income,0);assert.equal(m.expense,0);assert.equal(m.newSavings,0);}
 assert.throws(()=>tx(base(),'missing',{kind:'transfer',fromId:'cny',toId:'usd',currency:'CNY',cents:10000}),/实际到账/);
 assert.throws(()=>tx(base(),'wrong',{kind:'expense',fromId:'cny',currency:'USD',cents:100}),/流水币种/);
 s=apply(s,'life.remove',{table:'transactions',id:'exchange'});assert.equal(accountBalance(s,'cny'),100000);assert.equal(accountBalance(s,'usd'),20000);
 s=apply(s,'life.restore',{table:'transactions',id:'exchange'});assert.equal(accountBalance(s,'usd'),29800);
});
test('income, budgets and external payment stay in their own currency',()=>{
 let s=acc(base(),'other-pay','CNY',null,'external');
 s=save(s,'budgets',{id:'food',name:'餐饮',currency:'CNY',limit:50000});s=save(s,'budgets',{id:'tools',name:'软件',currency:'USD',limit:3000});
 s=tx(s,'food-pay',{kind:'expense',fromId:'cny',currency:'CNY',cents:12000,bucket:'food'});
 s=tx(s,'gift-pay',{kind:'expense',fromId:'other-pay',currency:'CNY',cents:5000,bucket:'food'});
 s=tx(s,'tools-pay',{kind:'expense',fromId:'usd',currency:'USD',cents:1000,bucket:'tools'});
 s=tx(s,'income',{kind:'income',toId:'usd',currency:'USD',cents:3000});
 assert.equal(budgetSummary(s,'2026-11','CNY').spent,17000);assert.equal(budgetSummary(s,'2026-11','USD').spent,1000);
 assert.equal(monthlyFinance(s,'2026-11','CNY').family,5000);assert.equal(monthlyFinance(s,'2026-11','USD').income,3000);
 assert.equal(accountBalance(s,'cny'),88000);assert.equal(accountBalance(s,'usd'),22000);assert.equal(accountBalance(s,'other-pay'),null);
 assert.throws(()=>tx(s,'bad-budget',{kind:'expense',fromId:'cny',currency:'CNY',cents:100,bucket:'tools'}),/预算币种/);
 const changed=apply(s,'life.preferences',{...s.life.preferences,financeCurrency:'CNY'});assert.equal(monthlyFinance(changed,'2026-11').expense,17000);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(changed))),changed);
});
test('zero, unset and archived budgets preserve distinct meanings and history',()=>{
 let s=save(base(),'budgets',{id:'zero',name:'暂不花费',currency:'CNY',limit:0});s=save(s,'budgets',{id:'track',name:'仅跟踪',currency:'CNY',limit:null});
 s=tx(s,'z',{kind:'expense',fromId:'cny',currency:'CNY',cents:100,bucket:'zero'});s=tx(s,'t',{kind:'expense',fromId:'cny',currency:'CNY',cents:200,bucket:'track'});
 assert.equal(budgetSummary(s,'2026-11','CNY').limit,0);assert.equal(budgetSummary(s,'2026-11','CNY').spent,100);assert.equal(budgetSummary(s,'2026-11','CNY').unbudgeted,200);
 s=apply(s,'life.remove',{table:'budgets',id:'zero'});assert.equal(monthlyFinance(s,'2026-11','CNY').expense,300);assert.equal(budgetSummary(s,'2026-11','CNY').limit,null);
 assert.throws(()=>tx(s,'bad',{kind:'expense',fromId:'cny',currency:'CNY',cents:100,bucket:'zero'}),/预算已归档/);
});
test('currency relabeling cannot silently rewrite existing balances or budget history',()=>{
 const s=base();assert.throws(()=>save(s,'accounts',{...s.life.accounts[0],currency:'USD'}),/不能直接改币种/);
 let b=save(s,'budgets',{id:'budget',name:'开销',currency:'CNY',limit:1000});b=tx(b,'spent',{kind:'expense',fromId:'cny',currency:'CNY',cents:100,bucket:'budget'});
 assert.throws(()=>save(b,'budgets',{...b.life.budgets[0],currency:'USD'}),/不能直接更改币种/);
});
test('bills and savings use account minor units and reject mixed-currency allocations',()=>{
 let s=acc(base(),'jpy','JPY',10000);s=save(s,'budgets',{id:'jp',name:'日元订阅',currency:'JPY',limit:1000});
 s=save(s,'bills',{id:'bill',name:'订阅',accountId:'jpy',currency:'USD',foreignAmount:2,cents:300,day:3,start:'2026-11-01',bucket:'jp'});
 s=save(s,'savings',{id:'reserve',name:'日元储蓄',currency:'JPY',target:5000,allocations:[{accountId:'jpy',cents:2000}]});
 assert.equal(plannedCash(s,'jpy','2026-11-01','2026-11-30').available,7700);
 assert.throws(()=>save(s,'savings',{id:'bad',name:'混合',currency:'JPY',target:1000,allocations:[{accountId:'cny',cents:100}]}),/同币种/);
 s=apply(s,'life.bill.pay',{billId:'bill',date:'2026-11-03'});assert.equal(accountBalance(s,'jpy'),9700);assert.equal(budgetSummary(s,'2026-11','JPY').spent,300);assert.equal(s.life.transactions[0].currency,'JPY');assert.equal(monthlyFinance(s,'2026-11','USD').expense,0);
});
test('released funds use destination currency and remain separate from new income',()=>{
 let s=acc(base(),'locked','CNY',100000,'blocked');s=tx(s,'release',{kind:'release',fromId:'locked',toId:'usd',currency:'CNY',cents:70000,toCents:10000});
 assert.equal(monthlyFinance(s,'2026-11','USD').release,10000);assert.equal(monthlyFinance(s,'2026-11','USD').newSavings,0);assert.equal(monthlyFinance(s,'2026-11','CNY').release,0);assert.equal(accountBalance(s,'locked'),30000);
});
test('currency precision supports 0, 2 and 3 decimal minor units without rounding input',()=>{
 assert.equal(parseMoney('12.34','CNY'),1234);assert.equal(parseMoney('1200','JPY'),1200);assert.equal(parseMoney('1.234','KWD'),1234);
 assert.equal(moneyInput(1234,'KWD'),'1.234');assert.match(formatMoney(1200,'JPY'),/JPY/);
 assert.throws(()=>parseMoney('1.5','JPY'));assert.throws(()=>parseMoney('1.234','USD'));assert.throws(()=>parseMoney('-5','CNY'));assert.throws(()=>parseMoney('1e4','USD'));
});
test('legacy euro backups preserve amounts and legacy budgets while new users start blank',()=>{
 let s=emptyState();s.schemaVersion=1;delete s.life.budgets;delete s.life.preferences.financeCurrency;s.life.preferences.monthlyLiving=50000;
 s.life.accounts=[{id:'old',name:'旧账户',kind:'personal',opening:10000,asOf:'2026-11-01'}];
 s.life.transactions=[{id:'old-t',title:'旧支出',date:'2026-11-03',kind:'expense',fromId:'old',cents:1000,bucket:'living'}];
 s=validateState(s);assert.equal(s.schemaVersion,13);assert.equal(s.life.accounts[0].currency,'EUR');assert.equal(accountBalance(s,'old'),9000);assert.equal(budgetSummary(s,'2026-11','EUR').limit,50000);assert.equal(budgetSummary(s,'2026-11','EUR').spent,1000);
 assert.equal(financeBudgets(emptyState()).length,0);assert.equal(emptyState().life.accounts.length,0);
});
