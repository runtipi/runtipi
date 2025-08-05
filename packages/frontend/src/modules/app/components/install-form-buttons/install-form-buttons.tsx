import { Button } from '@/components/ui/Button';
import type { AppStatus } from '@/types/app.types';
import type React from 'react';
import { useTranslation } from 'react-i18next';

interface IProps {
  isEdit?: boolean;
  loading?: boolean;
  formId: string;
  status?: AppStatus;
}

export const InstallFormButtons: React.FC<IProps> = ({ isEdit, loading, formId }) => {
  const { t } = useTranslation();

  return (
    <Button loading={loading} type="submit" intent="success" form={formId}>
      {isEdit ? t('APP_INSTALL_FORM_SUBMIT_UPDATE') : t('APP_INSTALL_FORM_SUBMIT_INSTALL')}
    </Button>
  );
};
