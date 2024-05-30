import z from 'zod';

export const appStoresFileSchema = z.object({
    appstores: z.array(z.string())
})