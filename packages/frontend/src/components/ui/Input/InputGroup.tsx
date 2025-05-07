import clsx from 'clsx';
import React from 'react';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string | React.ReactNode;
  isInvalid?: boolean;
  groupPrefix?: string | React.ReactNode;
  groupSuffix?: string | React.ReactNode;
}

export const InputGroup = React.forwardRef<HTMLInputElement, IProps>(
  ({ name, label, error, type = 'text', className, isInvalid, groupPrefix, groupSuffix, ...rest }, ref) => (
    <div className={clsx(className)}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
        </label>
      )}
      <div className="input-group">
        {groupPrefix && <span className="input-group-text">{groupPrefix}</span>}
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
        {groupSuffix && <span className="input-group-text">{groupSuffix}</span>}
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    </div>
  ),
);
