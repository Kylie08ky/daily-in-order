import {useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {Check,ChevronLeft,ChevronRight,GripVertical} from 'lucide-react';
import {t as ui} from '../lib/i18n';

export function TaskGestureHint(){return <div className="task-gesture-hint"><span><ChevronLeft/>{ui('左滑完成')}</span><span>{ui('右滑到次日')}<ChevronRight/></span><span>{ui('点击编辑')}</span><span><GripVertical/>{ui('手柄排序')}</span></div>;}

export function SwipeTask({id,children,complete,defer,disabled}:{id:string;children:ReactNode;complete?:()=>void;defer?:()=>void;disabled:boolean}){
 const [dx,setDx]=useState(0),[dragging,setDragging]=useState(false),[ready,setReady]=useState(false);
 const gesture=useRef<{id:number;x:number;y:number;dx:number;axis:''|'x'|'y'}|null>(null);
 const suppress=useRef(false);
 const reset=()=>{gesture.current=null;setDx(0);setDragging(false);setReady(false);};
 const finish=(e:PointerEvent<HTMLDivElement>)=>{
  const g=gesture.current;if(!g||g.id!==e.pointerId)return;
  const threshold=Math.min(90,e.currentTarget.clientWidth*.25);
  reset();if(!disabled&&g.axis==='x'&&Math.abs(g.dx)>=threshold){if(g.dx<0)complete?.();else defer?.();}
 };
 return <div className={'swipe-task'+(dragging?' swiping':'')} data-task-id={id}
  onPointerDown={e=>{
   suppress.current=false;
   if(!e.isPrimary||e.button!==0||disabled||!(e.target as HTMLElement).closest('.task-body'))return;
   gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,axis:''};
  }}
  onPointerMove={e=>{
   const g=gesture.current;if(!g||g.id!==e.pointerId)return;
   const x=e.clientX-g.x,y=e.clientY-g.y;
   if(!g.axis&&Math.max(Math.abs(x),Math.abs(y))>10){g.axis=Math.abs(x)>Math.abs(y)*1.3?'x':'y';suppress.current=true;}
   if(g.axis!=='x')return;
   e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();
   g.dx=x;setDragging(true);setReady(Math.abs(x)>=Math.min(90,e.currentTarget.clientWidth*.25));setDx((x<0?!!complete:!!defer)?Math.max(-140,Math.min(140,x)):x*.08);
  }} onPointerUp={finish} onPointerCancel={reset} onLostPointerCapture={reset}
  onClickCapture={e=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}}}>
  <div className={'swipe-reveal '+(dx<0?'complete':'defer')} aria-hidden="true" style={{visibility:dx&&(dx<0?complete:defer)?'visible':'hidden'}}>{dx<0?<><Check/>{ui(ready?'松开完成':'左滑完成')}</>:<>{ui(ready?'松开移到次日':'右滑到次日')}<ChevronRight/></>}</div>
  <div className="swipe-foreground" style={{transform:`translateX(${dx}px)`}}>{children}</div>
 </div>;
}

/** Pointer handle supports mouse and touch without competing with row swipes. */
export function TaskSortHandle({id,disabled,move}:{id:string;disabled:boolean;move:(id:string,target:string,after:boolean)=>void}){
 const gesture=useRef<{pointer:number;x:number;y:number}|null>(null);
 const [active,setActive]=useState(false);
 const clear=()=>{gesture.current=null;setActive(false);document.querySelectorAll('.sort-target').forEach(e=>e.classList.remove('sort-target'));};
 const targetAt=(x:number,y:number)=>document.elementFromPoint(x,y)?.closest<HTMLElement>('.swipe-task');
 return <button type="button" disabled={disabled} className={'icon-btn task-sort-handle'+(active?' sorting':'')} title={ui('拖动排序；方向键上下移动')} aria-label={ui('拖动排序；方向键上下移动')}
  onPointerDown={e=>{if(!e.isPrimary||e.button!==0||disabled)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);gesture.current={pointer:e.pointerId,x:e.clientX,y:e.clientY};}}
  onPointerMove={e=>{
   const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
   if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<8)return;
   setActive(true);document.querySelectorAll('.sort-target').forEach(e=>e.classList.remove('sort-target'));
   const target=targetAt(e.clientX,e.clientY);if(target?.dataset.taskId!==id)target?.classList.add('sort-target');
   const scroll=e.currentTarget.closest('.agenda-list-scroll');if(scroll){const r=scroll.getBoundingClientRect();if(e.clientY<r.top+35)scroll.scrollTop-=18;else if(e.clientY>r.bottom-35)scroll.scrollTop+=18;}
  }} onPointerUp={e=>{
   const g=gesture.current,target=targetAt(e.clientX,e.clientY);clear();
   if(!disabled&&g?.pointer===e.pointerId&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>=8&&target?.dataset.taskId&&target.dataset.taskId!==id)move(id,target.dataset.taskId,e.clientY>target.getBoundingClientRect().top+target.clientHeight/2);
  }} onPointerCancel={clear} onLostPointerCapture={clear}
  onKeyDown={e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const row=e.currentTarget.closest('.swipe-task'),list=row?.parentElement;if(!list)return;const rows=[...list.querySelectorAll<HTMLElement>(':scope > .swipe-task')],index=rows.indexOf(row as HTMLElement),next=rows[index+(e.key==='ArrowDown'?1:-1)];if(next?.dataset.taskId)move(id,next.dataset.taskId,e.key==='ArrowDown');}}><GripVertical size={15}/></button>;
}
