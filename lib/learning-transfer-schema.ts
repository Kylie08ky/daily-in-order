import {z} from 'zod';
import {activityLink} from './life-schema.ts';
export const learningSelection=z.object({kind:z.enum(['task','entry','template','series']),id:z.string().min(1).max(100)});
export const learningTransferSchema=z.object({id:z.string(),date:z.string(),undone:z.boolean().default(false),changes:z.array(learningSelection.extend({before:activityLink.nullable(),after:activityLink})).max(40000)});
