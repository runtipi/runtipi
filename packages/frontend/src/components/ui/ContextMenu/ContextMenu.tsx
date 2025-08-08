'use client';

import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { IconCheck, IconChevronRight, IconCircle } from '@tabler/icons-react';
import clsx from 'clsx';
import type * as React from 'react';

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) => (
  <ContextMenuPrimitive.SubTrigger className={clsx('', inset && 'ps-2', className)} {...props}>
    {children}
    <IconChevronRight className="" />
  </ContextMenuPrimitive.SubTrigger>
);

const ContextMenuSubContent = ({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) => (
  <ContextMenuPrimitive.SubContent className={clsx('', className)} {...props} />
);

const ContextMenuContent = ({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Content>) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content className={clsx('dropdown-menu dropdown-menu-demo', className)} style={{ display: 'block' }} {...props} />
  </ContextMenuPrimitive.Portal>
);

const ContextMenuItem = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
}) => <ContextMenuPrimitive.Item className={clsx('dropdown-item cursor-pointer', inset && 'ps-2', className)} {...props} />;

const ContextMenuCheckboxItem = ({ className, children, checked, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) => (
  <ContextMenuPrimitive.CheckboxItem className={clsx('', className)} checked={checked} {...props}>
    <span>
      <ContextMenuPrimitive.ItemIndicator>
        <IconCheck />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
);

const ContextMenuRadioItem = ({ className, children, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) => (
  <ContextMenuPrimitive.RadioItem className={clsx('', className)} {...props}>
    <span>
      <ContextMenuPrimitive.ItemIndicator>
        <IconCircle />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
);

const ContextMenuLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) => <ContextMenuPrimitive.Label className={clsx('', { 'ps-2': inset }, className)} {...props} />;

const ContextMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) => (
  <ContextMenuPrimitive.Separator className={clsx('', className)} {...props} />
);

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={className} {...props} />;
};
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
