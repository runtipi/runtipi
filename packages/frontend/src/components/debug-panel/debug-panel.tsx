import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  backupAllAppsMutation,
  incrementAllAppVersionsMutation,
  seedDatabaseMutation,
  setAllAppSubnetToNullMutation,
  setAllAppUpdateAvailableMutation,
  startAllAppsMutation,
} from '@/api-client/@tanstack/react-query.gen';
import { Button } from '../ui/Button';
import './debug-panel.css';
import { IconX } from '@tabler/icons-react';

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);

  const isDevelopment = import.meta.env.DEV;

  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key) {
      setPressedKeys((prev) => new Set(prev).add(event.key.toLowerCase()));
    }
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      if (event.key) {
        newSet.delete(event.key.toLowerCase());
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    const checkKeys = () => {
      if (pressedKeys.has('d') && pressedKeys.has('e') && pressedKeys.has('v')) {
        setIsVisible(true);
      }
    };

    checkKeys();
  }, [pressedKeys]);

  useEffect(() => {
    if (!isDevelopment) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const seedMutation = useMutation({
    ...seedDatabaseMutation(),
    onSuccess: () => {
      toast.success('Database seeded successfully!');
    },
    onError: () => {
      toast.error('Failed to seed database');
    },
  });

  const startAllApps = useMutation({
    ...startAllAppsMutation(),
    onSuccess: () => {
      toast.success('All apps started successfully!');
    },
    onError: () => {
      toast.error('Failed to start all apps');
    },
  });

  const subnetsMutation = useMutation({
    ...setAllAppSubnetToNullMutation(),
    onSuccess: () => {
      toast.success('All app subnets set to null successfully!');
    },
    onError: () => {
      toast.error('Failed to set all app subnets to null');
    },
  });

  const versionMutation = useMutation({
    ...setAllAppUpdateAvailableMutation(),
    onSuccess: () => {
      toast.success('All apps set to version 0 successfully!');
    },
    onError: () => {
      toast.error('Failed to set all apps to version 0');
    },
  });

  const backupAllApps = useMutation({
    ...backupAllAppsMutation(),
    onSuccess: () => {
      toast.success('Backup of all apps started successfully!');
    },
    onError: () => {
      toast.error('Failed to start backup of all apps');
    },
  });

  const incrementAllAppVersions = useMutation({
    ...incrementAllAppVersionsMutation(),
    onSuccess: () => {
      toast.success('App versions incremented successfully!');
    },
    onError: () => {
      toast.error('Failed to increment app versions');
    },
  });

  // Don't render anything if not in development mode
  if (!isDevelopment) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div className="card debug-panel">
          <div className="card-header d-flex justify-content-between">
            <h3 className="card-title">Developer Tools</h3>
            <Button variant="ghost" intent="danger" size="sm" aria-label="Close" onClick={() => setIsVisible(false)}>
              <IconX size={16} />
            </Button>
          </div>
          <div className="card-body d-flex flex-column" style={{ gap: '0.5rem' }}>
            <Button onClick={() => seedMutation.mutate({})}>{seedMutation.isPending ? 'Seeding...' : 'Seed database'}</Button>
            <Button onClick={() => startAllApps.mutate({})}>{startAllApps.isPending ? 'Starting all apps...' : 'Start all apps'}</Button>
            <Button onClick={() => subnetsMutation.mutate({})}>
              {subnetsMutation.isPending ? 'Setting subnets to null...' : 'Set all app subnets to null'}
            </Button>
            <Button onClick={() => versionMutation.mutate({})}>
              {versionMutation.isPending ? 'Setting all apps to version 0...' : 'Set all apps to version 0'}
            </Button>
            <Button onClick={() => backupAllApps.mutate({})}>{backupAllApps.isPending ? 'Backing up all apps...' : 'Backup all apps'}</Button>
            <Button onClick={() => incrementAllAppVersions.mutate({})}>
              {incrementAllAppVersions.isPending ? 'Incrementing app versions...' : 'Increment all app versions'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
