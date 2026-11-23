import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {dialogBackdrop} from './dialog-backdrop';
import {t as ui} from '../lib/i18n';

/** Strings are already localised by the caller. */
export type ConfirmRequest={title:string;message:string;confirmLabel:string;danger?:boolean;run:()=>void|Promise<void>};

/**
 * In-app confirmation used instead of window.confirm(), which embedded browsers
 * (e.g. the Claude desktop built-in browser) may block by returning false.
 * Cancel is the default focus so Enter never confirms a destructive action by accident.
 */
export default function ConfirmDialog({request,onClose}:{request:ConfirmRequest;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
 return createPortal(<dialog {...dialogBackdrop} ref={ref} className="modal confirm-dialog" role="alertdialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" onCancel={e=>{e.preventDefault();onClose();}}>
  <h2 id="confirm-dialog-title">{request.title}</h2>
  <p id="confirm-dialog-message">{request.message}</p>
  <div className="form-footer">
   <button type="button" autoFocus onClick={onClose}>{ui('取消')}</button>
   <button type="button" className={request.danger?'danger':'primary'} onClick={()=>{onClose();void request.run();}}>{request.confirmLabel}</button>
  </div>
 </dialog>,document.body);
}
