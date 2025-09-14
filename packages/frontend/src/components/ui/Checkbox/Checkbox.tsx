import type * as React from 'react';
import type * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import clsx from 'clsx';

type RootProps = typeof CheckboxPrimitive.Root;

type CheckboxProps = React.ComponentPropsWithoutRef<RootProps> & {
  label?: string | React.ReactNode;
  ref?: React.Ref<React.ElementRef<RootProps>>;
};

function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label htmlFor={props.name} aria-labelledby={props.name} className={clsx('form-check', className)}>
      <input
        type="checkbox"
        className="form-check-input"
        checked={props.checked as boolean}
        onChange={(e) => props.onCheckedChange?.(e.target.checked)}
        name={props.name}
        id={props.name}
      />
      <span id={props.name} className="form-check-label text-muted">
        {label}
      </span>
    </label>
  );
}

export { Checkbox };
