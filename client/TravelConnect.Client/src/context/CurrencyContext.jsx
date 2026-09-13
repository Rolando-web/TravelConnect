import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { currencies, defaultExchangeRates, DEFAULT_CURRENCY } from "../data/currencies";

const CurrencyContext = createContext(null);

const STORAGE_KEY = "travelconnect_currency";
const RATES_CACHE_KEY = "travelconnect_exchange_rates";
const RATES_CACHE_TIMESTAMP = "travelconnect_rates_timestamp";
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export function CurrencyProvider({ children }) {
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_CURRENCY;
      return currencies.some((c) => c.code === saved) ? saved : DEFAULT_CURRENCY;
    } catch {
      return DEFAULT_CURRENCY;
    }
  });

  const [exchangeRates, setExchangeRates] = useState(() => {
    try {
      const cached = localStorage.getItem(RATES_CACHE_KEY);
      const timestamp = localStorage.getItem(RATES_CACHE_TIMESTAMP);
      if (
        cached &&
        timestamp &&
        Date.now() - Number(timestamp) < CACHE_DURATION_MS &&
        !Number.isNaN(Number(timestamp))
      ) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed[DEFAULT_CURRENCY]) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultExchangeRates;
  });

  const [modalOpen, setModalOpen] = useState(false);

  // Fetch exchange rates from API
  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${DEFAULT_CURRENCY}`
      );
      if (!response.ok) throw new Error("Failed to fetch rates");
      const data = await response.json();

      // Map API rates to our format (API returns rates relative to base)
      const rates = { [DEFAULT_CURRENCY]: 1 };
      for (const [code, rate] of Object.entries(data.rates)) {
        if (currencies.some((c) => c.code === code)) {
          rates[code] = rate;
        }
      }

      setExchangeRates(rates);
      localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(rates));
      localStorage.setItem(RATES_CACHE_TIMESTAMP, String(Date.now()));
    } catch (err) {
      console.warn("Using default exchange rates:", err.message);
    }
  }, []);

  // Fetch rates on mount if cache is expired
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      let expired = true;
      try {
        const timestamp = localStorage.getItem(RATES_CACHE_TIMESTAMP);
        const ts = Number(timestamp);
        expired = !timestamp || Number.isNaN(ts) || Date.now() - ts >= CACHE_DURATION_MS;
      } catch {
        // ignore
      }
      if (!cancelled && expired) await fetchRates();
    };
    refresh();
    return () => { cancelled = true; };
  }, [fetchRates]);

  // Change currency and persist to localStorage
  const changeCurrency = useCallback((code) => {
    if (currencies.some((c) => c.code === code)) {
      setSelectedCurrency(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore
      }
      setModalOpen(false);
    }
  }, []);

  // Convert price from PHP (base) to target currency
  const convertPrice = useCallback(
    (amountInPHP, targetCurrency = selectedCurrency) => {
      const amount = Number(amountInPHP);
      if (!Number.isFinite(amount) || amount === 0) return 0;
      const rate = exchangeRates[targetCurrency] || 1;
      return Math.round(amount * rate * 100) / 100;
    },
    [exchangeRates, selectedCurrency]
  );

  // Format price with currency symbol
  const formatPrice = useCallback(
    (amount, currencyCode = selectedCurrency) => {
      const currency = currencies.find((c) => c.code === currencyCode) || currencies[0];
      const num = Number(amount);
      const formatted = (Number.isFinite(num) ? num : 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `${currency.symbol} ${formatted}`;
    },
    [selectedCurrency]
  );

  // Convert and format in one call
  const displayPrice = useCallback(
    (amountInPHP, targetCurrency = selectedCurrency) => {
      const converted = convertPrice(amountInPHP, targetCurrency);
      return formatPrice(converted, targetCurrency);
    },
    [convertPrice, formatPrice, selectedCurrency]
  );

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const currentCurrency = currencies.find((c) => c.code === selectedCurrency) || currencies[0];

  const value = {
    currencies,
    selectedCurrency,
    currentCurrency,
    exchangeRates,
    modalOpen,
    openModal,
    closeModal,
    changeCurrency,
    convertPrice,
    formatPrice,
    displayPrice,
    fetchRates,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
