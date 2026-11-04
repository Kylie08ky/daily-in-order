import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
import {emptyState,validateState} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {nutritionProfileSchema} from '../lib/life-schema.ts';
import {nutritionTargets,dailyNutrition} from '../lib/nutrition.ts';
const profile=nutritionProfileSchema.parse({eligible:true,age:30,sex:'female',height:165,weight:65,targetWeight:60,activity:'light',goal:'fatloss'});
const apply=(s,type,payload)=>applyCommand(s,{type,payload},new Date('2026-11-04T12:00:00Z'));
test('nutrition estimates adult targets with modest deficit and correct protein units',()=>{
 const t=nutritionTargets(profile);assert.equal(t.maintenance,1884);assert.equal(t.calories,1601);assert.equal(t.protein,104);assert.equal(t.proteinLow,78);assert.equal(t.proteinHigh,130);
 const m=nutritionTargets({...profile,sex:'male',goal:'training'});assert.equal(m.calories,2112);assert.equal(m.deficit,0);
 assert.equal(nutritionTargets({...profile,calories:1650,protein:110}).calories,1650);
});
test('unsafe or incomplete estimates remain logging-only and reject inappropriate overrides',()=>{
 for(const patch of [{eligible:false},{age:17},{age:81},{height:null},{targetWeight:40},{weight:45},{targetWeight:70},{calories:800},{protein:400}])assert.notEqual(nutritionTargets({...profile,...patch}).issue,'');
 assert.throws(()=>apply(emptyState(),'life.nutrition.profile',{...profile,calories:800}));
 assert.throws(()=>apply(emptyState(),'life.nutrition.profile',{...profile,protein:400}));
 assert.equal(apply(emptyState(),'life.nutrition.profile',{...profile,eligible:false}).life.preferences.nutrition.eligible,false);
});
test('meal edits, dates, deletion and restoration recompute totals without changing calorie target',()=>{
 let s=apply(emptyState(),'life.nutrition.profile',profile);
 const save=(table,record)=>{s=apply(s,'life.save',{table,record});};
 save('meals',{id:'m',date:'2026-11-04',meal:'breakfast',name:'早餐',calories:400,protein:25});
 save('meals',{id:'l',date:'2026-11-04',meal:'lunch',name:'午餐',calories:600,protein:35});
 save('meals',{id:'old',date:'2026-11-03',meal:'dinner',name:'昨天',calories:500,protein:30});
 save('expenditures',{id:'e',date:'2026-11-04',name:'散步',calories:150});
 let d=dailyNutrition(s.life,'2026-11-04');assert.equal(d.calories,1000);assert.equal(d.protein,60);assert.equal(d.burned,150);assert.equal(nutritionTargets(s.life.preferences.nutrition).calories,1601);
 save('meals',{...s.life.meals[0],calories:450,protein:28.5});assert.equal(dailyNutrition(s.life,'2026-11-04').protein,63.5);
 s=apply(s,'life.remove',{table:'meals',id:'m'});assert.equal(dailyNutrition(s.life,'2026-11-04').calories,600);
 s=apply(s,'life.restore',{table:'meals',id:'m'});assert.equal(dailyNutrition(s.life,'2026-11-04').calories,1050);
 s=apply(s,'life.remove',{table:'expenditures',id:'e'});assert.equal(dailyNutrition(s.life,'2026-11-04').burned,0);
 const r=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(r.life,s.life);assert.deepEqual(decodeState(encodeState(s)).life,s.life);assert.equal(r.schemaVersion,7);
 assert.throws(()=>save('meals',{id:'bad',date:'2026-11-04',meal:'breakfast',name:'错误',calories:-1,protein:2}));
});
test('new users start with no optional modules, setup persists once, visibility never deletes data',()=>{
 let s=emptyState();assert.deepEqual(s.settings.visibleModules,[]);assert.equal(s.settings.nutritionEnabled,false);
 s=apply(s,'life.setup',{modules:['fitness'],nutritionEnabled:true,firstLogin:true});assert.equal(s.onboarding,'completed');assert.deepEqual(s.settings.visibleModules,['fitness']);
 s=apply(s,'life.setup',{modules:['finance'],nutritionEnabled:false,firstLogin:true});assert.deepEqual(s.settings.visibleModules,['fitness']);
 s=apply(s,'life.nutrition.profile',profile);
 s=apply(s,'life.modules',{modules:[],nutritionEnabled:true});assert.equal(s.settings.nutritionEnabled,false);assert.deepEqual(s.life.preferences.nutrition,profile);
 s=apply(s,'life.modules',{modules:['fitness'],nutritionEnabled:true});assert.equal(s.settings.nutritionEnabled,true);
 const old=JSON.parse(JSON.stringify(s));old.schemaVersion=6;delete old.settings.visibleModules;delete old.settings.nutritionEnabled;delete old.life.meals;delete old.life.expenditures;delete old.life.preferences.nutrition;
 const r=validateState(old);assert.equal(r.settings.visibleModules,undefined);assert.equal(r.settings.nutritionEnabled,false);assert.deepEqual(r.life.meals,[]);
});
