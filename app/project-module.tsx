import {useId,type ReactNode} from 'react';
import {ChevronDown,Plus} from 'lucide-react';
import {t as ui} from '../lib/i18n';
import './project-module.css';
type Props={name:string;done:number;total:number;progress:ReactNode;expanded:boolean;toggle:()=>void;add:()=>void;children:ReactNode};
export default function ProjectModule({name,done,total,progress,expanded,toggle,add,children}:Props){
 const contentId=useId();
 return <section className="panel task-group project-module">
  <div className="project-module-header">
   <h3><button type="button" className="module-disclosure" aria-expanded={expanded} aria-controls={contentId} aria-label={(expanded?ui("收起模块"):ui("展开模块"))+'：'+name} onClick={toggle}>
    <ChevronDown size={18} aria-hidden="true"/><span className="module-name">{name}</span><small>{done} / {total}</small><span className="module-toggle-label">{expanded?ui("收起"):ui("展开")}</span>
   </button></h3>
   <button type="button" className="text-btn module-add" onClick={add}><Plus size={15}/>{ui("添加事项")}</button>
  </div>
  {progress}
  <div id={contentId} className="project-module-content" hidden={!expanded}>{expanded&&children}</div>
 </section>;
}
