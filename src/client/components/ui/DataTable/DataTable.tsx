import React from 'react';
import { Pagination } from 'react-headless-pagination';
import { ColumnDef, OnChangeFn, SortingState, Header, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, PaginationState } from '@tanstack/react-table';
import clsx from 'clsx';
import { Card, CardActions, CardHeader } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';

type IProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: PaginationState;
  pageCount?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  total?: number;
  loading?: boolean;
  tableActions?: React.ReactNode;
};

export const DataTable = <T = unknown,>(props: IProps<T>) => {
  const { columns, data, sorting, onSortingChange, pagination, pageCount = 1, onPaginationChange, total, loading, tableActions } = props;
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange,
    pageCount,
    onPaginationChange,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const renderHeader = (header: Header<T, unknown>) => {
    if (header.isPlaceholder) {
      return null;
    }

    if (header.column.getCanSort()) {
      return (
        <button
          className={clsx('table-sort cursor-pointer', { asc: header.column.getIsSorted() === 'asc', desc: header.column.getIsSorted() === 'desc' })}
          onClick={header.column.getToggleSortingHandler()}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
        </button>
      );
    }

    return flexRender(header.column.columnDef.header, header.getContext());
  };

  const renderPagination = () => {
    if (!pagination) {
      return null;
    }

    return (
      <Pagination
        edgePageCount={1}
        middlePagesSiblingCount={1}
        currentPage={pagination.pageIndex}
        setCurrentPage={table.setPageIndex}
        totalPages={pageCount}
        className="card-footer d-sm-flex align-items-center"
        truncableClassName="page-item page-link"
        truncableText="..."
      >
        <p className="m-0 mb-2 mb-sm-0 text-muted">
          Showing {pagination.pageIndex * pagination.pageSize + 1} to {pagination.pageIndex * pagination.pageSize + data.length} of {total} items
        </p>
        <ul className="pagination mb-0 ms-auto">
          <Pagination.PageButton activeClassName="active" className="page-item page-link cursor-pointer" />
        </ul>
      </Pagination>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="text-muted flex-1">
          Page
          <div className="mx-2 d-inline-block">
            <Input
              type="number"
              value={String(pagination?.pageIndex || 0 + 1)}
              onChange={(e) => table.setPageIndex(Number(e.target.value || 0))}
              min={1}
              max={pageCount + 1}
              size="sm"
              aria-label="Current page"
            />
          </div>
          of {Math.max(pageCount - 1 || 0, 1)}
        </div>
        <div className={clsx('ms-2 spinner-border spinner-border-sm text-muted d-block', { 'd-none': !loading })} role="status" />
        <CardActions>{tableActions}</CardActions>
      </CardHeader>
      <div className="table-responsive">
        <table className="table card-table table-vcenter text-nowrap datatable">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>{header.isPlaceholder ? null : renderHeader(header)}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </Card>
  );
};
