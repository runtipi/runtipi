/* eslint-disable jsx-a11y/anchor-has-content */
import * as React from 'react';

import { ButtonProps } from '@/components/ui/Button';
import clsx from 'clsx';
import { IconChevronLeft, IconChevronRight, IconDots } from '@tabler/icons-react';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav role="navigation" aria-label="pagination" className={clsx('m-0 ms-auto', className)} {...props} />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(({ className, ...props }, ref) => (
  <ul ref={ref} className={clsx('pagination', className)} {...props} />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ className, ...props }, ref) => (
  <li ref={ref} className={clsx('page-item', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'a'>;

const PaginationLink = ({ className, isActive, ...props }: PaginationLinkProps) => (
  <a aria-current={isActive ? 'page' : undefined} className={clsx('page-link', { active: isActive }, className)} {...props} />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={clsx('gap-1 pl-2.5', className)} {...props}>
    <IconChevronLeft className="" />
    <span>prev</span>
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={clsx('gap-1 pr-2.5', className)} {...props}>
    <span>next</span>
    <IconChevronRight className="" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span aria-hidden className={clsx('d-flex align-items-center justify-content-center h-100', className)} {...props}>
    <IconDots size={14} className="mx-1" />
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
