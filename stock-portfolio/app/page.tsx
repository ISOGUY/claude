"use client";

import { useState, useEffect, useCallback } from "react";

interface Holding {
  id: string;
  ticker: string;
  shares: number;
}

interface StockData {
  price?: number;
  currency?: string;
  name?: string;
  error?: string;
}

interface EnrichedHolding extends Holding {
  name: string;
  priceNative: number;
  currency: string;
  valueNative: number;
  valueGBP: number;
  error?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Home() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesUpdated, setRatesUpdated] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [addError, setAddError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("portfolio");
      if (saved) setHoldings(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem("portfolio", JSON.stringify(holdings));
  }, [holdings, hydrated]);

  const fetchRates = useCallback(async () => {
    const res = await fetch("/api/exchange-rate");
    const data = await res.json();
    if (data.rates) {
      setRates(data.rates);
      setRatesUpdated(data.updated ?? "");
    }
  }, []);

  const fetchPrices = useCallback(async (h: Holding[]) => {
    if (h.length === 0) return;
    const symbols = [...new Set(h.map((x) => x.ticker))].join(",");
    const res = await fetch(`/api/stocks?symbols=${symbols}`);
    const data: Record<string, StockData> = await res.json();
    setStockData(data);
  }, []);

  const refresh = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    try {
      await Promise.all([fetchRates(), fetchPrices(holdings)]);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, [holdings, fetchRates, fetchPrices]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    if (!hydrated || holdings.length === 0) return;
    fetchPrices(holdings);
    setLastRefreshed(new Date());
    const interval = setInterval(() => {
      fetchPrices(holdings);
      setLastRefreshed(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [hydrated, holdings, fetchPrices]);

  function addHolding(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    const ticker = newTicker.trim().toUpperCase();
    const shares = parseFloat(newShares);
    if (!ticker) return setAddError("Enter a ticker symbol.");
    if (!shares || shares <= 0) return setAddError("Enter a valid number of shares.");
    setHoldings((prev) => [...prev, { id: generateId(), ticker, shares }]);
    setNewTicker("");
    setNewShares("");
  }

  function removeHolding(id: string) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  function toGBP(amount: number, fromCurrency: string): number {
    if (!rates[fromCurrency]) return 0;
    return amount / rates[fromCurrency];
  }

  const enriched: EnrichedHolding[] = holdings.map((h) => {
    const sd = stockData[h.ticker];
    if (!sd) {
      return { ...h, name: h.ticker, priceNative: 0, currency: "USD", valueNative: 0, valueGBP: 0 };
    }
    if (sd.error) {
      return { ...h, name: h.ticker, priceNative: 0, currency: "USD", valueNative: 0, valueGBP: 0, error: sd.error };
    }
    const price = sd.price ?? 0;
    const currency = sd.currency ?? "USD";
    const valueNative = price * h.shares;
    const valueGBP = toGBP(valueNative, currency);
    return { ...h, name: sd.name ?? h.ticker, priceNative: price, currency, valueNative, valueGBP };
  });

  const totalGBP = enriched.reduce((sum, h) => sum + h.valueGBP, 0);
  const hasData = Object.keys(stockData).length > 0;

  const gbpFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
  const nativeFmt = (currency: string) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Stock Portfolio</h1>
          <p className="text-gray-400 mt-1">Live prices converted to British Pounds</p>
        </div>

        {/* Add stock form */}
        <form onSubmit={addHolding} className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Add Stock</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <input
                type="text"
                placeholder="Ticker (e.g. AAPL)"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <input
                type="number"
                placeholder="Shares"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                min="0.000001"
                step="any"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
        </form>

        {/* Holdings table */}
        {holdings.length > 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-200">Holdings</h2>
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-800">
                    <th className="px-5 py-3 text-left">Stock</th>
                    <th className="px-5 py-3 text-right">Shares</th>
                    <th className="px-5 py-3 text-right">Price</th>
                    <th className="px-5 py-3 text-right">Value (native)</th>
                    <th className="px-5 py-3 text-right font-bold text-gray-200">Value (GBP)</th>
                    <th className="px-5 py-3 text-right">% of total</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {enriched.map((h) => {
                    const pct = totalGBP > 0 ? (h.valueGBP / totalGBP) * 100 : 0;
                    const fetched = stockData[h.ticker];
                    return (
                      <tr key={h.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{h.ticker}</div>
                          {fetched && !fetched.error && (
                            <div className="text-xs text-gray-400 truncate max-w-[160px]">{h.name}</div>
                          )}
                          {h.error && <div className="text-xs text-red-400">{h.error}</div>}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-300">{h.shares.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-gray-300">
                          {fetched && !fetched.error
                            ? nativeFmt(h.currency).format(h.priceNative)
                            : fetched
                            ? "—"
                            : <span className="text-gray-600">Loading…</span>}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-300">
                          {fetched && !fetched.error ? nativeFmt(h.currency).format(h.valueNative) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-white">
                          {fetched && !fetched.error && h.valueGBP > 0 ? gbpFmt.format(h.valueGBP) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {fetched && !fetched.error && h.valueGBP > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-400 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-2 py-4">
                          <button
                            onClick={() => removeHolding(h.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors p-1"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasData && totalGBP > 0 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700 bg-gray-800/50">
                <span className="text-gray-300 font-semibold">Total Portfolio Value</span>
                <span className="text-2xl font-bold text-green-400">{gbpFmt.format(totalGBP)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-10 text-center text-gray-500">
            Add your first stock above to get started.
          </div>
        )}

        <div className="text-xs text-gray-600 flex flex-wrap gap-4">
          {lastRefreshed && <span>Last updated: {lastRefreshed.toLocaleTimeString("en-GB")}</span>}
          {ratesUpdated && <span>Exchange rates: {ratesUpdated}</span>}
          <span>Prices auto-refresh every 60 seconds · Powered by Yahoo Finance</span>
        </div>
      </div>
    </div>
  );
}
