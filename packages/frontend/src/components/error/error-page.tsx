import { IconReload } from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

type ErrorPageProps = {
  onReset: () => void;
  error: Error;
};

export const ErrorPage = ({ error, onReset }: ErrorPageProps) => {
  const location = useLocation();

  return (
    <div className="page page-center">
      <div className="container-tight py-4">
        <div className="empty">
          <p className="empty-title">Oops... An error occurred!</p>
          <p className="empty-subtitle text-secondary">
            Try refreshing the page or click the button below to try again. If the problem persists, open an issue on GitHub with the error message
            below.
          </p>
          <div className="empty-action">
            <Button intent="primary" onClick={onReset}>
              <IconReload className="me-2" />
              Retry
            </Button>
          </div>
          <pre className="mt-5" style={{ whiteSpace: 'normal' }}>
            {error.message}
            <br />
            Location: {location.pathname}
          </pre>
        </div>
      </div>
    </div>
  );
};
