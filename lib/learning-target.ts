import type {State,Task} from './model.ts';
import type {Course} from './life-schema.ts';
// Explicit activity links win; then one module mapping; then project fallback.
export function germanTarget(s:State,t:Pick<Task,'id'|'activity'|'projectId'|'moduleId'>):Course|undefined{
 const courses=s.life.courses.filter(c=>!c.deletedAt);
 if(t.activity?.kind==='german')return courses.find(c=>c.id===t.activity!.refId);
 const entry=s.life.entries.find(e=>!e.deletedAt&&e.taskId===t.id&&e.kind==='german');
 if(entry)return courses.find(c=>c.id===(entry.timeRefId||entry.refId));
 if(t.activity)return undefined;
 return courses.find(c=>c.projectId===t.projectId&&t.moduleId&&c.moduleIds.includes(t.moduleId))||courses.find(c=>c.projectId&&c.projectId===t.projectId&&c.includeProject);
}
