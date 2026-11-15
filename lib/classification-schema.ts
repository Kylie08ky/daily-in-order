import {z} from 'zod';
export const domains=['language','learning','reading','fitness','work','life'] as const;
export const studyKinds=['personal','skills','professional'] as const;
export const classificationSchema=z.object({domain:z.enum(domains),study:z.enum(studyKinds).optional(),language:z.string().trim().max(60).optional(),detail:z.string().trim().max(80).optional()}).refine(c=>c.domain!=='learning'||!!c.study,'请选择学习二级分类。');
export type Classification=z.infer<typeof classificationSchema>;
export const classificationSelection=z.object({kind:z.enum(['task','template','series','course']),id:z.string().min(1).max(100)});
export const classificationChange=classificationSelection.extend({expected:z.string(),after:classificationSchema.nullable()});
export const classificationAudit=z.object({id:z.string().min(1).max(100),date:z.string(),undone:z.boolean().optional(),changes:z.array(classificationSelection.extend({before:classificationSchema.nullable(),after:classificationSchema.nullable()})).max(40000)});
