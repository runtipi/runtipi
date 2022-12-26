import React from 'react';
import semver from 'semver';
import { Button } from '../../../../components/ui/Button';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { SystemRouterOutput } from '../../../../../server/routers/system/system.router';
import { useToastStore } from '../../../../state/toastStore';
import { RestartModal } from '../../components/RestartModal';
import { UpdateModal } from '../../components/UpdateModal/UpdateModal';
import { Layout } from '../../../../components/Layout/LayoutV2';
import { ContainerProps } from '../../../../types/layout-helpers';
import { trpc } from '../../../../utils/trpc';

type IProps = { data?: SystemRouterOutput['getVersion'] };

const SettingsContainerWithData: React.FC<Required<IProps>> = ({ data }) => {
  const [loading, setLoading] = React.useState(false);
  const { current, latest } = data;
  const { addToast } = useToastStore();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();

  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(current, latest || defaultVersion);

  const update = trpc.system.update.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setLoading(false);
      localStorage.removeItem('token');
    },
    onError: (error) => {
      setLoading(false);
      updateDisclosure.close();
      addToast({ title: 'Error', description: error.message, status: 'error' });
    },
  });

  const restart = trpc.system.restart.useMutation({
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: async () => {
      setLoading(false);

      localStorage.removeItem('token');
    },
    onError: (error) => {
      setLoading(false);
      restartDisclosure.close();
      addToast({ title: 'Error', description: error.message, status: 'error' });
    },
  });

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>Already up to date</Button>;
    }

    return (
      <div>
        <Button onClick={updateDisclosure.open} className="mr-2 btn-success">
          Update to {latest}
        </Button>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="row g-0">
        <div className="col-3 d-none d-md-block border-end">
          <div className="card-body">
            <h4 className="subheader">Tipi settings</h4>
            <div className="list-group list-group-transparent">
              <span className="cursor-pointer list-group-item list-group-item-action active">Actions</span>
            </div>
          </div>
        </div>
        <div className="col d-flex flex-column">
          <div className="card-body">
            <h2 className="mb-4">Actions</h2>
            <h3 className="card-title mt-4">Version</h3>
            <p className="card-subtitle">Stay up to date with the latest version of Tipi</p>
            {renderUpdate()}
            <h3 className="card-title mt-4">Maintenance</h3>
            <p className="card-subtitle">Common actions to perform on your instance</p>
            <div>
              <Button onClick={restartDisclosure.open}>Restart</Button>
            </div>
          </div>
        </div>
        <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} onConfirm={() => restart.mutate()} loading={loading} />
        <UpdateModal isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} onConfirm={() => update.mutate()} loading={loading} />
      </div>
    </div>
  );
};

export const SettingsContainer: React.FC<ContainerProps<IProps>> = ({ data, loading, error }) => (
  <Layout title="Settings" data={data} loading={loading} error={error}>
    <SettingsContainerWithData data={data!} />
  </Layout>
);
