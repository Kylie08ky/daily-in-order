import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState} from '../lib/model.ts';import {applyCommand} from '../lib/commands.ts';
import {timelineItems,untimedTasks} from '../lib/timeline-items.ts';
import {parseViewPreferences,viewPreferenceKey} from '../lib/view-preferences.ts';
test('flexible and duration-only actual tasks stay discoverable on their real day without changing records',()=>{
 let s=emptyState();const run=(type,payload,instant='2026-11-13T10:00:00Z')=>{s=applyCommand(s,{type,payload},new Date(instant));};
 run('task.save',{id:'flex',task:{title:'Flexible',date:'2026-11-13',minutes:30}});
 run('task.save',{id:'manual',task:{title:'Manual',date:'2026-11-12',start:'09:00',minutes:30}});
 run('task.record',{id:'manual',date:'2026-11-13',minutes:15});
 run('task.save',{id:'timed',task:{title:'Clock',date:'2026-11-13',start:'14:00',minutes:30}});
 run('task.save',{id:'future',task:{title:'Future',date:'2026-11-14',minutes:30}});
 const before=JSON.stringify(s);
 assert.deepEqual(untimedTasks(s,'2026-11-13',s.tasks).map(t=>t.id),['flex','manual']);
 assert.deepEqual(timelineItems(s,'2026-11-13',s.tasks).filter(t=>!t.block).map(t=>t.task.id),['timed']);
 assert.equal(JSON.stringify(s),before);
});
test('focus on a different day appears as real clock blocks, not an extra duration-only row',()=>{
 let s=emptyState();s=applyCommand(s,{type:'task.save',payload:{id:'t',task:{title:'Example',date:'2026-11-12',start:'08:00',minutes:30}}});
 s=applyCommand(s,{type:'focus.start',payload:{taskId:'t',mode:'countup'}},new Date('2026-11-13T10:00:00Z'));
 s=applyCommand(s,{type:'focus.finish'},new Date('2026-11-13T10:15:00Z'));
 assert.equal(untimedTasks(s,'2026-11-13',s.tasks).length,0);assert.equal(timelineItems(s,'2026-11-13',s.tasks).length,1);assert.equal(s.tasks[0].actual,15);
});
test('display preferences accept only supported views and are isolated by account and environment',()=>{
 assert.deepEqual(parseViewPreferences('{'),{});assert.deepEqual(parseViewPreferences('{"daily":"list","planning":"calendar","state":{"tasks":[]}}'),{daily:'list',planning:'calendar'});
 assert.deepEqual(parseViewPreferences('{"daily":"bogus","planning":42}'),{daily:undefined,planning:undefined});
 assert.notEqual(viewPreferenceKey('preview','a'),viewPreferenceKey('live','a'));assert.notEqual(viewPreferenceKey('preview','a'),viewPreferenceKey('preview','b'));
});
