import clsx from 'clsx';
import type React from 'react';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string | React.ReactNode;
  isInvalid?: boolean;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

export const Input = ({ name, label, error, type = 'text', className, isInvalid, children, ...rest }: IProps) => (
  <div className={clsx(className)}>
    {label && (
      <label htmlFor={name} className="form-label">
        {label}
      </label>
    )}
    <input
      suppressHydrationWarning
      aria-label={name}
      type={type}
      name={name}
      id={name}
      className={clsx('form-control', {
        'is-invalid is-invalid-lite': error || isInvalid,
      })}
      {...rest}
    />
    {children}
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
);
