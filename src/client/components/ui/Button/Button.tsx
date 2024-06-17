import React from 'react';
import clsx from 'clsx';

interface IProps {
  className?: string;
  type?: 'submit' | 'reset' | 'button';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  width?: number | null;
}

export const Button = React.forwardRef<HTMLButtonElement, IProps>(
  ({ type, className, children, loading, disabled, onClick, width, ...rest }, ref) => {
    const styles = { width: width ? `${width}px` : 'auto', height: '36px' };
    return (
      <button
        style={styles}
        onClick={onClick}
        disabled={disabled || loading}
        ref={ref}
        className={clsx('btn', className, { disabled: disabled || loading })}
        type={type}
        {...rest}
      >
        {loading ? <span className="spinner-border spinner-border-sm mx-2" role="status" data-testid="loader" aria-hidden="true" /> : children}
      </button>
    );
  },
);
