import {z} from 'zod';
import {bookCoverSchema} from './book-covers.ts';
import {wereadId,wereadSnapshotSchema} from './weread-schema.ts';
import {bookSchema,type Book} from './life-schema.ts';
import {type State,type Command,validateState,idString} from './model.ts';

export const remoteBookSchema=z.object({bookId:wereadId,title:z.string().trim().min(1).max(160),author:z.string().max(100).default(''),cover:bookCoverSchema.optional(),readerLink:z.string().default('')});
export type RemoteBook=z.infer<typeof remoteBookSchema>;
export function parseWeReadShelf(value:unknown):RemoteBook[]{
 const body=z.object({books:z.array(z.object({bookId:wereadId,title:z.string(),author:z.string().optional(),cover:z.string().optional(),readerLink:z.string().optional()})).max(5000)}).parse(value);
 const unique=new Map<string,RemoteBook>();
 for(const b of body.books){const image=bookCoverSchema.safeParse({url:b.cover?.replace(/^http:/,'https:'),source:'weread',sourceUrl:'https://weread.qq.com/'});unique.set(b.bookId,remoteBookSchema.parse({...b,readerLink:b.readerLink&&/^https:\/\/weread\.qq\.com\//.test(b.readerLink)?b.readerLink:'',cover:image.success?image.data:undefined}));}
 return [...unique.values()];
}
export function parseWeReadProgress(value:unknown,bookId:string,syncedAt:string){
 const p=z.object({bookId:wereadId.optional(),book:z.object({progress:z.number().int().min(0).max(100),updateTime:z.number().int().nonnegative(),chapterUid:z.number().int().nonnegative().optional()})}).parse(value);
 if(p.bookId&&p.bookId!==bookId)throw Error('微信读书返回的书籍不匹配，请重试。');
 return wereadSnapshotSchema.parse({bookId,progress:p.book.progress,updatedAt:p.book.updateTime,chapterUid:p.book.chapterUid,syncedAt});
}
export function matchingBooks(books:Book[],remote:RemoteBook){
 const normalize=(v:string)=>v.normalize('NFKC').replace(/[\s·:：]/g,'').toLowerCase();
 return books.filter(b=>!b.weread&&normalize(b.title)===normalize(remote.title));
}
const changeSchema=z.object({targetId:idString,create:z.boolean(),book:remoteBookSchema,snapshot:wereadSnapshotSchema}).strict();
/** One atomic metadata-only command. Never invokes entry/task/session writers. */
export function applyWeReadSync(input:State,command:Command){
 const changes=z.array(changeSchema).min(1).max(50).parse(command.payload),s=structuredClone(input),seen=new Set<string>(),targets=new Set<string>();
 for(const c of changes){
  if(c.snapshot.bookId!==c.book.bookId||seen.has(c.book.bookId)||targets.has(c.targetId))throw Error('同一本书只能关联一次。');
  seen.add(c.book.bookId);targets.add(c.targetId);
  const linked=s.life.books.find(b=>b.weread?.bookId===c.book.bookId);
  if(linked&&linked.id!==c.targetId)throw Error('这本微信读书书籍已关联，请重新加载选择列表。');
  let book=s.life.books.find(b=>b.id===c.targetId);
  if(book?.deletedAt)throw Error('书籍已在回收站，请先恢复原书籍。');
  if(book?.weread&&book.weread.bookId!==c.book.bookId)throw Error('这本书已关联另一部微信读书书籍。');
  if(!book){
   if(!c.create)throw Error('原书籍不存在，请重新选择。');
   if(matchingBooks(s.life.books,c.book).length)throw Error('书架已有同名书籍，请确认关联，避免重复添加。');
   book=bookSchema.parse({id:c.targetId,title:c.book.title,author:c.book.author,total:null});s.life.books.push(book);
  }else if(c.create&&!book.weread)throw Error('书籍已经改变，请重新选择。');
  // Ignore stale remote progress, including a delayed retry. Local page history is untouched.
  if(book.weread&&(book.weread.updatedAt>c.snapshot.updatedAt||book.weread.syncedAt>c.snapshot.syncedAt))continue;
  book.weread={...c.snapshot,readerLink:c.book.readerLink};
  if(c.book.cover)book.cover=c.book.cover;
 }
 return validateState(s);
}
