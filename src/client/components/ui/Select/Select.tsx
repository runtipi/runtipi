'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import clsx from 'clsx';

type TriggerProps = {
  label?: string | React.ReactNode;
  error?: string;
};

const Select: React.FC<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & { label?: string; error?: string; className?: string }> = ({ children, error, className, ...props }) => {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
};

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

// Button
const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & TriggerProps>(
  ({ className, error, label, children, ...props }, ref) => (
    <label htmlFor={props.name} aria-labelledby={props.name} className={clsx('w-100', className)}>
      {Boolean(label) && (
        <span id={props.name} className="form-label">
          {label}
        </span>
      )}
      <SelectPrimitive.Trigger ref={ref} className={clsx('d-flex w-100 align-items-center justify-content-between form-select', { 'is-invalid is-invalid-lite': error })} {...props}>
        {children}
      </SelectPrimitive.Trigger>
      {error && <div className="invalid-feedback">{error}</div>}
    </label>
  ),
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(({ className, children, ...props }, ref) => (
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

const SelectLabel = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Label>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={clsx('', className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={clsx('ps-8 position-relative d-flex align-items-center dropdown-item', className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span style={{ right: 8 }} className="position-absolute d-flex align-items-center justify-content-center">
      <SelectPrimitive.ItemIndicator>
        <IconCheck size={20} style={{ marginBottom: 3 }} />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={clsx('', className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
