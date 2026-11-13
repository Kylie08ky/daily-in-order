import {useState} from 'react';
import {deviceProject} from '../lib/firebase';
import {parseViewPreferences,viewPreferenceKey,type ViewPreferences} from '../lib/view-preferences';
// Display preferences only. Never write workspace data or the offline operation queue.
export function useViewPreferences(owner?:string){
 const key=owner?viewPreferenceKey(deviceProject,owner):'';
 const [saved,setSaved]=useState<{key:string;value:ViewPreferences}>({key:'',value:{}});
 let value=saved.value;
 if(saved.key!==key){try{value=key?parseViewPreferences(localStorage.getItem(key)):{};}catch{value={};}}
 const update=(patch:ViewPreferences)=>{const next={...value,...patch};setSaved({key,value:next});try{if(key)localStorage.setItem(key,JSON.stringify(next));}catch{/* In-memory preferences still work when storage is unavailable. */}};
 return [value,update] as const;
}
