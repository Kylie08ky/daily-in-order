import {t} from '../lib/i18n';
import {formatTime} from '../lib/model';
import type {TimeBucket,TimeGrouping} from '../lib/time-distribution';
import './time-distribution.css';
export default function TimeDistribution({group,onGroup,rows,total}:{group:TimeGrouping;onGroup:(group:TimeGrouping)=>void;rows:TimeBucket[];total:number}){
 return <section className="panel time-distribution"><header><h3>{t('时间花在哪')}</h3><div className="tabs" aria-label={t('投入分组方式')}>
 <button aria-pressed={group==='classification'} onClick={()=>onGroup('classification')}>{t('按事项分类')}</button>
 <button aria-pressed={group==='project'} onClick={()=>onGroup('project')}>{t('按项目')}</button></div></header>
 <div className="time-distribution-rows">{rows.map(row=><div className="distribution" key={row.id}>
 <div className="row between"><span><i style={{background:row.color}}/>{row.interfaceLabel?t(row.name):row.name}</span><b>{Math.round(row.value/total*100)}%</b></div>
 <div className="progress"><span style={{width:Math.min(100,row.value/total*100)+'%',background:row.color}}/></div><small>{formatTime(row.value)}</small>
 </div>)}{!rows.length&&<p className="empty">{t('所选期间还没有实际投入。')}</p>}</div>
 <footer><span>{t('本期实际投入')}</span><strong>{formatTime(total)}</strong></footer>
 {group==='classification'&&rows.some(row=>row.id==='unclassified')&&<p className="time-distribution-hint">{t('未确认分类的投入单独列出，不按标题推测。')}</p>}
 </section>;
}
