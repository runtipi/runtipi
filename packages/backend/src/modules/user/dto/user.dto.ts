import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  totpEnabled: z.boolean(),
  locale: z.string(),
  operator: z.boolean(),
  hasSeenWelcome: z.boolean(),
});

export class UserDto extends createZodDto(userSchema) {}
