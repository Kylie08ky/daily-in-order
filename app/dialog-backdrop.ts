import type {PointerEvent} from 'react';

// Use the existing cancel path so each dialog retains its own draft/busy guards.
const presses = new WeakMap<HTMLDialogElement, {id:number;x:number;y:number}>();
function outside(event:PointerEvent<HTMLDialogElement>){
 const dialog=event.currentTarget,rect=dialog.getBoundingClientRect();
 return event.target===dialog && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom);
}
export const dialogBackdrop = {
 onPointerDown(event:PointerEvent<HTMLDialogElement>){
  presses.delete(event.currentTarget);
  if(event.isPrimary && event.button===0 && outside(event)) presses.set(event.currentTarget,{id:event.pointerId,x:event.clientX,y:event.clientY});
 },
 onPointerCancel(event:PointerEvent<HTMLDialogElement>){presses.delete(event.currentTarget);},
 onPointerUp(event:PointerEvent<HTMLDialogElement>){
  const dialog=event.currentTarget,press=presses.get(dialog);presses.delete(dialog);
  if(!press || press.id!==event.pointerId || !outside(event) || Math.hypot(event.clientX-press.x,event.clientY-press.y)>8) return;
  const EventClass=dialog.ownerDocument.defaultView!.Event;
  dialog.dispatchEvent(new EventClass('cancel',{cancelable:true}));
 }
};
