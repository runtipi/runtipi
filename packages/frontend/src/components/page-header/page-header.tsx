import clsx from 'clsx';
import type { ReactNode } from 'react';
import './page-header.css';

type Props = {
  /** Small uppercase line above the title, e.g. "Apps / Installed" */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  size?: 'lg' | 'md';
};

export const PageHeader = ({ eyebrow, title, subtitle, actions, size = 'lg' }: Props) => (
  <header className={clsx('rt-page-header', `rt-page-header--${size}`)}>
    <div className="rt-page-header__text">
      {eyebrow && <div className="rt-eyebrow">{eyebrow}</div>}
      <h1 className="rt-display rt-page-header__title">{title}</h1>
      {subtitle && <p className="rt-page-header__subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="rt-page-header__actions">{actions}</div>}
  </header>
);
