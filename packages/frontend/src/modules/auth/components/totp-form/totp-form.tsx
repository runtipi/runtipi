import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  onSubmit: (totpCode: string) => void;
  loading?: boolean;
};

export const TotpForm = (props: Props) => {
  const { onSubmit, loading } = props;
  const { t } = useTranslation();
  const [totpCode, setTotpCode] = React.useState('');

  return (
    <>
      <h2 className="h2 text-center mb-4">{t('AUTH_TOTP_TITLE')}</h2>
      <form
        onSubmit={(e) => {
          setTotpCode('');
          e.preventDefault();
          onSubmit(totpCode);
        }}
      >
        <p className="text-secondary">{t('AUTH_TOTP_INSTRUCTIONS')}</p>
        <OtpInput valueLength={6} value={totpCode} onChange={(o) => setTotpCode(o)} />
        <div className="form-footer">
          <Button disabled={totpCode.trim().length < 6} loading={loading} intent="primary" type="submit" className="w-100">
            {t('AUTH_TOTP_SUBMIT')}
          </Button>
        </div>
      </form>
    </>
  );
};
