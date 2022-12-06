import React, { useState } from 'react';
import semver from 'semver';
import { Button } from '../../../../components/ui/Button';
import { useRestartMutation, useUpdateMutation } from '../../../../generated/graphql';
import { useDisclosure } from '../../../../hooks/useDisclosure';
import { useToastStore } from '../../../../state/toastStore';
import { RestartModal } from '../../components/RestartModal';
import { UpdateModal } from '../../components/UpdateModal/UpdateModal';

// eslint-disable-next-line no-promise-executor-return
const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

interface IProps {
  currentVersion: string;
  latestVersion?: string | null;
}

export const SettingsContainer: React.FC<IProps> = ({ currentVersion, latestVersion }) => {
  const { addToast } = useToastStore();
  const restartDisclosure = useDisclosure();
  const updateDisclosure = useDisclosure();
  const [loading, setLoading] = useState(false);

  const [restart] = useRestartMutation();
  const [update] = useUpdateMutation();

  const defaultVersion = '0.0.0';
  const isLatest = semver.gte(currentVersion, latestVersion || defaultVersion);

  const handleError = (error: unknown) => {
    restartDisclosure.close();
    updateDisclosure.close();
    if (error instanceof Error) {
      addToast({
        title: 'Error',
        description: error.message,
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    }
  };

  const renderUpdate = () => {
    if (isLatest) {
      return <Button disabled>Already up to date</Button>;
    }

    return (
      <div>
        <Button onClick={updateDisclosure.open} className="mr-2 btn-success">
          Update to {latestVersion}
        </Button>
      </div>
    );
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      await restart();
      await wait(1000);
      localStorage.removeItem('token');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await update();
      await wait(1000);
      localStorage.removeItem('token');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
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
        <RestartModal isOpen={restartDisclosure.isOpen} onClose={restartDisclosure.close} onConfirm={handleRestart} loading={loading} />
        <UpdateModal isOpen={updateDisclosure.isOpen} onClose={updateDisclosure.close} onConfirm={handleUpdate} loading={loading} />
      </div>
    </div>
  );
};
