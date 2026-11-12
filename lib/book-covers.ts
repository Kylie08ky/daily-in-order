import {z} from 'zod';

export function safeCoverUrl(value:string){
 if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return value.length<=180000;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&value.length<=2000;}catch{return false;}
}
export const bookCoverSchema=z.object({url:z.string().refine(safeCoverUrl),source:z.enum(['openlibrary','upload','url','weread']),sourceUrl:z.string().max(2000).refine(v=>!v||(/^https:\/\/(openlibrary\.org|weread\.qq\.com)\//.test(v))).default(''),isbn:z.string().max(20).default('')});
export type BookCover=z.infer<typeof bookCoverSchema>;
export type CoverCandidate={id:string;title:string;author:string;year:string;cover:BookCover};
export function normalizedIsbn(text:string){const value=text.replace(/[\s-]/g,'').toUpperCase();return /^(\d{13}|\d{9}[\dX])$/.test(value)?value:'';}
export function coverSearchUrl(query:string){const isbn=normalizedIsbn(query);return isbn?'https://openlibrary.org/api/books?'+new URLSearchParams({bibkeys:'ISBN:'+isbn,format:'json',jscmd:'data'}):'https://openlibrary.org/search.json?'+new URLSearchParams({q:query.trim(),limit:'12',fields:'key,title,author_name,first_publish_year,cover_i'});}
export function parseCoverResults(data:unknown,query:string):CoverCandidate[]{
 const isbn=normalizedIsbn(query),obj=data as Record<string,any>;
 if(isbn){const b=obj?.['ISBN:'+isbn];if(!b?.cover)return [];const url=String(b.cover.large||b.cover.medium||b.cover.small||'').replace(/^http:/,'https:');if(!safeCoverUrl(url))return [];return [{id:isbn,title:String(b.title||''),author:(b.authors||[]).map((a:any)=>a.name).join(', '),year:String(b.publish_date||''),cover:{url,source:'openlibrary',sourceUrl:'https://openlibrary.org/isbn/'+isbn,isbn}}];}
 return (Array.isArray(obj?.docs)?obj.docs:[]).filter((b:any)=>Number.isInteger(b.cover_i)&&b.cover_i>0&&/^\/works\/OL\d+W$/.test(b.key)).map((b:any)=>({id:b.key,title:String(b.title||''),author:(b.author_name||[]).join(', '),year:String(b.first_publish_year||''),cover:{url:`https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg?default=false`,source:'openlibrary' as const,sourceUrl:'https://openlibrary.org'+b.key,isbn:''}}));
}
export async function findBookCovers(query:string,signal:AbortSignal){const response=await fetch(coverSearchUrl(query),{signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('cover-search');return parseCoverResults(await response.json(),query);}

/** Decode then re-encode raster uploads; strip metadata and bound synchronized payloads. */
export async function uploadBookCover(file:File):Promise<BookCover>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('cover-file');
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,480/bitmap.width,720/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('cover-file');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);for(const quality of [.82,.65,.45,.25]){const url=canvas.toDataURL('image/jpeg',quality);if(url.length<=180000)return {url,source:'upload',sourceUrl:'',isbn:''};}throw Error('cover-file');}finally{bitmap.close();}
}
