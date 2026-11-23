import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {learningRange,shiftLearningPeriod,isCurrentLearningPeriod} from '../lib/learning-overview.ts';

const today='2026-11-25';// a Wednesday; week 11-23 — 11-29 (Monday start)

test('stepping back shows last week and last month; stepping forward stops at the current period',()=>{
 const last=shiftLearningPeriod(today,'week',-1,today,'monday');
 assert.deepEqual(learningRange(last,'week','monday'),{from:'2026-11-16',to:'2026-11-22'});
 assert.equal(isCurrentLearningPeriod(last,'week',today,'monday'),false);
 assert.equal(shiftLearningPeriod(last,'week',1,today,'monday'),today);
 assert.equal(shiftLearningPeriod(today,'week',1,today,'monday'),today,'no future weeks');
 assert.equal(isCurrentLearningPeriod(today,'week',today,'monday'),true);
 const oct=shiftLearningPeriod(today,'month',-1,today,'monday');assert.deepEqual(learningRange(oct,'month','monday'),{from:'2026-10-01',to:'2026-10-31'});
 const jan=['2026-01-15'].map(d=>shiftLearningPeriod(d,'month',-1,today,'monday'))[0];assert.equal(jan,'2025-12-01','crosses the year');
 assert.deepEqual(learningRange(shiftLearningPeriod(today,'week',-1,today,'sunday'),'week','sunday'),{from:'2026-11-15',to:'2026-11-21'});
 assert.equal(shiftLearningPeriod(today,'all',-1,today,'monday'),today);
});

test('the period bar has ‹ › buttons, a clickable date range and a way back to the current period',()=>{
 const src=fs.readFileSync('app/learning-workspace.tsx','utf8');
 assert.ok(src.includes("onClick={()=>setDate(d=>shiftLearningPeriod(d,period,-1,today,s.settings.weekStart))}"));
 assert.ok(src.includes("disabled={current} onClick={()=>setDate(d=>shiftLearningPeriod(d,period,1,today,s.settings.weekStart))}"));
 assert.ok(src.includes('<input type="date" aria-label={ui(\'选择要查看的日期\')} value={date} max={today}'));
 assert.ok(src.includes("{!current&&<button type=\"button\" className=\"text-btn study-period-today\" onClick={()=>setDate(today)}>"));
 assert.ok(src.includes("ui(current?'本周实际时长':'该周实际时长')"));
 // One pill: arrows around a single date button that names the period ("This week", "Last week" or the month).
 assert.ok(src.includes("[['week','按周'],['month','按月'],['all','历史累计']]"));
 assert.ok(src.includes("periodName=period==='all'?'':current?ui(period==='week'?'本周':'本月'):previous?ui(period==='week'?'上周':'上月'):period==='month'?range.from.slice(0,7):''"));
 const nav=src.slice(src.indexOf('<div className="study-period-nav"'),src.indexOf('</div></div>}</div>'));
 assert.deepEqual([nav.indexOf('<ChevronLeft'),nav.indexOf('<label className="study-period-range"'),nav.indexOf('<ChevronRight')].every((v,i,a)=>v>0&&(i===0||v>a[i-1])),true);
});
