import {z} from 'zod';
export const releaseSchema=z.object({id:z.string(),version:z.string().regex(/^\d+\.\d+\.\d+$/),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),title:z.string(),items:z.array(z.string()),changeIds:z.array(z.string()).optional(),releasedAt:z.string().optional()});
export const historySchema=z.array(releaseSchema).max(200);
export type Release=z.infer<typeof releaseSchema>;
export const knownReleases:Release[]=[{"id": "release-0.15.0", "date": "2026-11-10", "version": "0.15.0", "title": "规划、学习与日常操作更新", "items": ["月度与每周规划、任务跨日拆分和学习子项管理。", "三类任务池与今日事项手势操作，实际投入保持原日期。"]}, {"id": "release-0.8.2", "date": "2026-11-06", "version": "0.8.2", "title": "语言与导航布局更新", "items": ["语言切换移至设置；侧栏独立滚动，个人名称与设置合并。"]}];
export function versionAfter(a:string,b:string){const aa=a.split('.').map(Number),bb=b.split('.').map(Number);for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]>bb[i];}return false;}
export function pendingChanges(changes:{id?:string;version?:string;title:string;items:string[]}[],history:Release[]){const latest=history[0]?.version??'0.0.0';return changes.filter(x=>x.version&&versionAfter(x.version,latest));}
export function releaseBatch(history:Release[],manifest:{version:string;changes:{id:string;version:string;title:string;items:string[]}[]},id:string,releasedAt:string){
 if(history.some(r=>r.id===id))return history;
 if(history[0]&&!versionAfter(manifest.version,history[0].version))throw Error('Release version must increase.');
 const changes=pendingChanges(manifest.changes,history);if(!changes.length)throw Error('No unpublished changes in reviewed manifest.');
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(releasedAt));
 return historySchema.parse([{id,version:manifest.version,date,releasedAt,title:'正式发布',items:changes.slice().reverse().flatMap(x=>x.items),changeIds:changes.map(x=>x.id!)},...history]);
}
