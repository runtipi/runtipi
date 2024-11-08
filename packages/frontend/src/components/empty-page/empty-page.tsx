import { Button } from '@/components/ui/Button';
import type React from 'react';
import './empty-page.css';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface IProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  redirectPath?: string;
}

export const EmptyPage: React.FC<IProps> = ({ title, subtitle, redirectPath, actionLabel }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="card empty">
      <img
        src="/empty.svg"
        alt="Empty box"
        height="80"
        width="80"
        className="empty-image mb-3"
        style={{
          maxWidth: '100%',
          height: '80px',
        }}
      />
      <p className="empty-title">{t(title)}</p>
      {subtitle && <p className="empty-subtitle text-muted">{t(subtitle)}</p>}
      <div className="empty-action">
        {redirectPath && actionLabel && (
          <Button data-testid="empty-page-action" onClick={() => navigate(redirectPath)} intent="primary">
            {t(actionLabel)}
          </Button>
        )}
      </div>
    </div>
  );
};
