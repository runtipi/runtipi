import { client } from '@/api-client/client.gen';

export type AgentCredential = { id: string; name: string; createdAt: number; expiresAt: number; lastUsedAt: number | null };
type CredentialList = { credentials: AgentCredential[] };
type CreatedCredential = { credential: AgentCredential; token: string };

export const listAgentCredentials = async () => {
  const { data } = await client.get<{ 200: CredentialList }, unknown, true>({ url: '/api/agent-credentials', throwOnError: true });
  return data;
};

export const createAgentCredential = async (body: { name: string; password: string; expiresInDays: number }, signal: AbortSignal) => {
  const { data } = await client.post<{ 201: CreatedCredential }, unknown, true>({
    url: '/api/agent-credentials',
    body,
    signal,
    headers: { 'Content-Type': 'application/json' },
    throwOnError: true,
  });
  return data;
};

export const revokeAgentCredential = async (id: string) => {
  await client.delete({ url: '/api/agent-credentials/{id}', path: { id }, throwOnError: true });
};
