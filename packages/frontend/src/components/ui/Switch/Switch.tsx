'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import clsx from 'clsx';
import type * as React from 'react';
import './Switch.css';

type RootProps = typeof SwitchPrimitives.Root;

type SwitchProps = React.ComponentPropsWithoutRef<RootProps> & {
  label?: string | React.ReactNode;
  ref?: React.Ref<React.ElementRef<RootProps>>;
};

const Switch = ({ className, label, ...props }: SwitchProps) => {
  const labelId = props.name ? `${props.name}-label` : undefined;

  return (
    <label htmlFor={props.name} className={clsx('form-check form-switch form-check-sigle', className)}>
      <SwitchPrimitives.Root aria-labelledby={labelId} className="form-check-input switch-root" {...props}>
        <SwitchPrimitives.Thumb />
      </SwitchPrimitives.Root>
      <span id={labelId} className="form-check-label text-muted">
        {label}
      </span>
    </label>
  );
};

export { Switch };
