import './input.css';
import clsx from 'clsx';
import type React from 'react';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string | React.ReactNode;
  isInvalid?: boolean;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

export const Input = ({ name, label, error, type = 'text', className, isInvalid, children, ...rest }: IProps) => {
  const hasError = Boolean(error || isInvalid);
  const errorId = hasError && name ? `${name}-error` : undefined;

  return (
    <div className={clsx(className)}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
        </label>
      )}
      <input
        suppressHydrationWarning
        aria-label={label ? undefined : name}
        aria-invalid={hasError}
        aria-describedby={errorId}
        type={type}
        name={name}
        id={name}
        className={clsx('form-control', {
          'is-invalid': hasError,
        })}
        {...rest}
      />
      {children}
      {error && (
        <div id={errorId} className="invalid-feedback" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
