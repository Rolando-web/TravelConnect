import { useState, useMemo } from "react";
import { Search, Plus, Download, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const STATUS_COLORS = {
  Active: "bg-emerald-100 text-emerald-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Featured: "bg-cyan-100 text-cyan-700",
  Upcoming: "bg-cyan-100 text-cyan-700",
  New: "bg-purple-100 text-purple-700",
  Qualified: "bg-purple-100 text-purple-700",
  Scheduled: "bg-purple-100 text-purple-700",
  Pending: "bg-amber-100 text-amber-700",
  Review: "bg-amber-100 text-amber-700",
  Partial: "bg-amber-100 text-amber-700",
  Inactive: "bg-red-100 text-red-700",
  Cancelled: "bg-red-100 text-red-700",
  Refunded: "bg-red-100 text-red-700",
  Expired: "bg-red-100 text-red-700",
  Closed: "bg-red-100 text-red-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  Proposal: "bg-purple-100 text-purple-700",
  Negotiation: "bg-amber-100 text-amber-700",
  Superseded: "bg-slate-100 text-slate-600",
};

function Badge({ value }) {
  const cls = STATUS_COLORS[value] || "bg-slate-100 text-slate-600";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{value}</span>;
}

export default function AdminTable({
  columns,
  data = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onView,
  searchable = true,
  searchKeys = [],
  filters = [],
  canManage = true,
  emptyMessage = "No records found",
  pageSize = 10,
  title = "",
  addLabel = "Add New",
  exportable = true,
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search && searchKeys.length > 0) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        searchKeys.some((k) => String(r[k] || "").toLowerCase().includes(q))
      );
    }
    if (activeFilter) {
      const f = filters.find((fl) =>
        fl.options.some((o) => o.value === activeFilter)
      );
      if (f) {
        rows = rows.filter((r) => r[f.key] === activeFilter);
      }
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, activeFilter, sortKey, sortDir, searchKeys, filters]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExport = () => {
    const headers = columns.map((c) => c.label).join(",");
    const rows = filtered.map((r) =>
      columns.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {searchable && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search..."
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#00A8FF]/30 focus:border-[#00A8FF]"
              />
            </div>
          )}
          {filters.map((f) =>
            f.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setActiveFilter(activeFilter === opt.value ? "" : opt.value);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeFilter === opt.value
                    ? "bg-[#00A8FF] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          {exportable && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download size={14} />
              Export
            </button>
          )}
          {canManage && onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00A8FF] text-white rounded-lg text-xs font-semibold hover:bg-[#0090E0] transition"
            >
              <Plus size={14} />
              {addLabel}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#00A8FF]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-bold text-white cursor-pointer hover:bg-[#0090E0] transition select-none"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </span>
                </th>
              ))}
              {canManage && <th className="px-4 py-3 text-right text-xs font-bold text-white w-28">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="h-4 bg-slate-200 rounded w-16 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (canManage ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr key={row.id || ri} className="hover:bg-slate-50 transition">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                      {col.render ? (
                        col.render(row[col.key], row)
                      ) : col.badge ? (
                        <Badge value={row[col.key]} />
                      ) : col.progress ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00A8FF] rounded-full transition-all"
                              style={{ width: `${Math.min((row[col.progress.num] || 0) / (row[col.progress.max] || 1) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {row[col.progress.num] || 0}/{row[col.progress.max] || 0}
                          </span>
                        </div>
                      ) : (
                        row[col.key] ?? "-"
                      )}
                    </td>
                  ))}
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(row)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
