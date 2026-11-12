import {BookCover} from './book-cover';
import {t as ui,tr,locale} from '../lib/i18n';
'use client';
import {BookOpen} from 'lucide-react';
import type {State,TaskInput} from '../lib/model';
import {alive,bookProgress} from '../lib/life-metrics';
import type {LifeView} from './life';

export default function HomeScene({state:s,date,open,plan,visibleModules}:{visibleModules:string[];state:State;date:string;open:(v:LifeView)=>void;plan:(t:Partial<TaskInput>)=>void}){
 const l=s.life,books=alive(l.books),book=books.find(b=>b.status==='reading'&&!bookProgress(s,b.id).finished),p=book?bookProgress(s,book.id):null;
 return <div className="home-scene">
  {visibleModules.includes('reading')&&<section className="reading-spotlight" aria-label={ui("正在阅读")}>
   <div className="spotlight-copy"><span className="scene-tag">{book?ui("正在阅读"):'THE READING ROOM'}</span><h2>{book?.title||ui("让日常，有自己的节奏。")}</h2><p>{book?.author||ui("留一段时间，走进书里的世界。")}</p>
    {p&&book?<div className="spotlight-progress"><div><span>{ui("第")}{p.pages} / {book.total} {ui("页")}</span><b>{p.percent}%</b></div><div className="progress"><span style={{width:p.percent+'%'}}/></div><small>{p.started?ui("始于 ")+p.started:ui("开始日期待记录")}</small></div>:<p className="spotlight-empty">{ui("加入第一本书后，这里显示真实阅读进度。")}</p>}
    <div className="row wrap"><button className="scene-primary" onClick={()=>open('reading')}><BookOpen size={17}/>{book?ui("继续阅读 / 记录"):ui("打开阅读书房")}</button>{book&&<button className="scene-outline" onClick={()=>plan({title:ui("阅读 · ")+book.title,date,minutes:l.preferences.readingMinutes,category:'学习',projectId:book.projectId,activity:{kind:'reading',refId:book.id,category:'other'}})}>{ui("安排阅读时间")}</button>}</div>
   </div>
   {book&&<BookCover className="spotlight-cover" cover={book.cover} title={book.title} author={book.author}/>}
  </section>}

 </div>;
}
