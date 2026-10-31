import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { createAgentCredential, listAgentCredentials, revokeAgentCredential } from '../../api/agent-credentials';
import { AgentClientConfigTabs } from './agent-client-config-tabs';

const queryKey = ['agent-credentials'];
type Issuance = { status: 'idle' | 'pending' | 'failed' } | { status: 'ready'; token: string };

export const AgentCredentials = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(90);

  const [issuance, setIssuance] = useState<Issuance>({ status: 'idle' });

  const request = useRef<AbortController | null>(null);

  const credentials = useQuery({ queryKey, queryFn: listAgentCredentials });

  const token = issuance.status === 'ready' ? issuance.token : '';
  const creating = issuance.status === 'pending';

  useEffect(() => () => request.current?.abort(), []);

  const revoke = useMutation({
    mutationFn: revokeAgentCredential,
    onSuccess: () => {
      setIssuance({ status: 'idle' });
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const endpoint = typeof window === 'undefined' ? '/api/mcp' : `${window.location.origin}/api/mcp`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const body = { name, password, expiresInDays };

    setPassword('');
    setIssuance({ status: 'pending' });

    try {
      const result = await createAgentCredential(body, controller.signal);
      if (controller.signal.aborted) return;

      setIssuance({ status: 'ready', token: result.token });
      setName('');
      void queryClient.invalidateQueries({ queryKey });
    } catch {
      if (!controller.signal.aborted) setIssuance({ status: 'failed' });
    } finally {
      if (request.current === controller) request.current = null;
    }
  };

  return (
    <section className="mt-4" aria-labelledby="agent-access-title">
      <h2 id="agent-access-title">{t('SETTINGS_AGENT_TITLE')}</h2>
      <p className="text-muted">{t('SETTINGS_AGENT_DESCRIPTION')}</p>
      <p>
        {t('SETTINGS_AGENT_ENDPOINT')}: <code>{endpoint}</code>
      </p>
      <form onSubmit={(event) => void submit(event)} className="mb-3">
        <Input
          name="agent-name"
          label={t('SETTINGS_AGENT_NAME')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
          disabled={creating}
        />
        <Input
          name="agent-password"
          className="mt-2"
          label={t('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={creating}
        />
        <Input
          name="agent-expiry"
          className="mt-2"
          label={t('SETTINGS_AGENT_EXPIRY')}
          type="number"
          min={1}
          max={365}
          value={expiresInDays}
          onChange={(event) => setExpiresInDays(Number(event.target.value))}
          required
          disabled={creating}
        />
        <Button type="submit" className="mt-3" loading={creating}>
          {t('SETTINGS_AGENT_CREATE')}
        </Button>
      </form>
      {issuance.status === 'failed' && (
        <p role="alert" className="text-danger">
          {t('SETTINGS_AGENT_CREATE_ERROR')}
        </p>
      )}
      {token && (
        <div className="alert alert-success d-block">
          <output className="d-block mb-3">{t('SETTINGS_AGENT_TOKEN_NOTICE')}</output>
          <Input
            name="agent-token"
            label={t('SETTINGS_AGENT_TOKEN')}
            value={token}
            readOnly
            autoComplete="off"
            onFocus={(event) => event.target.select()}
          />
          <AgentClientConfigTabs endpoint={endpoint} token={token} />
          <Button type="button" variant="outline" onClick={() => setIssuance({ status: 'idle' })}>
            {t('SETTINGS_AGENT_DISMISS')}
          </Button>
        </div>
      )}
      {credentials.isPending && <output>{t('SETTINGS_AGENT_LOADING')}</output>}
      {credentials.isError && (
        <p role="alert" className="text-danger">
          {t('SETTINGS_AGENT_LIST_ERROR')}
        </p>
      )}
      {revoke.isError && (
        <p role="alert" className="text-danger">
          {t('SETTINGS_AGENT_REVOKE_ERROR')}
        </p>
      )}
      {credentials.data?.credentials.map((credential) => (
        <div className="d-flex align-items-center justify-content-between border-top py-3 gap-3" key={credential.id}>
          <div>
            <strong>{credential.name}</strong>
            <div className="text-muted">{t('SETTINGS_AGENT_EXPIRES', { date: new Date(credential.expiresAt * 1000).toLocaleDateString() })}</div>
          </div>
          <Button
            type="button"
            intent="danger"
            variant="outline"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(credential.id)}
            aria-label={t('SETTINGS_AGENT_REVOKE_NAMED', { name: credential.name })}
          >
            {t('SETTINGS_AGENT_REVOKE')}
          </Button>
        </div>
      ))}
    </section>
  );
};
