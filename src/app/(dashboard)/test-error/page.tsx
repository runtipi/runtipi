'use client';

import { Button } from '@/components/ui/Button';
import React from 'react';

export default function TestErrorPage() {
  const fetchFaultyApi = async () => {
    const response = await fetch('/api/test-error');
    const json = await response.json();
    return json;
  };

  return (
    <div className="card d-flex">
      <Button
        type="button"
        onClick={() => {
          throw new Error('Sentry Frontend Error');
        }}
      >
        Throw error
      </Button>
      <Button
        type="button"
        onClick={async () => {
          await fetchFaultyApi();
        }}
      >
        Fetch faulty API
      </Button>
    </div>
  );
}
