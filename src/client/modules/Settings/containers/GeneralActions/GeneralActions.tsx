import React from 'react';
import semver from 'semver';
import { toast } from 'react-hot-toast';
import Markdown from '@/components/Markdown/Markdown';
import { IconStar } from '@tabler/icons-react';
import { Button } from '../../../../components/ui/Button';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { RestartModal } from '../../components/RestartModal';
import { UpdateModal } from '../../components/UpdateModal/UpdateModal';
import { trpc } from '../../../../utils/trpc';
import { useSystemStore } from '../../../../state/systemStore';

export const GeneralActions = () => {
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
    onError: (error) => {
      updateDisclosure.close();
      setLoading(false);
      toast.error(`Error updating instance: ${error.message}`);
    },
  });

  const restart = trpc.system.restart.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setPollStatus(true);
    },
    onError: (error) => {
      restartDisclosure.close();
      setLoading(false);
      toast.error(`Error restarting instance: ${error.message}`);
    },
  });

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>Already up to date</Button>;
    }

    return (
      <div>
        {versionQuery.data?.body && (
          <div className="mt-3 card col-4">
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
          Update to {versionQuery.data?.latest}
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="card-body">
        <h2 className="mb-4">Actions</h2>
        <h3 className="card-title mt-4">Current version: {versionQuery.data?.current}</h3>
        <p className="card-subtitle">{isLatest ? 'Stay up to date with the latest version of Tipi' : `A new version (${versionQuery.data?.latest}) of Tipi is available`}</p>
        {renderUpdate()}
        <h3 className="card-title mt-4">Maintenance</h3>
        <p className="card-subtitle">Common actions to perform on your instance</p>
        <div>
          <Button onClick={restartDisclosure.open}>Restart</Button>
        </div>
      </div>
      <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} onConfirm={() => restart.mutate()} loading={loading} />
      <UpdateModal isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} onConfirm={() => update.mutate()} loading={loading} />
    </>
  );
};
