import { type VariantProps, cva } from 'class-variance-authority';
import clsx from 'clsx';

const alertVariants = cva('alert', {
  variants: {
    variant: {
      default: '',
      success: 'alert-success',
      info: 'alert-info',
      warning: 'alert-warning',
      danger: 'alert-danger',
    },
  },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  dismissible?: boolean;
}

const Alert = ({ className, dismissible, variant, ...props }: AlertProps) => (
  <div className={clsx('alert', className, dismissible && 'alert-dismissible', alertVariants({ variant }))} {...props}>
    {props.children}
  </div>
);
Alert.displayName = 'Alert';

const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4 className={clsx('alert-title', className)} {...props} />
);
AlertTitle.displayName = 'AlertTitle';

const AlertSubtitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('text-secondary', className)} {...props} />
);
AlertSubtitle.displayName = 'AlertSubtitle';

export { Alert, AlertTitle, AlertSubtitle };
