import { IconEye, IconEyeOff } from '@tabler/icons-react';
import clsx from 'clsx';
import { type InputHTMLAttributes, type ReactNode, forwardRef, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Rendered on the right of the label, e.g. a "Forgot it?" link */
  aside?: ReactNode;
};

export const AuthField = forwardRef<HTMLInputElement, Props>(({ label, error, aside, type = 'text', id, ...props }, ref) => {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="rt-auth-label-row">
        <label className="rt-auth-label" htmlFor={inputId}>
          {label}
        </label>
        {aside}
      </div>
      <div className={clsx('rt-auth-input', { 'is-invalid': error })}>
        <input
          ref={ref}
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="rt-auth-eye"
            aria-label={visible ? t('AUTH_HIDE_PASSWORD') : t('AUTH_SHOW_PASSWORD')}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <IconEyeOff size={18} stroke={1.8} /> : <IconEye size={18} stroke={1.8} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="rt-auth-error">
          {error}
        </p>
      )}
    </div>
  );
});

AuthField.displayName = 'AuthField';
