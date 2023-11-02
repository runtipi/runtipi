'use client';

import React from 'react';
import semver from 'semver';
import { toast } from 'react-hot-toast';
import { Markdown } from '@/components/Markdown';
import { IconStar } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { useSystemStore } from '@/client/state/systemStore';
import { useAction } from 'next-safe-action/hook';
import { restartAction } from '@/actions/settings/restart';
import { RestartModal } from '../RestartModal';

type Props = { version: { current: string; latest: string; body?: string | null } };

export const GeneralActions = (props: Props) => {
  const t = useTranslations();
  const { version } = props;

  const [loading, setLoading] = React.useState(false);
  const { setPollStatus, setStatus } = useSystemStore();
  const restartDisclosure = useDisclosure();

  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(version.current || defaultVersion, version.latest || defaultVersion);

  const restartMutation = useAction(restartAction, {
    onSuccess: (data) => {
      if (data.success) {
        setPollStatus(true);
        setStatus('RESTARTING');
      } else {
        restartDisclosure.close();
        setLoading(false);
        toast.error(data.failure.reason);
      }
    },
    onExecute: () => {
      setLoading(true);
    },
  });

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>{t('settings.actions.already-latest')}</Button>;
    }

    return (
      <div>
        {version.body && (
          <div className="mt-3 card col-12 col-md-8">
            <div className="card-stamp">
              <div className="card-stamp-icon bg-yellow">
                <IconStar size={80} />
              </div>
            </div>
            <div className="card-body">
              <Markdown className="">{version.body}</Markdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="card-body">
        <h2 className="mb-4">{t('settings.actions.title')}</h2>
        <h3 className="card-title mt-4">{t('settings.actions.current-version', { version: version.current })}</h3>
        <p className="card-subtitle">{isLatest ? t('settings.actions.stay-up-to-date') : t('settings.actions.new-version', { version: version.latest })}</p>
        {renderUpdate()}
        <h3 className="card-title mt-4">{t('settings.actions.maintenance-title')}</h3>
        <p className="card-subtitle">{t('settings.actions.maintenance-subtitle')}</p>
        <div>
          <Button onClick={restartDisclosure.open}>{t('settings.actions.restart')}</Button>
        </div>
      </div>
      <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} onConfirm={() => restartMutation.execute()} loading={loading} />
    </>
  );
};
