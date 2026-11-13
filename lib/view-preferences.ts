export type ViewPreferences={daily?:'list'|'timeline';planning?:'month'|'week'|'calendar'};
export const viewPreferenceKey=(space:string,owner:string)=>`daily-in-order:view:${space}:${owner}`;
export function parseViewPreferences(raw:string|null):ViewPreferences{
 try{const p=JSON.parse(raw||'{}');return {daily:p?.daily==='list'||p?.daily==='timeline'?p.daily:undefined,planning:['month','week','calendar'].includes(p?.planning)?p.planning:undefined};}catch{return {};}
}
