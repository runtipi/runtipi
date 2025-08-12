import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { seedDatabaseMutation } from '@/api-client/@tanstack/react-query.gen';

export const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  // Track which keys are currently pressed
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  // Handle key down events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Add pressed key to the set
    setPressedKeys((prev) => new Set(prev).add(event.key.toLowerCase()));
  }, []);

  // Handle key up events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Remove released key from the set
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.delete(event.key.toLowerCase());
      return newSet;
    });
  }, []);

  // Check if d, e, v keys are pressed together
  useEffect(() => {
    const checkKeys = () => {
      if (pressedKeys.has('d') && pressedKeys.has('e') && pressedKeys.has('v')) {
        setIsVisible(true);
      }
    };

    checkKeys();
  }, [pressedKeys]);

  // Setup event listeners
  useEffect(() => {
    // Only add event listeners in development mode
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

  // Seed database mutation
  const seedMutation = useMutation({
    ...seedDatabaseMutation(),
    onSuccess: () => {
      toast.success('Database seeded successfully!');
    },
    onError: () => {
      toast.error('Failed to seed database');
    },
  });

  // Don't render anything if not in development mode
  if (!isDevelopment) {
    return null;
  }

  const handleSeed = () => {
    if (confirm('Are you sure you want to seed the database? This will delete all existing apps.')) {
      seedMutation.mutate();
    }
  };

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
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedMutation.isPending}
              style={{
                padding: '8px 12px',
                backgroundColor: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: seedMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: seedMutation.isPending ? 0.7 : 1,
              }}
            >
              {seedMutation.isPending ? 'Seeding...' : 'Seed Database'}
            </button>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#aaa' }}>
              This will create 6 fake apps and a test user (test@test.com / password)
            </p>
          </div>
        </div>
      )}
    </>
  );
};

