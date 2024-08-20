import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination/Pagination';

type TablePaginationProps = {
  totalPages: number;
  currentPage: number;
  delta?: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onBack: () => void;
};

export const TablePagination = ({ totalPages, currentPage, delta = 2, onPageChange, onNext, onBack }: TablePaginationProps) => {
  const generatePages = () => {
    const pages = [];

    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);

    if (currentPage - delta <= 2) {
      start = 2;
      end = Math.min(totalPages - 1, delta * 2 + 3);
    }

    if (currentPage + delta >= totalPages - 1) {
      start = Math.max(2, totalPages - 1 - delta * 2 - 1);
      end = totalPages - 1;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (start > 2) {
      pages.unshift('...');
    }
    if (end < totalPages - 1) {
      pages.push('...');
    }

    pages.unshift(1);
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = generatePages();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={onBack} disabled={currentPage === 1} />
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem key={page.toString()} isActive={page === currentPage}>
            {page === '...' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(Number(page));
                }}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext onClick={onNext} disabled={currentPage === totalPages} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
