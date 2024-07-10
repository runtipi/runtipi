import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import React from 'react';
import { TablePagination } from 'src/app/components/TablePagination/TablePagination';

export const AppBackups = ({ appId }: { appId: string }) => {
  const [currentPage, setCurrentPage] = React.useState(1);

  return (
    <div className="card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell className="">$250.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="card-footer">
        <TablePagination
          totalPages={80}
          currentPage={currentPage}
          onPageChange={(p) => setCurrentPage(p)}
          onBack={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      </div>
    </div>
  );
};
