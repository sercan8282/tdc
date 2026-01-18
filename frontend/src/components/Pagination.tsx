import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of visible range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range if at the beginning or end
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, maxVisiblePages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxVisiblePages + 2);
      }
      
      // Add ellipsis if needed before the range
      if (start > 2) {
        pages.push('...');
      }
      
      // Add pages in range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed after the range
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* First page button */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Eerste pagina"
      >
        <ChevronsLeft className="w-5 h-5" />
      </button>

      {/* Previous page button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Vorige pagina"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 py-2 text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      {/* Next page button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Volgende pagina"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Last page button */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-2 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Laatste pagina"
      >
        <ChevronsRight className="w-5 h-5" />
      </button>
    </div>
  );
}
