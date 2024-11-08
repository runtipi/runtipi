'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import clsx from 'clsx';
import * as React from 'react';
import styles from './tabs.module.scss';

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>>(
  ({ className, children, ...props }, ref) => (
    <TabsPrimitive.Root ref={ref} className={clsx('card', className)} {...props}>
      {children}
    </TabsPrimitive.Root>
  ),
);

const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, children, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={clsx('', className)} {...props}>
      <div className="card-header">
        <div className="nav nav-tabs card-header-tabs">{children}</div>
      </div>
    </TabsPrimitive.List>
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => {
    return (
      <TabsPrimitive.Trigger className={clsx(styles.trigger, 'nav-link', className)} {...props} ref={ref}>
        <li className="nav-item">{children}</li>
      </TabsPrimitive.Trigger>
    );
  },
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, children, ...props }, ref) => (
    <TabsPrimitive.Content className={clsx('', className)} {...props} ref={ref}>
      <div className="card-body">{children}</div>
    </TabsPrimitive.Content>
  ),
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
