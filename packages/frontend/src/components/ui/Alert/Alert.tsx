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
  <div className={clsx('alert', className, dismissible && 'alert-dismissible', alertVariants({ variant }))} role="alert" {...props}>
    {props.children}
  </div>
);
Alert.displayName = 'Alert';

const AlertHeading = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4 className={clsx('alert-heading', className)} {...props} />
);
AlertHeading.displayName = 'AlertHeading';

const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('alert-description', className)} {...props} />
);
AlertDescription.displayName = 'AlertDescription';

const AlertIcon = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('alert-icon', className)} {...props}>
    {props.children}
  </div>
);
AlertIcon.displayName = 'AlertIcon';

export { Alert, AlertHeading, AlertDescription, AlertIcon };
