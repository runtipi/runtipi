import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

export const createAgentCredentialSchema = type({
  name: type('string.trim').to('1 <= string <= 80'),
  password: 'string >= 1',
  expiresInDays: '1 <= number.integer <= 365 = 90',
});

const agentCredentialSchema = type({
  id: 'string',
  name: 'string',
  createdAt: 'number',
  expiresAt: 'number',
  lastUsedAt: 'number | null',
});

export class CreateAgentCredentialBody extends createArkDto(createAgentCredentialSchema, { name: 'CreateAgentCredentialBody', input: true }) {}
export class AgentCredentialsDto extends createArkDto(type({ credentials: agentCredentialSchema.array() }), { name: 'AgentCredentialsDto' }) {}
export class CreatedAgentCredentialDto extends createArkDto(type({ credential: agentCredentialSchema, token: 'string' }), {
  name: 'CreatedAgentCredentialDto',
}) {}
