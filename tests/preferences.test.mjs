import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateState,startOfWeek} from '../lib/model.ts';
import {applyCommand} from '../lib/commands.ts';
import {csvExport,csvImport} from '../lib/files.ts';
const now=new Date('2026-11-03T12:00:00Z');
const apply=(s,type,payload)=>applyCommand(s,{type,payload},now);

test('new workspaces have no personal goals or fixed weekly availability',()=>{
 const s=emptyState();
 assert.deepEqual(s.settings.weekly,[0,0,0,0,0,0,0]);assert.equal(s.settings.dayStart,'00:00');
 assert.equal(s.life.preferences.germanWeekly,0);assert.equal(s.life.preferences.readingYearly,0);
 assert.equal(s.life.preferences.sleepBed,'');assert.equal(s.life.preferences.sleepWake,'');
 assert.equal(s.life.preferences.workoutTravel,0);assert.deepEqual(s.life.workouts,[]);
 assert.doesNotThrow(()=>validateState(s));
});
test('preferences save and round trip without changing past tasks or personal settings',()=>{
 let s=apply(emptyState(),'task.save',{id:'old',task:{title:'过去的安排',date:'2026-11-01',minutes:45}});
 s=apply(s,'life.preferences',{...s.life.preferences,germanWeekly:450,readingYearly:5,sleepBed:'08:00',sleepWake:'16:00',learningMinutes:50,readingMinutes:20,workoutMinutes:40,workoutTravel:15,fitnessWeekly:120});
 s=apply(s,'settings.save',{...s.settings,weekStart:'sunday',dayStart:'03:00',weekly:[2,3,2,3,2,0,0],focusMinutes:40,growthRate:25});
 const r=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(r.tasks[0].minutes,45);assert.equal(r.life.preferences.germanWeekly,450);assert.equal(r.life.preferences.sleepBed,'08:00');assert.equal(r.settings.growthRate,25);
 assert.equal(startOfWeek('2026-11-03',r.settings.weekStart),'2026-11-01');assert.equal(startOfWeek('2026-11-03','monday'),'2026-11-02');
 assert.throws(()=>apply(s,'life.preferences',{...s.life.preferences,workoutMinutes:0}));
 assert.throws(()=>apply(s,'life.preferences',{...s.life.preferences,sleepWake:'29:00'}));
});
test('older explicit goals survive migration while new preferences get safe defaults',()=>{
 const s=emptyState();s.schemaVersion=2;s.settings.dayStart='05:00';s.settings.weekly=[4,8,8,6,8,8,8];
 Object.assign(s.life.preferences,{germanWeekly:1200,readingYearly:12,sleepBed:'22:00',sleepWake:'05:00'});
 delete s.life.preferences.workoutMinutes;delete s.life.preferences.workoutTravel;
 const r=validateState(s);assert.equal(r.schemaVersion,8);assert.equal(r.life.preferences.germanWeekly,1200);assert.equal(r.life.preferences.sleepWake,'05:00');assert.deepEqual(r.settings.weekly,[4,8,8,6,8,8,8]);assert.equal(r.life.preferences.workoutTravel,0);
});
test('custom task categories survive scheduling, repeat templates and CSV round trip',async()=>{
 let s=apply(emptyState(),'task.save',{id:'task',task:{title:'照顾花园',category:'园艺 / 家庭',date:'2026-11-03'},repeat:{frequency:'weekly',days:[],until:'2026-11-30'}});
 assert.equal(s.tasks[0].category,'园艺 / 家庭');assert.equal(s.series[0].template.category,'园艺 / 家庭');
 const rows=await csvImport(csvExport(s,[s.tasks[0]]),s);assert.equal(rows[0].category,'园艺 / 家庭');
 assert.throws(()=>apply(s,'task.save',{id:'bad',task:{title:'无效',category:'长'.repeat(41)}}));
});
