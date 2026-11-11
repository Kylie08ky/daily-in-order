import {assertStateVersion} from './schema-version.ts';
import {validateState,type State} from './model.ts';
export const MAX_BYTES=8_000_000;
// At most 600 KB UTF-8 per string chunk, below Firestore's 1 MiB document limit.
export function encodeState(state:State){
 assertStateVersion(state);
 const text=JSON.stringify(state);
 if(new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('工作台已达到 8 MB，请先导出备份并整理历史记录。');
 const chunks:string[]=[];
 for(let i=0;i<text.length;){let end=Math.min(text.length,i+150000);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;chunks.push(text.slice(i,end));i=end;}
 return chunks;
}
export function decodeState(chunks:string[]){return validateState(JSON.parse(chunks.join('')));}
