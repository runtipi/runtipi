import * as React from 'react';

import { IconChevronLeft, IconChevronRight, IconDots } from '@tabler/icons-react';
import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import styles from './Pagination.module.scss';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav aria-label="pagination" className={clsx('m-0 ms-auto', className)} {...props} />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(({ className, ...props }, ref) => (
  <ul ref={ref} className={clsx('pagination', className)} {...props} />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'> & { isActive?: boolean }>(
  ({ className, isActive, ...props }, ref) => <li ref={ref} className={clsx('page-item', { active: isActive }, className)} {...props} />,
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  small?: boolean;
} & ButtonProps;

const PaginationLink = ({ className, small = true, disabled, ...props }: PaginationLinkProps) => (
  <Button
    aria-disabled={disabled}
    disabled={disabled}
    size="sm"
    variant="ghost"
    className={clsx('page-link cursor-pointer', { [`${styles.paginationLink}`]: small }, styles.pageButton, className)}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" small={false} className={clsx('', className)} {...props}>
    <IconChevronLeft className="" />
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" small={false} className={clsx('', className)} {...props}>
    <IconChevronRight className="" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span aria-hidden className={clsx('px-1 d-flex align-items-center justify-content-center h-100', styles.paginationLink, className)} {...props}>
    <IconDots size={14} className="mx-1" />
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
