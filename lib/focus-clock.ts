import type { State } from './model';

// Both the live display and settlement use elapsed wall time, not task completion.
export function focusSeconds(focus: State['focus'], now: number): number {
  if (!focus) return 0;
  const elapsed = focus.seconds + (focus.startedAt ? Math.max(0, (now - Date.parse(focus.startedAt)) / 1000) : 0);
  return focus.mode === 'countdown' ? Math.min(focus.target, elapsed) : elapsed;
}

export function potentialWealth(seconds: number, hourlyRate: number): number {
  return Math.round(seconds / 3600 * hourlyRate * 1000) / 1000;
}

// Close only the active interval. Pauses are gaps, and a late countdown
// settlement ends at its actual deadline, never at the click time.
export function closeFocusSpan(focus:NonNullable<State['focus']>,now:number){
 const spans=[...(focus.spans||[])];
 const added=Math.max(0,focusSeconds(focus,now)-focus.seconds);
 if(focus.startedAt&&added>0)spans.push({startedAt:focus.startedAt,endedAt:new Date(Date.parse(focus.startedAt)+added*1000).toISOString()});
 return spans;
}
