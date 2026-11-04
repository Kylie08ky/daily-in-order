import {locale} from './i18n.ts';
import {z} from 'zod';
export const currencies=['CNY','EUR','USD','GBP','JPY','HKD','SGD','CHF','CAD','AUD','KRW','TWD','KWD'] as const;
export type Currency=typeof currencies[number];
export const currencySchema=z.enum(currencies);
export const currencyNames:Record<Currency,string>={CNY:'人民币',EUR:'欧元',USD:'美元',GBP:'英镑',JPY:'日元',HKD:'港币',SGD:'新加坡元',CHF:'瑞士法郎',CAD:'加拿大元',AUD:'澳大利亚元',KRW:'韩元',TWD:'新台币',KWD:'科威特第纳尔'};
export const currencyDigits=(currency:Currency)=>new Intl.NumberFormat('zh-CN',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
export const currencyScale=(currency:Currency)=>10**currencyDigits(currency);
export const formatMoney=(minor:number,currency:Currency)=>new Intl.NumberFormat(locale(),{style:'currency',currency,currencyDisplay:'code'}).format(minor/currencyScale(currency));
export const moneyInput=(minor:number|null|undefined,currency:Currency)=>minor==null?'':(minor/currencyScale(currency)).toFixed(currencyDigits(currency));
export function parseMoney(value:string,currency:Currency='EUR'){
 const input=value.trim().replace(',','.');const digits=currencyDigits(currency);
 if(!/^\d+(?:\.\d+)?$/.test(input)||(input.split('.')[1]?.length||0)>digits)throw new Error(currency+' 金额'+(digits?'最多支持 '+digits+' 位小数。':'请填写整数。'));
 const [whole,fraction='']=input.split('.');const amount=Number(whole)*currencyScale(currency)+Number(fraction.padEnd(digits,'0'));
 if(!Number.isSafeInteger(amount)||amount>1000000000)throw new Error('金额超出可记录范围。');return amount;
}
