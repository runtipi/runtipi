'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import clsx from 'clsx';
import classes from './Switch.module.scss';

type RootProps = typeof SwitchPrimitives.Root;

const Switch = React.forwardRef<React.ElementRef<RootProps>, React.ComponentPropsWithoutRef<RootProps> & { label?: string }>(({ className, ...props }, ref) => (
  <label htmlFor={props.name} aria-labelledby={props.name} className={clsx('form-check form-switch form-check-sigle', className)}>
    <SwitchPrimitives.Root name={props.name} className={clsx('form-check-input', classes.root)} {...props} ref={ref}>
      <SwitchPrimitives.Thumb />
    </SwitchPrimitives.Root>
    <span id={props.name} className="form-check-label text-muted">
      {props.label}
    </span>
  </label>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
