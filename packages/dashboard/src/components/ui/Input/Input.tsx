import React from 'react';
import clsx from 'clsx';

interface IProps {
  placeholder?: string;
  error?: string;
  label?: string;
  className?: string;
  isInvalid?: boolean;
  type?: HTMLInputElement['type'];
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  value?: string;
}

export const Input = React.forwardRef<HTMLInputElement, IProps>(({ onChange, onBlur, name, label, placeholder, error, type = 'text', className, value }, ref) => (
  <div className={clsx(className)}>
    {label && (
      <label htmlFor={name} className="form-label">
        {label}
      </label>
    )}
    <input
      name={name}
      id={name}
      onBlur={onBlur}
      onChange={onChange}
      value={value}
      type={type}
      ref={ref}
      className={clsx('form-control', { 'is-invalid is-invalid-lite': error })}
      placeholder={placeholder}
    />
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
));
