import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class StreamAppLogsQueryDto extends createZodDto(
  z.object({
    appUrn: z.string().refine((v) => v.split(':').length === 2),
    maxLines: z.number().optional(),
  }),
) {}

export class StreamRuntipiLogsQueryDto extends createZodDto(
  z.object({
    maxLines: z.number().optional(),
  }),
) {}
