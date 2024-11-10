import { APP_STATUS } from '@/core/database/schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { APP_CATEGORIES, AppInfoDto, AppInfoSimpleDto } from './app-info.dto';

// Search apps
export class SearchAppsQueryDto extends createZodDto(
  z.object({
    search: z.string().optional(),
    pageSize: z.coerce.number().optional(),
    cursor: z.string().optional(),
    category: z.enum(APP_CATEGORIES).optional(),
  }),
) {}

export class SearchAppsDto extends createZodDto(
  z.object({
    data: AppInfoSimpleDto.schema.array(),
    nextCursor: z.string().optional(),
    total: z.number(),
  }),
) {}

export class UpdateInfoDto extends createZodDto(
  z.object({
    latestVersion: z.number(),
    minTipiVersion: z.string().optional(),
    latestDockerVersion: z.string().optional(),
  }),
) {}

export class AppDto extends createZodDto(
  z.object({
    id: z.string(),
    status: z.enum(APP_STATUS),
    lastOpened: z.string().nullable(),
    numOpened: z.number().default(0),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    version: z.number(),
    exposed: z.boolean(),
    openPort: z.boolean(),
    exposedLocal: z.boolean(),
    domain: z.string().nullable(),
    isVisibleOnGuestDashboard: z.boolean(),
    config: z.record(z.any()).optional(),
  }),
) {}

export class MyAppsDto extends createZodDto(
  z.object({
    installed: z
      .object({
        app: AppDto.schema,
        info: AppInfoSimpleDto.schema,
        updateInfo: UpdateInfoDto.schema,
      })
      .array(),
  }),
) {}

export class GuestAppsDto extends createZodDto(
  z.object({
    installed: z
      .object({
        app: AppDto.schema,
        info: AppInfoDto.schema,
        updateInfo: UpdateInfoDto.schema,
      })
      .array(),
  }),
) {}

// App details
export class AppDetailsDto extends createZodDto(
  z.object({
    info: AppInfoDto.schema,
    app: AppDto.schema,
    updateInfo: UpdateInfoDto.schema,
  }),
) {}
