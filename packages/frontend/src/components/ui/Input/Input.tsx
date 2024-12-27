import clsx from 'clsx';
import React from 'react';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string | React.ReactNode;
  isInvalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, IProps>(({ name, label, error, type = 'text', className, isInvalid, ...rest }, ref) => (
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
      ref={ref}
      className={clsx('form-control', { 'is-invalid is-invalid-lite': error || isInvalid })}
      {...rest}
    />
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
));
