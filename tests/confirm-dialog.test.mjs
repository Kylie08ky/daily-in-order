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
