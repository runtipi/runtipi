import clsx from 'clsx';
import type { PropsWithChildren } from 'react';
import './action-bar.css';

type ActionBarProps = PropsWithChildren<{
  className?: string;
  sticky?: boolean;
}>;

type ActionBarSectionProps = PropsWithChildren<{
  className?: string;
}>;

const ActionBarRoot = ({ children, className, sticky }: ActionBarProps) => {
  return (
    <div className={clsx('card action-bar', { 'action-bar-sticky': sticky }, className)}>
      <div className="action-bar-content">{children}</div>
    </div>
  );
};

const ActionBarLeft = ({ children, className }: ActionBarSectionProps) => {
  if (!children) return null;
  return <div className={clsx('action-bar-section action-bar-left', className)}>{children}</div>;
};

const ActionBarCenter = ({ children, className }: ActionBarSectionProps) => {
  if (!children) return null;
  return <div className={clsx('action-bar-section action-bar-center', className)}>{children}</div>;
};

const ActionBarRight = ({ children, className }: ActionBarSectionProps) => {
  if (!children) return null;
  return <div className={clsx('action-bar-section action-bar-right', className)}>{children}</div>;
};

export const ActionBar = Object.assign(ActionBarRoot, {
  Left: ActionBarLeft,
  Center: ActionBarCenter,
  Right: ActionBarRight,
});
