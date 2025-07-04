import clsx from 'clsx';
import React from 'react';

interface IProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string | React.ReactNode;
  isInvalid?: boolean;
  groupPrefix?: string | React.ReactNode;
  groupSuffix?: string | React.ReactNode;
  groupClassName?: string;
}

export const InputGroup = React.forwardRef<HTMLInputElement, IProps>(
  ({ name, label, error, type = 'text', className, isInvalid, groupPrefix, groupSuffix, groupClassName, ...rest }, ref) => {
    let prefix = groupPrefix;
    if (typeof groupPrefix === 'string') {
      prefix = <span className="input-group-text">{groupPrefix}</span>;
    }
    let suffix = groupSuffix;
    if (typeof groupSuffix === 'string') {
      suffix = <span className="input-group-text">{groupSuffix}</span>;
    }

    return (
      <div className={clsx(className)}>
        {label && (
          <label htmlFor={name} className="form-label">
            {label}
          </label>
        )}
        <div className={clsx('input-group', groupClassName)}>
          {prefix}
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
          {suffix}
          {error && <div className="invalid-feedback">{error}</div>}
        </div>
      </div>
    );
  },
);
