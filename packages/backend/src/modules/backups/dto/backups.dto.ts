import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class BackupDto extends createZodDto(
  z.object({
    id: z.string(),
    size: z.number(),
    date: z.number(),
  }),
) {}

export class RestoreAppBackupDto extends createZodDto(
  z.object({
    filename: z.string(),
  }),
) {}

export class GetAppBackupsDto extends createZodDto(
  z.object({
    data: BackupDto.schema.array(),
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
  }),
) {}

export class GetAppBackupsQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().optional(),
    pageSize: z.coerce.number().optional(),
  }),
) {}

export class DeleteAppBackupBodyDto extends createZodDto(
  z.object({
    filename: z.string(),
  }),
) {}
