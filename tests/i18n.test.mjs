import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {detectLanguage,setLanguage,language,locale,t,tr,subscribeLanguage} from '../lib/i18n.ts';
import {english} from '../lib/english.ts';
import {german} from '../lib/german.ts';
import {emptyState} from '../lib/model.ts';import {applyCommand} from '../lib/commands.ts';import {encodeState,decodeState} from '../lib/snapshot-codec.ts';
import {displayLearningCategory,learningCategoryValue} from '../lib/learning.ts';
test('language choice follows explicit link, saved preference, then browser language',()=>{
 assert.equal(detectLanguage('?lang=en','zh','zh-CN'),'en');assert.equal(detectLanguage('?lang=zh','en','en-US'),'zh');assert.equal(detectLanguage('?lang=invalid','zh','en-US'),'zh');assert.equal(detectLanguage('',null,'zh-TW'),'zh');assert.equal(detectLanguage('',null,'en-GB'),'en');assert.equal(detectLanguage('',null,'de-DE'),'de');
});
test('language changes notify subscribers and templates keep supplied content verbatim',()=>{
 let calls=0;const stop=subscribeLanguage(()=>calls++);setLanguage('en');assert.equal(language(),'en');assert.equal(locale(),'en-GB');assert.equal(t('新建事项'),'New task');assert.equal(tr('显示{0}模块','学习'),'Show 学习 module');assert.equal(tr('模块 {0}','{1} 学习'),'Section {1} 学习');assert.equal(t('任意的用户原文 xyz'),'任意的用户原文 xyz');assert.equal(displayLearningCategory('listening'),'Listening');assert.equal(displayLearningCategory('学习'),'学习');assert.equal(learningCategoryValue('听力'),'listening');stop();setLanguage('zh');assert.equal(calls,1);assert.equal(t('新建事项'),'新建事项');
});
test('switching languages cannot change saved records, progress, focus or currency',()=>{
 let s=emptyState();s=applyCommand(s,{type:'task.save',payload:{id:'lang-task',task:{title:'学习',note:'阅读 / Sleep & habits',category:'默认',date:'2026-11-04',minutes:120}}},new Date('2026-11-04T09:00:00Z'));
 s=applyCommand(s,{type:'focus.start',payload:{taskId:'lang-task',mode:'countup'}},new Date('2026-11-04T09:01:00Z'));const before=JSON.stringify(s);
 for(const lang of ['en','de','zh','de','en','zh']){setLanguage(lang);t('学习');tr('模块 {0}',s.tasks[0].title);assert.equal(JSON.stringify(s),before);}
 const encoded=encodeState(s);assert.deepEqual(decodeState(encoded),s);
});
test('all explicitly localized literals and interpolation slots have complete English copy',()=>{
 let count=0;for(const dir of ['app','src'])for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.tsx'))){const path=dir+'/'+f,sf=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),99,true,4);function walk(n){if(ts.isCallExpression(n)&&['ui','tr'].includes(n.expression.getText())&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const key=n.arguments[0].text;assert.ok(english[key]||english[key.trim().replace(/\s+/g,' ')],path+': '+key);count++;}ts.forEachChild(n,walk);}walk(sf);}assert.ok(count>1200);
 for(const [key,value]of Object.entries(english)){assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);}
});
test('English installed app uses same scope and identity; only presentation and entry language differ',()=>{
 const zh=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8')),en=JSON.parse(fs.readFileSync('public/manifest-en.webmanifest','utf8'));assert.equal(en.id,zh.id);assert.equal(en.scope,zh.scope);assert.equal(en.start_url,'/?lang=en');assert.equal(en.name,'Daily in Order');
});

test('German routing, catalog completeness and interpolation preserve user content',()=>{
 assert.equal(detectLanguage('?lang=de','zh','en-US'),'de');assert.equal(detectLanguage('','de','zh-CN'),'de');assert.equal(detectLanguage('',null,'de-AT'),'de');
 assert.deepEqual(Object.keys(german).sort(),Object.keys(english).sort());
 for(const [key,value]of Object.entries(german)){assert.ok(value.trim(),key);assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);}
 setLanguage('de');assert.equal(locale(),'de-DE');assert.equal(t('新建事项'),'Neue Aufgabe');assert.equal(tr('显示{0}模块','学习'),'Modul 学习 anzeigen');assert.equal(displayLearningCategory('listening'),'Hören');assert.equal(displayLearningCategory('学习'),'学习');assert.equal(t('我的课程 xyz'),'我的课程 xyz');
 assert.equal(new Intl.NumberFormat(locale(),{style:'currency',currency:'EUR'}).format(1234.5),'1.234,50\u00a0€');setLanguage('zh');
});
test('German installation keeps the same app identity with a German entry point',()=>{
 const zh=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8')),de=JSON.parse(fs.readFileSync('public/manifest-de.webmanifest','utf8'));assert.equal(de.id,zh.id);assert.equal(de.scope,zh.scope);assert.equal(de.lang,'de');assert.equal(de.start_url,'/?lang=de');
});

test('timeline filter and plan status labels passed through variables have English and German copy',async()=>{
 const {planStatusLabel}=await import('../lib/task-plans.ts');
 const source=fs.readFileSync('app/unified-timeline.tsx','utf8'),block=source.slice(source.indexOf('timeline-filters'),source.indexOf('.map(([value,label])'));
 const filters=[...block.matchAll(/\["(\w+)","([^"]+)"\]/g)].map(m=>m[2]);assert.deepEqual(filters,['全部','计划','实际','已完成','已取消']);
 const statuses=['planned','completed','cancelled','closed_with_task','partial'].flatMap(s=>[planStatusLabel(s)]);
 for(const key of new Set([...filters,...statuses,'安排不存在。'])){assert.ok(english[key],'EN '+key);assert.ok(german[key],'DE '+key);}
 setLanguage('en');assert.equal(t('已取消'),'Cancelled');setLanguage('de');assert.equal(t('已取消'),'Abgebrochen');setLanguage('zh');assert.equal(t('已取消'),'已取消');
});

test('every task-plan error has English and German copy, including the duration template',()=>{
 const source=fs.readFileSync('lib/task-plans.ts','utf8');
 const literals=[...source.matchAll(/Error\('([^']+)'\)/g)].map(m=>m[1]),templates=[...source.matchAll(/Error\('([^']+)'\+.*?\+'([^']+)'\)/g)].map(m=>m[1]+'{0}'+m[2]);
 assert.ok(literals.length>=15);assert.deepEqual([...new Set(templates)],['未做分段超出剩余计划 {0}，请调整分段。']);
 for(const key of new Set([...literals,...templates])){assert.ok(english[key],'EN '+key);assert.ok(german[key],'DE '+key);}
 setLanguage('en');assert.equal(t('未做分段超出剩余计划 1h 30m，请调整分段。'),'Unstarted segments exceed the remaining work by 1h 30m. Adjust the segments.');assert.equal(t('用户原文 2h 备注'),'用户原文 2h 备注');
 setLanguage('de');assert.equal(t('未做分段超出剩余计划 45m，请调整分段。'),'Offene Abschnitte überschreiten den Restaufwand um 45m. Bitte Abschnitte anpassen.');setLanguage('zh');
});

test('Today card breakdown is labelled Day plan and uses the day estimate; the calendar hint keeps unfinished plans only',()=>{
 const source=fs.readFileSync('app/workbench.tsx','utf8'),card=source.slice(source.indexOf("['预计投入'"),source.indexOf("['实际投入'")),hint=source.slice(source.indexOf('ui("日历占用参考")'),source.indexOf('ui("日历占用参考")')+120);
 assert.ok(card.includes('tr("当天计划 {0} · 固定 {1} ＋ 待定位 {2}"'));assert.ok(!card.includes('占用参考'));assert.ok(!card.includes('calendarOccupancy(dayPlans)'));assert.equal(card.match(/calendarOccupancy\(dayEstimate\)/g).length,4);
 assert.ok(hint.includes('calendarOccupancy(dayPlans)'));
 setLanguage('en');assert.equal(tr('当天计划 {0} · 固定 {1} ＋ 待定位 {2}','10h 7m','7h 52m','2h 15m'),'Day plan 10h 7m · Scheduled 7h 52m + Flexible 2h 15m');
 setLanguage('de');assert.equal(tr('当天计划 {0} · 固定 {1} ＋ 待定位 {2}','10h 7m','7h 52m','2h 15m'),'Tagesplan 10h 7m · Geplant 7h 52m + Flexibel 2h 15m');setLanguage('zh');
});

test('the timeline no longer shows the missing-clock notice',()=>{assert.ok(!fs.readFileSync('app/unified-timeline.tsx','utf8').includes('部分已完成事项缺少原计划钟点'));});
