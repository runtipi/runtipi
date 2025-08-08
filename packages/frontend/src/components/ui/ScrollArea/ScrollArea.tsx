'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import clsx from 'clsx';
import type * as React from 'react';
import styles from './ScrollArea.module.css';

const ScrollBar = ({ className, orientation = 'vertical', ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    orientation={orientation}
    className={clsx(
      styles.scrollbar,
      { [styles.scrollbarVertical as string]: orientation === 'vertical', [styles.scrollbarHorizontal as string]: orientation === 'horizontal' },
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className={clsx('position-relative rounded-pill bg-muted', orientation === 'vertical' && 'flex-grow-1')} />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
);

const ScrollArea = ({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & { maxheight: number }) => (
  <ScrollAreaPrimitive.Root className={clsx('position-relative overflow-hidden', className)} {...props}>
    <ScrollAreaPrimitive.Viewport style={{ maxHeight: props.maxheight }} className={clsx(styles.viewport, 'w-100')}>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
);

export { ScrollArea, ScrollBar };
