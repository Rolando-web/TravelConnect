import { useState } from "react";
import { X, Search } from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";

export default function CurrencyModal() {
  const { currencies, selectedCurrency, modalOpen, closeModal, changeCurrency } = useCurrency();
  const [search, setSearch] = useState("");

  if (!modalOpen) return null;

  const topCurrencies = currencies.filter((c) => c.isTop);
  const filteredCurrencies = currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Select Currency</h2>
          <button
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search currencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008fe5]/30 focus:border-[#008fe5] transition"
            />
          </div>

          {/* Top Currencies */}
          {!search && (
            <div className="mb-6">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                Top Currencies
              </h3>
              <div className="flex flex-wrap gap-2">
                {topCurrencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => changeCurrency(c.code)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      selectedCurrency === c.code
                        ? "bg-[#008fe5] text-white shadow-md shadow-blue-500/20"
                        : "bg-blue-50 text-[#008fe5] hover:bg-blue-100 border border-blue-100"
                    }`}
                  >
                    {c.code} - {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Currencies Grid */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
              {search ? "Search Results" : "All Currencies"}
            </h3>
            <div className="grid grid-cols-3 gap-y-2 gap-x-4">
              {filteredCurrencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => changeCurrency(c.code)}
                  className={`p-3 rounded-xl text-left text-sm transition-all ${
                    selectedCurrency === c.code
                      ? "bg-blue-50 text-[#008fe5] font-bold ring-2 ring-[#008fe5]/20"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block">{c.code}</span>
                  <span className="text-xs text-slate-500 truncate block">{c.name}</span>
                </button>
              ))}
              {filteredCurrencies.length === 0 && (
                <p className="col-span-3 text-center text-sm text-slate-400 py-8">
                  No currencies found matching "{search}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 text-center">
            Prices are converted from PHP using the latest exchange rates
          </p>
        </div>
      </div>
    </div>
  );
}
