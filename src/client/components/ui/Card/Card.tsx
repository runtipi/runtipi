import React from 'react';
import clsx from 'clsx';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = ({ children, className, ...rest }: CardProps) => {
  return (
    <div className={clsx('card', className)} {...rest}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className, ...rest }: CardProps) => {
  return (
    <div className={clsx('card-header border-bottom d-flex align-items-center', className)} {...rest}>
      {children}
    </div>
  );
};

const CardTitle = ({ children, className, ...rest }: CardProps) => {
  return (
    <div className={clsx('card-title', className)} {...rest}>
      {children}
    </div>
  );
};

const CardActions = ({ children, className, ...rest }: CardProps) => {
  return (
    <div className={clsx('card-actions', className)} {...rest}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardActions, CardTitle };
