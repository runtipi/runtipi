'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { IconChevronRight } from '@tabler/icons-react';
import clsx from 'clsx';
import type * as React from 'react';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) => (
  <DropdownMenuPrimitive.SubTrigger className={clsx('', inset && 'ps-8', className)} {...props}>
    {children}
    <IconChevronRight className="" />
  </DropdownMenuPrimitive.SubTrigger>
);

const DropdownMenuSubContent = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) => (
  <DropdownMenuPrimitive.SubContent className={clsx('', className)} {...props} />
);

const DropdownMenuContent = ({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content sideOffset={sideOffset} className={clsx('dropdown-menu d-block position-relative', className)} {...props} />
  </DropdownMenuPrimitive.Portal>
);

const DropdownMenuItem = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
}) => <DropdownMenuPrimitive.Item className={clsx('dropdown-item cursor-pointer', inset && 'ps-1', className)} {...props} />;

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) => <DropdownMenuPrimitive.Label className={clsx('dropdown-header', inset && 'pl-8', className)} {...props} />;

const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) => (
  <DropdownMenuPrimitive.Separator className={clsx('dropdown-divider', className)} {...props} />
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
  DropdownMenuContent,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
};
