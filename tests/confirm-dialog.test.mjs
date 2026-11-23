import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Embedded browsers (e.g. the Claude desktop built-in browser) may block window.confirm() by returning false,
// which silently cancelled the sync-conflict and local-copy actions. They must use the in-app dialog instead.
const status=fs.readFileSync('app/app-status.tsx','utf8'),dialog=fs.readFileSync('app/confirm-dialog.tsx','utf8');

test('account and sync actions never call window.confirm()',()=>{
 assert.doesNotMatch(status,/(^|[^.\w])confirm\(/);assert.doesNotMatch(status,/window\.confirm/);
 assert.match(status,/<ConfirmDialog request=\{asking\} onClose=\{\(\)=>setAsking\(null\)\}\/>/);
});

test('each guarded action runs only through the in-app dialog with its own label and effect',()=>{
 const cases=[['保留本机修改并同步','w.resolve(true)'],['采用云端记录','w.resolve(false)'],['清除本机副本','w.clear()'],['退出登录','leave']];
 for(const [label,effect] of cases){
  const at=status.indexOf('setAsking({title:ui("'+label+'")');assert.ok(at>=0,'no in-app confirm for '+label);
  const call=status.slice(at,status.indexOf('})',at)+2);
  assert.ok(call.includes('confirmLabel:ui("'+label+'")'),label);assert.ok(call.includes('run:')&&call.includes(effect),label+' → '+effect);
 }
 // Discarding local changes or clearing the local copy is styled as destructive.
 for(const label of ['采用云端记录','清除本机副本']){const at=status.indexOf('setAsking({title:ui("'+label+'")');assert.ok(status.slice(at,at+260).includes('danger:true'),label);}
});

test('the dialog is a modal alertdialog whose default focus is Cancel and which runs the action only on confirm',()=>{
 assert.match(dialog,/showModal\(\)/);assert.match(dialog,/role="alertdialog"/);
 assert.match(dialog,/<button type="button" autoFocus onClick=\{onClose\}>\{ui\('取消'\)\}<\/button>/);
 assert.equal((dialog.match(/request\.run\(\)/g)||[]).length,1);assert.match(dialog,/onCancel=\{e=>\{e\.preventDefault\(\);onClose\(\);\}\}/);
 assert.doesNotMatch(dialog,/(^|[^.\w])confirm\(/);
});

test('no component in the app calls the native confirm dialog',()=>{
 const offenders=[];
 for(const dir of ['app','src'])for(const f of fs.readdirSync(dir).filter(f=>/\.(tsx|ts)$/.test(f))){
  let s=fs.readFileSync(dir+'/'+f,'utf8');
  // learning-workspace receives an unrelated `confirm:(c:Course)=>void` prop (course calibration); its calls pass a course.
  if(f==='learning-workspace.tsx'){assert.match(s,/confirm:\(c:Course\)=>void/);s=s.replace(/confirm\(c\)/g,'');}
  if(/(^|[^.\w])confirm\(|window\.confirm\(|globalThis\.confirm\(/.test(s))offenders.push(dir+'/'+f);
 }
 assert.deepEqual(offenders,[]);
});

test('every former confirm site asks in-app before acting',()=>{
 const sites={'app/finance.tsx':['life.remove'],'app/focus-panel.tsx':['focus.cancel'],'app/life-form.tsx':['close()'],'app/life.tsx':['life.remove'],'app/monthly-planning.tsx':['close()','monthly.goal.remove'],'app/task-classification.tsx':['onChange({activity:null})'],'app/workbench.tsx':['leave()','close()','task.delete','project.delete','backup.import']};
 for(const [file,effects] of Object.entries(sites)){
  const s=fs.readFileSync(file,'utf8');assert.match(s,/import \{askConfirm\} from '\.\/confirm-dialog';/,file);
  for(const effect of effects){
   const at=s.indexOf(effect,s.indexOf('askConfirm('));assert.ok(at>0,file+' → '+effect);
   const ask=s.lastIndexOf('askConfirm(',at);assert.ok(ask>=0&&at-ask<700,file+': '+effect+' is not gated by askConfirm');
  }
 }
});

test('askConfirm resolves true only from the confirm button and false on cancel, Escape or backdrop',()=>{
 assert.match(dialog,/export function askConfirm\(/);
 assert.match(dialog,/run:\(\)=>finish\(true\)/);assert.match(dialog,/onClose=\{\(\)=>finish\(false\)\}/);
 assert.match(dialog,/if\(settled\)return;settled=true;/);
 // The action must run before onClose so a confirm is never settled as a cancel first.
 assert.match(dialog,/onClick=\{\(\)=>\{void request\.run\(\);onClose\(\);\}\}/);
});
