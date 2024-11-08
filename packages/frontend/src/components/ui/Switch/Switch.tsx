'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import clsx from 'clsx';
import * as React from 'react';
import './Switch.css';

type RootProps = typeof SwitchPrimitives.Root;

const Switch = React.forwardRef<React.ElementRef<RootProps>, React.ComponentPropsWithoutRef<RootProps> & { label?: string | React.ReactNode }>(
  ({ className, label, ...props }, ref) => (
    <label htmlFor={props.name} aria-labelledby={props.name} className={clsx('form-check form-switch form-check-sigle', className)}>
      <SwitchPrimitives.Root aria-label={props.name} className="form-check-input switch-root" {...props} ref={ref}>
        <SwitchPrimitives.Thumb />
      </SwitchPrimitives.Root>
      <span id={props.name} className="form-check-label text-muted">
        {label}
      </span>
    </label>
  ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
