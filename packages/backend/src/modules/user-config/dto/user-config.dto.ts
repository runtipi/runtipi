import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class GetUserConfigDto extends createZodDto(
  z.object({
    dockerCompose: z.string().nullable().describe('The content of the docker-compose.yml file.'),
    appEnv: z.string().nullable().describe('The content of the app.env file.'),
    isEnabled: z.boolean().describe('Whether the user configuration is enabled for the app.'),
  }),
) {}

export class UpdateUserConfigDto extends createZodDto(
  z.object({
    dockerCompose: z.string().describe('The content of the docker-compose.yml file.'),
    appEnv: z.string().describe('The content of the app.env file.'),
  }),
) {}
