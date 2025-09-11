'use client';

import clsx from 'clsx';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import './tabs.css';

interface TabsContextType {
  value: string;
  onValueChange?: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  orientation?: string;
  style?: React.CSSProperties;
}

const Tabs = ({ className, children, value, defaultValue, onValueChange, orientation, style, ...props }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');

  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={clsx('card', className)} style={style} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

const TabsList = ({ className, children, ...props }: TabsListProps) => (
  <div className={clsx('', className)} {...props}>
    <div className="card-header">
      <div className="nav nav-tabs card-header-tabs">{children}</div>
    </div>
  </div>
);

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (event?: React.MouseEvent) => boolean | undefined;
  disabled?: boolean;
}

const TabsTrigger = ({ className, children, value, onClick, disabled, ...props }: TabsTriggerProps) => {
  const context = useContext(TabsContext);

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;

    const result = onClick?.(event);

    if (result === false) {
      return;
    }

    if (!event.defaultPrevented) {
      context?.onValueChange?.(value);
    }
  };

  return (
    <button
      type="button"
      className={clsx('trigger nav-link', disabled && 'disabled', className)}
      onClick={handleClick}
      disabled={disabled}
      data-state={context?.value === value ? 'active' : 'inactive'}
      {...props}
    >
      <li className="nav-item">{children}</li>
    </button>
  );
};

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

const TabsContent = ({ className, children, value, ...props }: TabsContentProps) => {
  const context = useContext(TabsContext);

  if (context?.value !== value) {
    return null;
  }

  return (
    <div className={clsx('', className)} {...props}>
      <div className="card-body">{children}</div>
    </div>
  );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
