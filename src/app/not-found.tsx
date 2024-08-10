'use client';

import { StatusScreen } from '@/components/StatusScreen';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function NotFound() {
  const router = useRouter();

  const handleHome = () => {
    router.push('/');
  };

  return <StatusScreen loading={false} title="404" subtitle="Page not found" actionTitle="Home page" onAction={handleHome} />;
}
