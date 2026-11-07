import {useId,type ReactNode} from 'react';
import {ChevronDown,Plus,ArrowUp,ArrowDown} from 'lucide-react';
import {t as ui,tr} from '../lib/i18n';
import './project-module.css';
type Props={name:string;done:number;total:number;progress:ReactNode;summary?:ReactNode;moveUp?:()=>void;moveDown?:()=>void;expanded:boolean;toggle:()=>void;add:()=>void;children:ReactNode};
export default function ProjectModule({name,done,total,progress,summary,moveUp,moveDown,expanded,toggle,add,children}:Props){
 const contentId=useId();
 return <section className="panel task-group project-module">
  <div className="project-module-header">
   <h3><button type="button" className="module-disclosure" aria-expanded={expanded} aria-controls={contentId} aria-label={(expanded?ui("收起模块"):ui("展开模块"))+'：'+name} onClick={toggle}>
    <ChevronDown size={18} aria-hidden="true"/><span className="module-name">{name}</span><small>{done} / {total}</small><span className="module-toggle-label">{expanded?ui("收起"):ui("展开")}</span>
   </button></h3>
   <div className="module-header-actions">
    <div className="module-order-actions" role="group" aria-label={tr("调整模块顺序：{0}",name)}>
     <button type="button" className="icon-btn" disabled={!moveUp} onClick={moveUp} aria-label={tr("上移模块：{0}",name)} title={ui("上移模块")}><ArrowUp size={16}/></button>
     <button type="button" className="icon-btn" disabled={!moveDown} onClick={moveDown} aria-label={tr("下移模块：{0}",name)} title={ui("下移模块")}><ArrowDown size={16}/></button>
    </div>
    <button type="button" className="text-btn module-add" onClick={add}><Plus size={15}/>{ui("添加事项")}</button>
   </div>
  </div>
  {progress}
  {summary&&<p className="module-progress-caption">{summary}</p>}
  <div id={contentId} className="project-module-content" hidden={!expanded}>{expanded&&children}</div>
 </section>;
}
