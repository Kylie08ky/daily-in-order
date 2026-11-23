export type DoneRange={start:string;end:string};
const minuteOf=(v:string)=>{const [h,m]=v.split(':').map(Number);return h*60+m;};

/** Pure helper (also used by tests): total minutes and the first problem, if any, for the ranges typed so far. */
export function rangesSummary(ranges:DoneRange[]):{minutes:number;problem:string}{
 const filled=ranges.filter(r=>r.start&&r.end);let minutes=0,problem='';
 for(const r of filled){const d=minuteOf(r.end)-minuteOf(r.start);if(d<=0)problem||='结束要晚于开始。';else minutes+=d;}
 const sorted=[...filled].sort((a,b)=>a.start.localeCompare(b.start));
 for(let i=1;i<sorted.length;i++)if(sorted[i].start<sorted[i-1].end&&minuteOf(sorted[i-1].end)>minuteOf(sorted[i-1].start))problem||='几段时间有重叠。';
 return {minutes,problem};
}

