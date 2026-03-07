import { useTranslation } from 'react-i18next';

export default function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="h2 text-center mb-4">{t('AUTH_RESET_PASSWORD_TITLE')}</h2>
      <p className="text-secondary mb-4">{t('AUTH_RESET_PASSWORD_INSTRUCTIONS')}</p>
      <pre>
        <code>./runtipi-cli reset-password</code>
      </pre>
    </>
  );
}
