import { IconCheck, IconCopy } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const RESET_COMMAND = './runtipi-cli reset-password';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(RESET_COMMAND);
      setCopied(true);
    } catch {
      // The clipboard is unavailable over plain http, the command stays selectable
    }
  };

  return (
    <section className="rt-auth-form rt-auth-form--wide" aria-labelledby="rt-reset-title">
      <Link to="/login" className="rt-auth-back">
        ← {t('AUTH_RESET_PASSWORD_BACK_TO_LOGIN')}
      </Link>
      <div>
        <h1 id="rt-reset-title" className="rt-auth-title">
          {t('AUTH_RESET_HEADING')}
        </h1>
        <p className="rt-auth-sub">{t('AUTH_RESET_SUBTITLE')}</p>
      </div>
      <ol className="rt-auth-steps">
        <li className="rt-auth-step">
          <span className="rt-auth-step__n">1</span>
          <span>{t('AUTH_RESET_STEP_1')}</span>
        </li>
        <li className="rt-auth-step">
          <span className="rt-auth-step__n">2</span>
          <span>{t('AUTH_RESET_STEP_2')}</span>
          <div className="rt-auth-cmd">
            <span className="rt-auth-cmd__prompt" aria-hidden="true">
              $
            </span>
            <code>{RESET_COMMAND}</code>
            <button type="button" className={clsx('rt-auth-copy', { 'is-done': copied })} onClick={copy} aria-live="polite">
              {copied ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.8} />}
              {copied ? t('AUTH_COPIED') : t('AUTH_COPY')}
            </button>
          </div>
        </li>
        <li className="rt-auth-step">
          <span className="rt-auth-step__n">3</span>
          <span>{t('AUTH_RESET_STEP_3')}</span>
        </li>
      </ol>
    </section>
  );
}
