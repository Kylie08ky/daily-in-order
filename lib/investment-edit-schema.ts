import {z} from 'zod';
export const investmentEditSchema=z.object({id:z.string().max(100),date:z.string(),kind:z.enum(['task','entry']),recordId:z.string().max(100),before:z.string().max(2000000),after:z.string().max(2000000),undone:z.boolean().default(false)});
