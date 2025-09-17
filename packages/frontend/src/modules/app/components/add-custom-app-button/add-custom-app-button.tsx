import { IconNewSection } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import './add-custom-app-button.css';

export const AddCustomAppButton = () => {
  const { t } = useTranslation();

  return (
    <Link type="button" to="/apps/create" className={clsx('col-sm-6 col-lg-4 add-link-button')}>
      <div className="card card-sm card-link">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <span className="me-3">
              <IconNewSection size={60} stroke={1.25} color="#A4A4A4" />
            </span>
            <div>
              <div className="d-flex h-3 align-items-center">
                <span className="h4 me-2 mb-1 fw-bolder">{t('CUSTOM_APP_ADD_TITLE')}</span>
              </div>
              <div className="text-muted text-start">{t('CUSTOM_APP_ADD_SUBTITLE')}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
