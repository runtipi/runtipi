import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const userSchema = type({
  id: 'number.integer',
  username: 'string.trim',
  totpEnabled: 'boolean',
  locale: 'string.trim',
  operator: 'boolean',
  hasSeenWelcome: 'boolean',
});

export class UserDto extends createArkDto(userSchema, { name: 'UserDto' }) {}
