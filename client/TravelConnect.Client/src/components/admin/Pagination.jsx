import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination
 * @param {number}   page       – current 1-indexed page
 * @param {number}   totalPages – total number of pages
 * @param {number}   total      – total number of rows (for the "X–Y of Z" label)
 * @param {number}   pageSize   – rows per page
 * @param {Function} onPage     – callback(newPage)
 */
export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page numbers: always show first, last, current ±1, with "…" gaps
  const pages = [];
  const addPage = (n) => {
    if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n);
  };
  addPage(1);
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) addPage(i);
  addPage(totalPages);
  pages.sort((a, b) => a - b);

  // Insert ellipsis markers
  const items = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push("ellipsis-" + i);
    items.push(pages[i]);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-navy-700 text-xs text-text-secondary">
      <span>
        Showing <span className="text-text-primary font-semibold">{from}–{to}</span> of{" "}
        <span className="text-text-primary font-semibold">{total}</span> records
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-navy-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {items.map((item) =>
          typeof item === "string" ? (
            <span key={item} className="px-1 select-none">…</span>
          ) : (
            <button
              key={item}
              onClick={() => onPage(item)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                item === page
                  ? "bg-cyan-accent text-navy-900"
                  : "hover:bg-navy-700 text-text-secondary hover:text-text-primary"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-navy-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
