import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  backupAllAppsMutation,
  seedDatabaseMutation,
  setAllAppSubnetToNullMutation,
  setAllAppUpdateAvailableMutation,
  restartAllAppsMutation,
} from '@/api-client/@tanstack/react-query.gen';

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);

  const isDevelopment = import.meta.env.DEV;

  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    setPressedKeys((prev) => new Set(prev).add(event.key.toLowerCase()));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.delete(event.key.toLowerCase());
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

  const restartAllApps = useMutation({
    ...restartAllAppsMutation(),
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

  // Don't render anything if not in development mode
  if (!isDevelopment) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            fontFamily: 'monospace',
            fontSize: '14px',
            border: '1px solid #444',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px' }}>Debug Panel</h3>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button type="button" onClick={() => seedMutation.mutate({})} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? 'Seeding...' : 'Seed Database'}
            </button>
            <button type="button" onClick={() => restartAllApps.mutate({})} disabled={restartAllApps.isPending}>
              {restartAllApps.isPending ? 'Starting...' : 'Restart All Apps'}
            </button>
            <button type="button" onClick={() => subnetsMutation.mutate({})} disabled={subnetsMutation.isPending}>
              {subnetsMutation.isPending ? 'Setting...' : 'Set All App Subnets to Null'}
            </button>
            <button type="button" onClick={() => versionMutation.mutate({})} disabled={versionMutation.isPending}>
              {versionMutation.isPending ? 'Setting...' : 'Set All Apps to Version 0'}
            </button>
            <button type="button" onClick={() => backupAllApps.mutate({})} disabled={backupAllApps.isPending}>
              {backupAllApps.isPending ? 'Backing up...' : 'Launch a backup of all apps at the same time'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
