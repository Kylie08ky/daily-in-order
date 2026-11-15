import {t,tr} from '../lib/i18n';
import {formatTime} from '../lib/model';
import type {TimeBucket,TimeGrouping} from '../lib/time-distribution';
import './time-distribution.css';
export default function TimeDistribution({group,onGroup,rows,total,period}:{period?:string;group:TimeGrouping;onGroup:(group:TimeGrouping)=>void;rows:TimeBucket[];total:number}){
 return <section className="panel time-distribution"><header><h3>{t('时间花在哪')}</h3><div className="tabs" aria-label={t('投入分组方式')}>
 <button aria-pressed={group==='classification'} onClick={()=>onGroup('classification')}>{t('按事项分类')}</button>
 <button aria-pressed={group==='project'} onClick={()=>onGroup('project')}>{t('按项目')}</button></div></header>
 <p className="time-distribution-hint">{t('点击分类或项目，核对计入的任务。')}</p>
 <div className="time-distribution-rows">{rows.map(row=><details className="distribution" key={group+row.id}>
 <summary aria-label={tr('查看{0}的任务',row.interfaceLabel?t(row.name):row.name)}>
 <div className="row between"><span className="distribution-name"><span className="distribution-chevron" aria-hidden="true">›</span><i style={{background:row.color}}/>{row.interfaceLabel?t(row.name):row.name}</span><b>{Math.round(row.value/total*100)}%</b></div>
 <div className="progress"><span style={{width:Math.min(100,row.value/total*100)+'%',background:row.color}}/></div>
 <div className="row between distribution-count"><span>{formatTime(row.value)}</span><span>{tr('{0} 条任务',row.sources.length)}</span></div>
 </summary>
 <div className="distribution-detail">
 <div className="distribution-period"><strong>{t('本期计入任务')}</strong>{period&&<span>{period}</span>}</div>
 <ul>{row.sources.map(source=><li key={source.id}>
 <div className="distribution-task"><strong>{source.title}</strong><span>{t(source.completed?'已完成':'部分投入')}{source.projectName?' · '+source.projectName:''}</span></div>
 <div className="distribution-minutes"><strong>{formatTime(source.minutes)}</strong><small>{t('任务累计')} {formatTime(source.totalMinutes)}</small></div>
 </li>)}</ul>
 <div className="distribution-subtotal"><span>{tr('共计入 {0} 条任务',row.sources.length)}</span><strong>{t('合计')} {formatTime(row.value)}</strong></div>
 <p>{t('右侧粗体为所选期间计入的实际时长，任务累计包含其他日期的投入。')}</p>
 </div></details>)}{!rows.length&&<p className="empty">{t('所选期间还没有实际投入。')}</p>}</div>
 <footer><span>{t('本期实际投入')}</span><strong>{formatTime(total)}</strong></footer>
 {group==='classification'&&rows.some(row=>row.id==='unclassified')&&<p className="time-distribution-hint">{t('未确认分类的投入单独列出，不按标题推测。')}</p>}
 </section>;
}
