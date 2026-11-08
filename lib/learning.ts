import {t} from './i18n.ts';
import type {Course} from './life-schema.ts';
// Keep legacy category keys readable when importing older personal workspaces.
const legacyLabels:Record<string,string>={listening:'听力',vocabulary:'词汇',speaking:'口语表达',other:'未分类'};
export const learningCategoryLabel=(value:string)=>legacyLabels[value]??value;
export function learningCategoryValue(value:string){const label=value.trim();if(label==='口语')return 'speaking';return Object.entries(legacyLabels).find(([,name])=>name===label)?.[0]||label||'other';}
export function learningCategories(courses:Course[]){return [...new Set(courses.filter(c=>!c.deletedAt).map(c=>c.category))].map(key=>[key,learningCategoryLabel(key)] as const);}
export function learningCategorySuggestions(courses:Course[]){return [...new Set([...learningCategories(courses).map(([,label])=>label),'专业课程','技能实践','考试准备','语言学习'])];}

// Localize only built-in category keys; custom categories remain verbatim.
export const displayLearningCategory=(value:string)=>legacyLabels[value]?t(legacyLabels[value]):value;
