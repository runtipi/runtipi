import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { useTranslations } from 'next-intl';
import React from 'react';

type Props = {
  onSubmit: (totpCode: string) => void;
  loading?: boolean;
};

export const TotpForm = (props: Props) => {
  const { onSubmit, loading } = props;
  const t = useTranslations();
  const [totpCode, setTotpCode] = React.useState('');

  return (
    <form
      onSubmit={(e) => {
        setTotpCode('');
        e.preventDefault();
        onSubmit(totpCode);
      }}
    >
      <div className="flex items-center justify-center">
        <h3 className="">{t('AUTH_TOTP_TITLE')}</h3>
        <p className="text-sm text-gray-500">{t('AUTH_TOTP_INSTRUCTIONS')}</p>
        <OtpInput valueLength={6} value={totpCode} onChange={(o) => setTotpCode(o)} />
        <Button disabled={totpCode.trim().length < 6} loading={loading} type="submit" className="mt-3">
          {t('AUTH_TOTP_SUBMIT')}
        </Button>
      </div>
    </form>
  );
};
