import {z} from 'zod';
export const wereadId=z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
export const wereadSnapshotSchema=z.object({
 bookId:wereadId,progress:z.number().int().min(0).max(100),
 updatedAt:z.number().int().nonnegative(),syncedAt:z.string().datetime(),
 chapterUid:z.number().int().nonnegative().optional(),
 readerLink:z.string().max(2000).refine(v=>!v||/^https:\/\/weread\.qq\.com\//.test(v)).default('')
});
