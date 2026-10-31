import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConfigurationService } from '@/core/config/configuration.service';
import { DATABASE, type Database } from '@/core/database/database.module';
import { agentCredential, user } from '@/core/database/drizzle/schema';
import { PasswordConfirmationService } from '@/core/password/password-confirmation.service';
import { UserRepository } from '@/modules/user/user.repository';
import { BadRequestException, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import type { CreateAgentCredentialBody } from './agent-credentials.dto';

export type AgentIdentity = { user: NonNullable<Awaited<ReturnType<UserRepository['getUserDtoById']>>>; credentialId: string };

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const nowSeconds = () => Math.floor(Date.now() / 1000);
const publicColumns = {
  id: agentCredential.id,
  name: agentCredential.name,
  createdAt: agentCredential.createdAt,
  expiresAt: agentCredential.expiresAt,
  lastUsedAt: agentCredential.lastUsedAt,
};

@Injectable()
export class AgentCredentialsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly users: UserRepository,
    private readonly passwords: PasswordConfirmationService,
    private readonly config: ConfigurationService,
  ) {}

  private fingerprint(account: NonNullable<Awaited<ReturnType<UserRepository['getUserById']>>>) {
    return digest(JSON.stringify(['permanent-revocation-v1', account.username, account.password, account.totpEnabled]));
  }

  async create(userId: number, input: CreateAgentCredentialBody) {
    if (this.config.get('demoMode')) throw new ForbiddenException('Agent credentials cannot be created in demo mode');

    return this.db.transaction(async (tx) => {
      const [account] = await tx.select().from(user).where(eq(user.id, userId)).for('update');
      if (!account || !(await this.passwords.verify(userId, input.password, account.password))) throw new UnauthorizedException('Invalid password');

      const existing = await tx
        .select({ id: agentCredential.id })
        .from(agentCredential)
        .where(and(eq(agentCredential.userId, userId), gt(agentCredential.expiresAt, nowSeconds())));
      if (existing.length >= 20) throw new BadRequestException('Revoke an existing agent credential before creating another');

      const id = randomUUID();
      const token = `rtm_${id}_${randomBytes(32).toString('base64url')}`;
      const createdAt = nowSeconds();
      const [credential] = await tx
        .insert(agentCredential)
        .values({
          id,
          userId,
          name: input.name,
          tokenHash: digest(token),
          accountFingerprint: this.fingerprint(account),
          createdAt,
          expiresAt: createdAt + input.expiresInDays * 86400,
        })
        .returning(publicColumns);

      return { credential, token };
    });
  }

  async list(userId: number) {
    return this.db
      .select(publicColumns)
      .from(agentCredential)
      .where(and(eq(agentCredential.userId, userId), gt(agentCredential.expiresAt, nowSeconds())));
  }

  async revoke(userId: number, id: string) {
    await this.db.delete(agentCredential).where(and(eq(agentCredential.userId, userId), eq(agentCredential.id, id)));
  }

  async authenticate(authorization?: string): Promise<AgentIdentity> {
    const match = /^Bearer (rtm_[a-f0-9-]{36}_[A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
    if (!match?.[1]) throw new UnauthorizedException('An agent bearer token is required');

    const [credential] = await this.db
      .select()
      .from(agentCredential)
      .where(and(eq(agentCredential.tokenHash, digest(match[1])), gt(agentCredential.expiresAt, nowSeconds())));
    if (!credential) throw new UnauthorizedException('Invalid or expired agent credential');

    const account = await this.users.getUserById(credential.userId);
    if (!account || this.fingerprint(account) !== credential.accountFingerprint)
      throw new UnauthorizedException('The account has changed; create a new agent credential');

    const user = await this.users.getUserDtoById(account.id);
    if (!user) throw new UnauthorizedException();

    await this.db.update(agentCredential).set({ lastUsedAt: nowSeconds() }).where(eq(agentCredential.id, credential.id));

    return { user, credentialId: credential.id };
  }
}
