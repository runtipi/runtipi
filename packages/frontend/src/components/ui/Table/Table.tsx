import clsx from 'clsx';
import type * as React from 'react';

const Table = ({ className, ...props }: React.ComponentProps<'table'>) => (
  <div className="table-responsive">
    <table className={clsx('table table-vcenter card-table', className)} {...props} />
  </div>
);

const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => <thead className={clsx('', className)} {...props} />;

const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => <tbody className={clsx('table-tbody', className)} {...props} />;

const TableFooter = ({ className, ...props }: React.ComponentProps<'tfoot'>) => <tfoot className={clsx('', className)} {...props} />;

const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => <tr className={clsx('', className)} {...props} />;

const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => <th className={clsx('', className)} {...props} />;

const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => <td className={clsx('', className)} {...props} />;

const TableCaption = ({ className, ...props }: React.ComponentProps<'caption'>) => <caption className={clsx('', className)} {...props} />;

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
