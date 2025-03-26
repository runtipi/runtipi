'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import clsx from 'clsx';
import * as React from 'react';

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
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & TriggerProps
>(({ className, error, label, children, value, onClear, ...props }, ref) => {
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
          ref={ref}
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
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content ref={ref} style={{ zIndex: 2000 }} className={clsx('overflow-hidden dropdown-menu', className)} {...props}>
      <SelectPrimitive.ScrollUpButton className="d-flex align-items-center justify-content-center">
        <IconChevronUp />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="d-flex align-items-center justify-content-center">
        <IconChevronDown />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item ref={ref} className={clsx('position-relative d-flex align-items-center dropdown-item', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span style={{ right: 8 }} className="ms-2">
        <SelectPrimitive.ItemIndicator>
          <IconCheck size={20} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
