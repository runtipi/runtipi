'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import clsx from 'clsx';
import * as React from 'react';
import './Dialog.css';

type Sizes = 'sm' | 'md' | 'lg' | 'xl';
type ModalType = 'default' | 'primary' | 'success' | 'info' | 'warning' | 'danger';

type ModalProps = {
  size?: Sizes;
  type?: ModalType;
};

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = ({ children, ...props }: DialogPrimitive.DialogPortalProps & ModalProps) => (
  <DialogPrimitive.Portal {...props}>
    <div className="modal modal-sm d-block dimmed-background">
      <div className={clsx(`modal-dialog modal-dialog-centered modal-${props.size || 'lg'}`, 'zoom-in')}>
        <div className="shadow modal-content">
          <div data-testid="modal-status" className={clsx('modal-status', { [`bg-${props.type}`]: Boolean(props.type), 'd-none': !props.type })} />
          {children}
        </div>
      </div>
    </div>
  </DialogPrimitive.Portal>
);
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => <DialogPrimitive.Overlay className={clsx('', className)} {...props} ref={ref} />);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & ModalProps
>(({ className, children, ...props }, ref) => (
  <DialogPortal type={props.type} size={props.size}>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={clsx('modal-content mt-1', className)} {...props}>
      {children}
      <DialogPrimitive.Close className="btn-close">
        <span data-testid="modal-close-button" className="btn-close" aria-label="Close" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div data-testid="modal-header" className={clsx('modal-header', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx('modal-footer', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={clsx('modal-title', className)} {...props} />,
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} asChild {...props}>
    <div className={clsx('modal-body', className)}>{props.children}</div>
  </DialogPrimitive.Description>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
