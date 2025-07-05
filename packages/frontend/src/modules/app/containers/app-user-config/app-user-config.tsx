import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { copilot } from '@uiw/codemirror-theme-copilot';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import type { AppInfo } from '@/types/app.types';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  disableUserConfigMutation,
  enableUserConfigMutation,
  getUserConfigOptions,
  updateUserConfigMutation,
} from '@/api-client/@tanstack/react-query.gen';
import toast from 'react-hot-toast';
import type { TranslatableError } from '@/types/error.types';

interface AppUserConfigProps {
  info: AppInfo;
  initialDockerCompose?: string;
  initialAppEnv?: string;
  initialIsEnabled?: boolean;
}

export const AppUserConfig = (props: AppUserConfigProps) => {
  const { info } = props;

  const { data } = useSuspenseQuery({
    ...getUserConfigOptions({ path: { urn: info.urn } }),
  });

  return (
    <AppUserConfigEditors
      info={info}
      initialAppEnv={data.appEnv || ''}
      initialDockerCompose={data.dockerCompose || ''}
      initialIsEnabled={data.isEnabled}
    />
  );
};

export const AppUserConfigEditors = ({ info, initialAppEnv, initialDockerCompose, initialIsEnabled }: AppUserConfigProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('docker-compose');

  const [dockerCompose, setDockerCompose] = useState(initialDockerCompose ?? '');
  const [appEnv, setAppEnv] = useState(initialAppEnv ?? '');
  const [isEnabled, setIsEnabled] = useState(initialIsEnabled ?? true);

  const updateMutation = useMutation({
    ...updateUserConfigMutation(),
    onSuccess: () => {
      toast.success(t('USER_CONFIG_UPDATE_SUCCESS'));
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const enableMutation = useMutation({
    ...enableUserConfigMutation(),
    onSuccess: () => {
      setIsEnabled(true);
    },
  });

  const disableMutation = useMutation({
    ...disableUserConfigMutation(),
    onSuccess: () => {
      setIsEnabled(false);
    },
  });

  const handleToggleEnabled = (checked: boolean) => {
    if (checked) {
      enableMutation.mutate({ path: { urn: info.urn } });
    } else {
      disableMutation.mutate({ path: { urn: info.urn } });
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ path: { urn: info.urn }, body: { dockerCompose: dockerCompose.trimEnd(), appEnv: appEnv.trimEnd() } });
  };

  return (
    <div>
      <Alert variant="warning">
        <AlertIcon>
          <IconAlertCircle stroke={2} />
        </AlertIcon>
        <div>
          <AlertHeading>{t('USER_CONFIG_WARNING_TITLE')}</AlertHeading>
          <AlertDescription>{t('USER_CONFIG_WARNING_DESCRIPTION')}</AlertDescription>
        </div>
      </Alert>
      <div className="d-flex mb-3 align-items-center justify-content-between">
        <Switch className="mt-2" label={t('USER_CONFIG_ENABLE')} checked={isEnabled} onCheckedChange={handleToggleEnabled} />
        <Button onClick={handleSave}>{t('SAVE')}</Button>
      </div>
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="docker-compose">docker-compose.yml</TabsTrigger>
            <TabsTrigger value="app-env">app.env</TabsTrigger>
          </TabsList>
          <TabsContent value="docker-compose">
            <CodeMirror readOnly={!isEnabled} value={dockerCompose} height="400px" extensions={[yaml()]} onChange={(value) => setDockerCompose(value)} theme={copilot} />
            <Trans
              t={t}
              i18nKey="USER_CONFIG_DOCKER_MERGE_DESCRIPTION"
              components={{
                a: <a target="_blank" rel="noopener" href="https://docs.docker.com/reference/compose-file/merge/" />,
                code: <code />,
              }}
              className='mt-2'
            />
          </TabsContent>
          <TabsContent value="app-env">
            <CodeMirror readOnly={!isEnabled} value={appEnv} height="400px" onChange={(value) => setAppEnv(value)} theme={copilot} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
