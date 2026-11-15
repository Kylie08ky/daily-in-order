import {z} from 'zod';
import {type State,type Command,validateState} from './model.ts';
import {classificationChange} from './classification-schema.ts';
import {classificationSignature} from './task-classification.ts';
const same=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export function applyClassification(input:State,command:Command,instant=new Date()){
 const s=structuredClone(input);
 const find=(kind:string,id:string)=>kind==='task'?s.tasks.find(t=>t.id===id):kind==='template'?s.templates.find(t=>t.id===id)?.task:kind==='series'?s.series.find(t=>t.id===id)?.template:s.life.courses.find(t=>t.id===id);
 if(command.type==='classification.apply'){
  const p=z.object({id:z.string().min(1).max(100),changes:z.array(classificationChange).max(40000)}).parse(command.payload);
  if(s.classificationHistory?.some(x=>x.id===p.id))return input;
  if(new Set(p.changes.map(c=>c.kind+':'+c.id)).size!==p.changes.length)throw Error('同一记录不能重复修改。');
  const changes=[];
  for(const c of p.changes){const target=find(c.kind,c.id);if(!target)throw Error('原记录不存在，请重新核对。');if(classificationSignature(target)!==c.expected)throw Error('分类已被修改，请重新核对。');if(same(target.classification,c.after))continue;changes.push({kind:c.kind,id:c.id,before:target.classification??null,after:c.after});if(c.after)target.classification=c.after;else delete target.classification;}
  if(!changes.length)return input;
  if((s.classificationHistory?.length||0)>=200)throw Error('分类修改日志已满，请先导出备份。');
  s.classificationHistory=[...(s.classificationHistory||[]),{id:p.id,date:instant.toISOString(),changes}];
 }else if(command.type==='classification.undo'){
  const p=z.object({id:z.string()}).parse(command.payload),audit=s.classificationHistory?.find(a=>a.id===p.id);if(!audit)throw Error('分类修改记录不存在。');if(audit.undone)return input;
  for(const c of audit.changes){const target=find(c.kind,c.id);if(!target||!same(target.classification,c.after))throw Error('分类已有后续修改，不能覆盖，请逐项核对。');if(c.before)target.classification=c.before;else delete target.classification;}
  audit.undone=true;
 }else throw Error('未知分类操作。');
 // Validate without normalizing other fields or materializing recurring dates.
 s.schemaVersion=18;validateState(s);return s;
}
