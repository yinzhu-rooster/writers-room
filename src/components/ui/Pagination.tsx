'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500" aria-current="page">
        {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
      >
        Next
      </button>
    </nav>
  );
}
