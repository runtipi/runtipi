import { StatusPage } from '@/components/status/status-page';
import { useUserContext } from '@/context/user-context';

interface Props {
  children: React.ReactNode;
}

export const StatusProvider = (props: Props) => {
  const { children } = props;
  const { status } = useUserContext();

  switch (status) {
    case 'updating':
      return <StatusPage title="Updating" subtitle="Please wait while the application is updating" loading />;
  }

  return children;
};
