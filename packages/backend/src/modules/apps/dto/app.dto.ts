import { APP_STATUS } from '@/core/database/drizzle/types';
import { AppInfoDto, AppInfoSimpleDto, MetadataDto } from '@/modules/marketplace/dto/marketplace.dto';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
    installed: z.array(
      z.object({
        app: AppDto.schema,
        info: AppInfoSimpleDto.schema,
        metadata: MetadataDto.schema,
      }),
    ),
  }),
) {}

export class GuestAppsDto extends createZodDto(
  z.object({
    installed: z
      .object({
        app: AppDto.schema,
        info: AppInfoDto.schema,
      })
      .array(),
  }),
) {}

export class GetAppDto extends createZodDto(
  z.object({
    app: AppDto.schema.nullish(),
    info: AppInfoDto.schema,
    metadata: MetadataDto.schema,
  }),
) {}
