'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import clsx from 'clsx';
import type * as React from 'react';

type TriggerProps = {
  label?: string | React.ReactNode;
  error?: string;
  onClear?: () => void;
};

const Select: React.FC<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
    label?: string;
    error?: string;
    className?: string;
    key?: string;
  }
> = ({ children, ...props }) => {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
};

const SelectValue = SelectPrimitive.Value;

// Button
const SelectTrigger = ({
  className,
  error,
  label,
  children,
  value,
  onClear,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & TriggerProps) => {
  return (
    <label htmlFor={props.name} className={clsx('w-100', className)}>
      {Boolean(label) && (
        <span id={props.name} className="form-label">
          {label}
        </span>
      )}
      <div className="position-relative">
        <SelectPrimitive.Trigger
          id={props.name}
          aria-labelledby={props.name}
          className={clsx('d-flex w-100 align-items-center justify-content-between form-select', {
            'is-invalid is-invalid-lite': error,
            'text-muted': !value,
          })}
          {...props}
        >
          {children}
        </SelectPrimitive.Trigger>
      </div>
      {error && <div className="invalid-feedback">{error}</div>}
    </label>
  );
};

const SelectContent = ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content style={{ zIndex: 2000 }} className={clsx('overflow-hidden dropdown-menu', className)} {...props}>
      <SelectPrimitive.ScrollUpButton className="d-flex align-items-center justify-content-center">
        <IconChevronUp />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="d-flex align-items-center justify-content-center">
        <IconChevronDown />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

const SelectItem = ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item className={clsx('position-relative d-flex align-items-center dropdown-item', className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span style={{ right: 8 }} className="ms-2">
      <SelectPrimitive.ItemIndicator>
        <IconCheck size={20} />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
);

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
