import { getLogo } from '@/lib/theme/theme';
import { Button } from '../ui/Button';

interface Props {
  title: string;
  subtitle: string;
  onAction?: () => void;
  actionTitle?: string;
  loading?: boolean;
}

export const StatusPage = (props: Props) => {
  const { title, subtitle, onAction, actionTitle, loading = true } = props;

  return (
    <div className="page page-center">
      <div className="container container-tight py-4 d-flex align-items-center flex-column">
        <img alt="Tipi logo" src={getLogo(true)} height={50} width={50} style={{ maxWidth: '100%', height: 'auto' }} />
        <h1 className="mt-3 mb-2">{title}</h1>
        <div className="text-muted mb-3">{subtitle}</div>
        {loading && <div className="spinner-border spinner-border-sm text-muted mb-3" />}
        {onAction && <Button onClick={onAction}>{actionTitle}</Button>}
      </div>
    </div>
  );
};
