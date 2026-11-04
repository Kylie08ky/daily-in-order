import type {NutritionProfile,Life} from './life-schema.ts';
// Mifflin–St Jeor resting-energy estimate; activity factors are approximate.
// Exercise logs are deliberately NOT added to the daily food allowance.
export function nutritionTargets(p:NutritionProfile){
 const blocked=(issue:string)=>({issue,maintenance:null,calories:null,protein:null,proteinLow:null,proteinHigh:null,deficit:0});
 if(!p.eligible)return blocked('自动估算仅供健康成年人参考。未满 18 岁、孕期或哺乳期、有饮食失调经历、肾病或需医疗营养管理时，请使用记录功能，并由专业人员制定目标。');
 if(p.age===null||p.height===null||p.weight===null)return blocked('填写年龄、身高和当前体重后显示参考目标。');
 if(p.age<18||p.age>80)return blocked('当前年龄不适用本工具的自动估算，可继续记录饮食。');
 const bmi=p.weight/(p.height/100)**2;
 if(bmi<18.5||bmi>=40)return blocked('当前体重范围不适用本工具的自动热量目标，请由专业人员评估；仍可记录饮食。');
 if(p.goal==='fatloss'){
  if(p.targetWeight===null)return blocked('请填写目标体重。');
  if(p.targetWeight>=p.weight)return blocked('减脂目标体重需低于当前体重；否则可选择维持体重。');
  if(p.targetWeight/(p.height/100)**2<18.5)return blocked('目标体重偏低，不生成减脂热量建议，请调整目标或咨询专业人员。');
 }
 const resting=10*p.weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161);
 const maintenance=Math.round(resting*({low:1.2,light:1.375,moderate:1.55,high:1.725}[p.activity]));
 const floor=Math.max(Math.ceil(resting),p.sex==='male'?1500:1200);
 const estimated=p.goal==='fatloss'?Math.max(floor,Math.round(maintenance-Math.min(300,maintenance*.15))):maintenance;
 if(p.calories!==null&&(p.calories<floor||p.calories>maintenance*1.3))return blocked('自定热量超出本工具的保守参考范围，请调整或由专业人员指导。');
 if(p.goal==='fatloss'&&p.calories!==null&&p.calories>=maintenance)return blocked('该热量未形成估算缺口，请选择维持体重或调低至参考范围内。');
 const active=p.goal==='training'||p.goal==='fatloss'||p.activity==='moderate'||p.activity==='high';
 const proteinLow=Math.round(p.weight*(active?1.2:.8)),proteinHigh=Math.round(p.weight*(active?2:1.2));
 if(p.protein!==null&&(p.protein<proteinLow||p.protein>proteinHigh))return blocked('自定蛋白质不在当前参考范围内，请调整或咨询专业人员。');
 const calories=p.calories??estimated;
 return {issue:'',maintenance,calories,protein:p.protein??Math.round(p.weight*(active?1.6:1)),proteinLow,proteinHigh,deficit:Math.max(0,maintenance-calories)};
}
export function dailyNutrition(life:Life,date:string){
 const meals=life.meals.filter(x=>!x.deletedAt&&x.date===date),exercise=life.expenditures.filter(x=>!x.deletedAt&&x.date===date);
 return {meals,exercise,calories:Math.round(meals.reduce((n,m)=>n+m.calories,0)),protein:Math.round(meals.reduce((n,m)=>n+m.protein,0)*10)/10,burned:Math.round(exercise.reduce((n,m)=>n+m.calories,0))};
}
