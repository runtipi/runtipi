import { Button } from '@/components/ui/Button';
import type { AppStatus } from '@/types/app.types';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  initialValues?: { [key: string]: unknown };
  loading?: boolean;
  onReset?: () => void;
  formId: string;
  status?: AppStatus;
}

export const InstallFormButtons: React.FC<IProps> = ({ initialValues, loading, onReset, formId, status }) => {
  const { t } = useTranslation();

  const onClickReset = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    if (onReset) onReset();
  };

  return (
    <>
      <Button loading={loading} type="submit" intent="success" form={formId}>
        {initialValues ? t('APP_INSTALL_FORM_SUBMIT_UPDATE') : t('APP_INSTALL_FORM_SUBMIT_INSTALL')}
      </Button>
      {initialValues && onReset && (
        <Button loading={status === 'stopping'} onClick={onClickReset} intent="danger" className="ms-2">
          {t('APP_INSTALL_FORM_RESET')}
        </Button>
      )}
    </>
  );
};
