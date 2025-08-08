import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import clsx from 'clsx';
import type * as React from 'react';

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      default: '',
      ghost: 'btn-ghost-primary',
      outline: 'btn-outline-primary',
    },
    intent: {
      default: '',
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      success: 'btn-success',
      warning: 'btn-warning',
      danger: 'btn-danger',
      info: 'btn-info',
      dark: 'btn-dark',
      light: 'btn-light',
    },
    size: {
      default: '',
      sm: 'btn-sm',
      lg: 'btn-lg',
      icon: 'btn-icon',
    },
  },
  compoundVariants: [
    {
      intent: 'danger',
      variant: 'outline',
      className: 'btn-outline-danger',
    },
    {
      intent: 'success',
      variant: 'outline',
      className: 'btn-outline-success',
    },
    {
      intent: ['default', 'primary'],
      variant: 'outline',
      className: 'btn-outline-primary',
    },
    {
      intent: 'danger',
      variant: 'ghost',
      className: 'btn-ghost-danger',
    },
    {
      intent: 'success',
      variant: 'ghost',
      className: 'btn-ghost-success',
    },
    {
      intent: ['default', 'primary'],
      variant: 'ghost',
      className: 'btn-ghost-primary',
    },
  ],
  defaultVariants: {
    intent: 'default',
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = ({ className, variant, size, intent, asChild = false, disabled, loading, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      disabled={disabled}
      style={{ height: size ? 'auto' : '36px' }}
      className={clsx(buttonVariants({ variant, size, intent, className }), { disabled: disabled || loading, 'btn-loading': loading }, className)}
      {...props}
    />
  );
};

export { Button, buttonVariants };
