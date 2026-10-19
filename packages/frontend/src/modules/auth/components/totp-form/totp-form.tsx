import { IconArrowRight, IconDeviceMobileCheck } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  onSubmit: (totpCode: string) => void;
  /** Go back to the email and password step */
  onBack?: () => void;
  loading?: boolean;
};

export const TotpForm = (props: Props) => {
  const { onSubmit, onBack, loading } = props;
  const { t } = useTranslation();
  const [totpCode, setTotpCode] = React.useState('');

  return (
    <form
      className="rt-auth-form"
      aria-labelledby="rt-totp-title"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(totpCode);
        setTotpCode('');
      }}
    >
      {onBack && (
        <button type="button" className="rt-auth-back" onClick={onBack}>
          ← {t('AUTH_TOTP_BACK')}
        </button>
      )}
      <span className="rt-auth-badge" aria-hidden="true">
        <IconDeviceMobileCheck size={24} stroke={1.8} />
      </span>
      <div>
        <h1 id="rt-totp-title" className="rt-auth-title">
          {t('AUTH_TOTP_HEADING')}
        </h1>
        <p className="rt-auth-sub">{t('AUTH_TOTP_INSTRUCTIONS')}</p>
      </div>
      <div>
        <label className="rt-auth-label" htmlFor="rt-totp-code">
          {t('AUTH_TOTP_LABEL')}
        </label>
        <input
          id="rt-totp-code"
          className="rt-auth-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          // biome-ignore lint/a11y/noAutofocus: the code is the only thing to type on this step
          autoFocus
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <p className="rt-auth-hint">{t('AUTH_TOTP_HINT')}</p>
      </div>
      <button type="submit" className="rt-auth-submit" disabled={totpCode.length < 6 || loading}>
        {t('AUTH_TOTP_SUBMIT')}
        <IconArrowRight size={16} stroke={2.2} />
      </button>
    </form>
  );
};
