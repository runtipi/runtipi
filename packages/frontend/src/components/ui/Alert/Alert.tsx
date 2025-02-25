import { cva, type VariantProps } from 'class-variance-authority';
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
  dismisible?: boolean;
}

const Alert = ({ className, dismisible, variant, ...props }: AlertProps) => (
  <div className={clsx('alert', className, dismisible && 'alert-dismisible', alertVariants({ variant }))} {...props}>
    {props.children}
  </div>
);
Alert.displayName = 'Alert';

const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4 className={clsx('alert-title', className)} {...props} />
);
AlertTitle.displayName = 'AlertTitile';

const AlertSubtitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('text-secondary', className)} {...props} />
);
AlertSubtitle.displayName = 'AlertSubtitle';

export { Alert, AlertTitle, AlertSubtitle };
