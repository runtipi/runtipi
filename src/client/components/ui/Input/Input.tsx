import clsx from 'clsx';
import React from 'react';

interface IProps {
  placeholder?: string;
  error?: string;
  label?: string | React.ReactNode;
  className?: string;
  isInvalid?: boolean;
  type?: HTMLInputElement['type'];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  value?: string;
  readOnly?: boolean;
  maxLength?: number;
}

export const Input = React.forwardRef<HTMLInputElement, IProps>(
  ({ onChange, onBlur, name, label, placeholder, error, type = 'text', className, value, isInvalid, disabled, readOnly, maxLength }, ref) => (
    <div className={clsx(className)}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
        </label>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <input
        maxLength={maxLength}
        suppressHydrationWarning
        aria-label={name}
        role="textbox"
        disabled={disabled}
        name={name}
        id={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
        type={type}
        ref={ref}
        className={clsx('form-control', { 'is-invalid is-invalid-lite': error || isInvalid })}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  ),
);
