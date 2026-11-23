import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {dialogBackdrop} from './dialog-backdrop';
import {t as ui} from '../lib/i18n';

/** Strings are already localised by the caller. */
export type ConfirmRequest={title?:string;message:string;confirmLabel:string;danger?:boolean;run:()=>void|Promise<void>};

/**
 * In-app confirmation used instead of the native window confirm dialog, which embedded browsers
 * (e.g. the Claude desktop built-in browser) may block by returning false.
 * Cancel is the default focus so Enter never confirms a destructive action by accident.
 */
export default function ConfirmDialog({request,onClose}:{request:ConfirmRequest;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
 return createPortal(<dialog {...dialogBackdrop} ref={ref} className="modal confirm-dialog" role="alertdialog" aria-labelledby={request.title?'confirm-dialog-title':undefined} aria-label={request.title?undefined:request.confirmLabel} aria-describedby="confirm-dialog-message" onCancel={e=>{e.preventDefault();onClose();}}>
  {request.title&&<h2 id="confirm-dialog-title">{request.title}</h2>}
  <p id="confirm-dialog-message">{request.message}</p>
  <div className="form-footer">
   <button type="button" autoFocus onClick={onClose}>{ui('取消')}</button>
   <button type="button" className={request.danger?'danger':'primary'} onClick={()=>{void request.run();onClose();}}>{request.confirmLabel}</button>
  </div>
 </dialog>,document.body);
}

/**
 * Promise-based replacement for the native window confirm: resolves true only when the user presses the confirm button.
 * Cancel, Escape and a backdrop click resolve false. Opens above any dialog that is already modal.
 */
export function askConfirm({message,confirmLabel=ui('确认'),title,danger=false}:{message:string;confirmLabel?:string;title?:string;danger?:boolean}):Promise<boolean>{
 return new Promise(resolve=>{
  const host=document.createElement('div');document.body.appendChild(host);
  const root=createRoot(host);let settled=false;
  const finish=(ok:boolean)=>{if(settled)return;settled=true;resolve(ok);queueMicrotask(()=>{root.unmount();host.remove();});};
  root.render(<ConfirmDialog request={{title,message,confirmLabel,danger,run:()=>finish(true)}} onClose={()=>finish(false)}/>);
 });
}
