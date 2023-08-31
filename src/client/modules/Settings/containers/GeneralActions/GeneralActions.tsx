import React from 'react';
import semver from 'semver';
import { toast } from 'react-hot-toast';
import Markdown from '@/components/Markdown/Markdown';
import { IconStar } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { MessageKey } from '@/server/utils/errors';
import { Button } from '../../../../components/ui/Button';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { RestartModal } from '../../components/RestartModal';
import { UpdateModal } from '../../components/UpdateModal/UpdateModal';
import { trpc } from '../../../../utils/trpc';
import { useSystemStore } from '../../../../state/systemStore';

export const GeneralActions = () => {
  const t = useTranslations();
  const versionQuery = trpc.system.getVersion.useQuery(undefined, { staleTime: 0 });

  const [loading, setLoading] = React.useState(false);
  const { setPollStatus } = useSystemStore();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();

  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(versionQuery.data?.current || defaultVersion, versionQuery.data?.latest || defaultVersion);

  const update = trpc.system.update.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setPollStatus(true);
    },
    onError: (e) => {
      updateDisclosure.close();
      setLoading(false);
      toast.error(t(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
    },
  });

  const restart = trpc.system.restart.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setPollStatus(true);
    },
    onError: (e) => {
      restartDisclosure.close();
      setLoading(false);
      toast.error(t(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
    },
  });

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>{t('settings.actions.already-latest')}</Button>;
    }

    return (
      <div>
        {versionQuery.data?.body && (
          <div className="mt-3 card col-12 col-md-8">
            <div className="card-stamp">
              <div className="card-stamp-icon bg-yellow">
                <IconStar size={80} />
              </div>
            </div>
            <div className="card-body">
              <Markdown className="">{versionQuery.data.body}</Markdown>
            </div>
          </div>
        )}
        <Button onClick={updateDisclosure.open} className="mt-3 mr-2 btn-success">
          {t('settings.actions.update', { version: versionQuery.data?.latest })}
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="card-body">
        <h2 className="mb-4">{t('settings.actions.title')}</h2>
        <h3 className="card-title mt-4">{t('settings.actions.current-version', { version: versionQuery.data?.current })}</h3>
        <p className="card-subtitle">{isLatest ? t('settings.actions.stay-up-to-date') : t('settings.actions.new-version', { version: versionQuery.data?.latest })}</p>
        {renderUpdate()}
        <h3 className="card-title mt-4">{t('settings.actions.maintenance-title')}</h3>
        <p className="card-subtitle">{t('settings.actions.maintenance-subtitle')}</p>
        <div>
          <Button onClick={restartDisclosure.open}>{t('settings.actions.restart')}</Button>
        </div>
      </div>
      <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} onConfirm={() => restart.mutate()} loading={loading} />
      <UpdateModal isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} onConfirm={() => update.mutate()} loading={loading} />
    </>
  );
};
