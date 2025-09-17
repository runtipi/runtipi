import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { dynamicComposeSchema } from '@runtipi/common/schemas';
import { AppDto } from '@/modules/apps/dto/app.dto';
import { AppInfoDto, AppInfoSimpleDto, MetadataDto } from '@/modules/marketplace/dto/marketplace.dto';

export const createCustomAppSchema = z.object({
  name: z
    .string()
    .min(1, 'App name is required')
    .max(50, 'App name must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'App name must contain only lowercase letters, numbers, and hyphens')
    .refine((name) => !name.startsWith('-') && !name.endsWith('-'), 'App name cannot start or end with a hyphen'),
  config: dynamicComposeSchema,
});

export class CreateCustomAppDto extends createZodDto(createCustomAppSchema) {}

export const createCustomAppResponseSchema = z.object({
  appUrn: z.string(),
  appName: z.string(),
  storeId: z.string(),
});

export class CreateCustomAppResponseDto extends createZodDto(createCustomAppResponseSchema) {}

export class GetCustomAppsResponseDto extends createZodDto(
  z.object({
    apps: z.array(
      z.object({
        app: AppDto.schema,
        info: AppInfoSimpleDto.schema,
        metadata: MetadataDto.schema,
      }),
    ),
  }),
) {}

export class GetCustomAppDto extends createZodDto(
  z.object({
    app: AppDto.schema,
    info: AppInfoDto.schema,
    metadata: MetadataDto.schema,
  }),
) {}
