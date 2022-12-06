import React from 'react';
import clsx from 'clsx';

interface IProps {
  label?: string;
  className?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, IProps>(({ onChange, onBlur, name, label, checked, className }, ref) => (
  <div className={clsx('', className)}>
    <label htmlFor={`switch-${name}`} className="form-check form-switch">
      <input name={name} ref={ref} onChange={onChange} onBlur={onBlur} className="form-check-input" type="checkbox" checked={checked} />
      <span className="form-check-label">{label}</span>
    </label>
  </div>
));
