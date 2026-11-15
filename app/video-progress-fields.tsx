import {type State} from '../lib/model';
import {type Entry,type Course} from '../lib/life-schema';
import {activityStats} from '../lib/life-metrics';
import {effectiveLearningUnits} from '../lib/progress-records';
import {t as ui} from '../lib/i18n';
export default function VideoProgressFields({state:s,entry:e,course,patch,video=true,preserveEmpty=false}:{state:State;entry:Entry;course:Course;patch:(p:Partial<Entry>)=>void;video?:boolean;preserveEmpty?:boolean}){
 const all=s.life.entries.filter(x=>x.id!==e.id),draft=e.quantityKnown===false?s.life.entries:[...all,e],units=effectiveLearningUnits(draft);
 const saved=course.initial+activityStats(s,'german',course.id).units,after=course.initial+draft.filter(x=>x.refId===course.id).reduce((n,x)=>n+(units.get(x.id)||0),0);
 return <section className="video-progress-fields"><div className="fields cols-2"><label>{ui('本次完成数量（增量）')+' · '+course.unit}<input type="number" min="0" max={course.total??100000} step="1" value={e.quantityKnown===false?'':e.units} placeholder={ui('未填写')} onChange={v=>patch({units:Number(v.target.value),quantityKnown:v.target.value!==''})}/></label><label>{ui(video?'观看方式':'完成方式')}<select value={e.rewatch?'repeat':'first'} onChange={v=>patch({rewatch:v.target.value==='repeat'})}><option value="first">{ui('首次完成')}</option><option value="repeat">{ui(video?'重复观看（不增加完成数量）':'重复练习（不增加完成数量）')}</option></select></label></div>
 <p className="hint">{ui('已保存累计')} {saved} / {course.total??'—'} {course.unit} · {ui('保存后预计累计')} {after} / {course.total??'—'}</p>
 <div className="fields cols-2"><label>{ui(video?'视频编号（每行一个，选填）':'单元编号（每行一个，选填）')}<textarea rows={2} value={(e.videoIds||[]).join('\n')} onChange={v=>patch({videoIds:v.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})}/></label>{video&&<label>{ui('视频标题（仅展示，选填）')}<textarea rows={2} maxLength={200} value={e.unitTitle||''} onChange={v=>patch({unitTitle:v.target.value})}/></label>}</div>
 <small>{ui(preserveEmpty?'按相同编号去重，不按标题推测。编号数量须与本次数量一致；数量留空保留原进度。':'视频编号数量须与本次视频数量一致。')}</small></section>;
}
