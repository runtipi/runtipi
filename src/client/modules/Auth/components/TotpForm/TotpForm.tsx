import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import React from 'react';

type Props = {
  onSubmit: (totpCode: string) => void;
  loading?: boolean;
};

export const TotpForm = (props: Props) => {
  const { onSubmit, loading } = props;
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
        <h3 className="">Two-factor authentication</h3>
        <p className="text-sm text-gray-500">Enter the code from your authenticator app</p>
        <OtpInput valueLength={6} value={totpCode} onChange={(o) => setTotpCode(o)} />
        <Button disabled={totpCode.trim().length < 6} loading={loading} type="submit" className="mt-3">
          Confirm
        </Button>
      </div>
    </form>
  );
};
