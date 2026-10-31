import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAgentClientConfigs } from './agent-client-configs';

export const AgentClientConfigTabs = ({ endpoint, token }: { endpoint: string; token: string }) => {
  const { t } = useTranslation();

  const [copiedClient, setCopiedClient] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const configurations = getAgentClientConfigs(endpoint, token);

  const copy = async (configuration: (typeof configurations)[number]) => {
    setCopiedClient(null);
    setCopyFailed(false);

    try {
      await navigator.clipboard.writeText(configuration.content);
      setCopiedClient(configuration.id);
    } catch {
      setCopyFailed(true);
    }
  };

  const changeTab = () => {
    setCopiedClient(null);
    setCopyFailed(false);
  };

  return (
    <Tabs defaultValue="claude-code" className="mt-3 mb-3" onValueChange={changeTab}>
      <TabsList aria-label={t('SETTINGS_AGENT_CLIENT_CONFIGS')}>
        {configurations.map((configuration) => (
          <TabsTrigger key={configuration.id} value={configuration.id}>
            {configuration.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {configurations.map((configuration) => (
        <TabsContent key={configuration.id} value={configuration.id}>
          <p className="text-muted small mb-2">
            {t('SETTINGS_AGENT_CONFIG_FILE')} <code>{configuration.file}</code>
          </p>
          <textarea
            className="form-control font-monospace mb-3"
            aria-label={t('SETTINGS_AGENT_CONFIG_LABEL', { client: configuration.label })}
            value={configuration.content}
            rows={configuration.content.split('\n').length}
            readOnly
            wrap="off"
            autoComplete="off"
            spellCheck={false}
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" variant="outline" onClick={() => void copy(configuration)}>
            {copiedClient === configuration.id ? <IconCheck size={16} className="me-2" /> : <IconCopy size={16} className="me-2" />}
            {copiedClient === configuration.id ? t('SETTINGS_AGENT_CONFIG_COPIED') : t('SETTINGS_AGENT_COPY_CONFIG')}
          </Button>
          {copyFailed && (
            <p className="text-danger mt-2 mb-0" role="alert">
              {t('SETTINGS_AGENT_CONFIG_COPY_ERROR')}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
};
