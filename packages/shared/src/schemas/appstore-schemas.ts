import z from 'zod';

export const appstoreFileSchema = z.object({
    appstores: z.array(z.string())
})