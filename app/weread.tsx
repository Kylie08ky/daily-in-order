import {useEffect,useRef,useState} from 'react';
import {X,RefreshCw,Link} from 'lucide-react';
import type {State,Command} from '../lib/model';
import type {Book} from '../lib/life-schema';
import {matchingBooks,parseWeReadShelf,parseWeReadProgress,type RemoteBook} from '../lib/weread';
import {requestWeRead,wereadEndpoint} from '../lib/weread-client';
import {t as ui} from '../lib/i18n';
import {BookCover} from './book-cover';
import './weread.css';

export function WeReadStatus({book}:{book:Book}){const w=book.weread;if(!w)return null;return <div className="weread-status"><div><strong>{ui('微信读书')} · {w.progress}%</strong>{w.readerLink&&<a href={w.readerLink} target="_blank" rel="noreferrer">{ui('打开阅读')} ↗</a>}</div><div className="progress"><span style={{width:w.progress+'%'}}/></div><small>{ui('最近同步')} {new Date(w.syncedAt).toLocaleString()} · {ui('阅读时长未合并')}</small></div>;}

type Props={state:State;mutate:(command:Command,message?:string)=>Promise<boolean>;close:()=>void;busy:boolean;error:string;client?:typeof requestWeRead;enabled?:boolean};
export default function WeReadDialog({state,mutate,close,busy,error,client=requestWeRead,enabled=!!wereadEndpoint}:Props){
 const dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null),saving=useRef(false);
 const [key,setKey]=useState(''),[visible,setVisible]=useState(false),[books,setBooks]=useState<RemoteBook[]|null>(null),[choices,setChoices]=useState<Record<string,string>>({}),[query,setQuery]=useState(''),[loading,setLoading]=useState(false),[problem,setProblem]=useState(''),[count,setCount]=useState(0);
 useEffect(()=>{dialog.current?.showModal();return()=>controller.current?.abort();},[]);
 function dismiss(){if(saving.current)return;controller.current?.abort();setKey('');close();}
 async function connect(){controller.current?.abort();const c=new AbortController();controller.current=c;setProblem('');setLoading(true);setBooks(null);try{const next=parseWeReadShelf(await client(key.trim(),'/shelf/sync',undefined,c.signal));if(c.signal.aborted)return;setBooks(next);setChoices({});}catch(e){if(!c.signal.aborted)setProblem(e instanceof Error?e.message:'连接微信读书失败，请稍后重试。');}finally{if(!c.signal.aborted)setLoading(false);}}
 const selected=(books||[]).filter(b=>choices[b.bookId]);
 function selection(b:RemoteBook){const matches=matchingBooks(state.life.books,b),linked=state.life.books.find(x=>x.weread?.bookId===b.bookId)||matches.find(x=>x.deletedAt);return {linked,matches,value:choices[b.bookId]||''};}
 async function sync(){if(saving.current||!selected.length||selected.length>50)return;saving.current=true;setProblem('');setLoading(true);setCount(0);const c=new AbortController();controller.current=c;
  try{const changes=[];for(const book of selected){const snapshot=parseWeReadProgress(await client(key.trim(),'/book/getprogress',book.bookId,c.signal),book.bookId,new Date().toISOString()),target=choices[book.bookId];changes.push({book,snapshot,targetId:target==='new'?'weread:'+book.bookId:target,create:target==='new'});setCount(changes.length);}
   if(c.signal.aborted)return;if(await mutate({type:'reading.weread.sync',payload:changes},ui('封面和阅读进度已保存，原阅读用时保持不变。'))){setKey('');close();}
  }catch(e){if(!c.signal.aborted)setProblem(e instanceof Error?e.message:'连接微信读书失败，请稍后重试。');}finally{saving.current=false;setLoading(false);}
 }
 return <dialog className="modal wide weread-dialog" ref={dialog} aria-label={ui('连接微信读书')} onCancel={e=>{e.preventDefault();dismiss();}}><header><div><h2>{ui('连接微信读书')}</h2><p>{ui('选择书籍，同步真实封面与阅读百分比。')}</p></div><button className="icon-btn" onClick={dismiss} disabled={saving.current} aria-label={ui('关闭')}><X/></button></header>
 {!enabled?<p role="status">{ui('微信读书连接服务尚未配置。')}</p>:<>
 {!books?<form onSubmit={e=>{e.preventDefault();void connect();}}><p>{ui('从微信读书官方页面获取个人 API Key，仅在本次连接中使用。关闭窗口后清除，不写入云端、备份或浏览器存储。')}</p><a href="https://weread.qq.com/r/weread-skills" target="_blank" rel="noreferrer">{ui('获取微信读书密钥')} ↗</a><label className="weread-key">API Key<div><input type={visible?'text':'password'} value={key} autoComplete="off" spellCheck={false} maxLength={504} placeholder="wrk-…" onChange={e=>setKey(e.target.value)} disabled={loading}/><button type="button" onClick={()=>setVisible(v=>!v)}>{ui(visible?'隐藏':'显示')}</button></div></label><small>{ui('密钥经本应用的连接服务转发至微信读书，仅请求书架、封面和进度，不请求阅读时长或笔记。')}</small><footer><button type="button" onClick={dismiss}>{ui('取消')}</button><button className="primary" disabled={loading||!key.trim().startsWith('wrk-')}><Link size={16}/>{ui(loading?'连接中…':'连接并读取书架')}</button></footer></form>:<>
 <div className="weread-toolbar"><input type="search" aria-label={ui('搜索书名或作者')} placeholder={ui('搜索书名或作者')} value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={loading||busy} onClick={()=>{setKey('');setBooks(null);setChoices({});setProblem('');}}>{ui('断开连接')}</button></div>
 <p>{ui('仅列出电子书。已有书籍请选择关联；同步不覆盖手填页码，不新增任务或阅读用时。')}</p>
 <div className="weread-books">{books.filter(b=>(b.title+' '+b.author).toLowerCase().includes(query.toLowerCase())).map(b=>{const {linked,matches,value}=selection(b);return <article key={b.bookId}><BookCover cover={b.cover} title={b.title}/><div><strong>{b.title}</strong><small>{b.author}</small><label>{ui('保存到书架')}<select aria-label={ui('保存到书架')+' · '+b.title} disabled={loading||busy||!!linked?.deletedAt} value={value} onChange={e=>setChoices(v=>({...v,[b.bookId]:e.target.value}))}><option value="">{ui('暂不选择')}</option>{linked?<option value={linked.id}>{ui('更新已关联书籍')} · {linked.title}</option>:<>{!matches.length&&<option value="new">{ui('新增到书架')}</option>}{state.life.books.filter(x=>!x.deletedAt&&!x.weread).map(x=><option key={x.id} value={x.id}>{ui('关联已有书籍')} · {x.title} {x.author?' / '+x.author:''}</option>)}</>}</select></label>{linked?.deletedAt?<small>{ui('已关联的书籍在回收站，请先恢复。')}</small>:matches.length>0?<small>{ui('发现同名书籍，请确认关联，避免重复添加。')}</small>:null}</div></article>;})}{!books.length&&<p>{ui('微信读书书架暂无电子书。')}</p>}</div>
 <footer><span>{ui('已选择')} {selected.length} / 50 {loading&&<span> · {ui('读取进度')} {count}/{selected.length}</span>}</span><button className="primary" disabled={loading||busy||!selected.length||selected.length>50} onClick={()=>void sync()}><RefreshCw size={16}/>{ui(loading?'同步中…':'同步所选书籍')}</button></footer></>}
 </>}{(problem||error)&&<p className="inline-error" role="alert">{ui(problem||error)}</p>}</dialog>;
}
