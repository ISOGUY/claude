import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const tickers = symbols.split(",").map((s) => s.trim().toUpperCase());
  const results: Record<string, { price: number; currency: string; name: string } | { error: string }> = {};

  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;

        if (!meta) throw new Error("No data");

        results[ticker] = {
          price: meta.regularMarketPrice ?? meta.previousClose,
          currency: meta.currency ?? "USD",
          name: meta.longName ?? meta.shortName ?? ticker,
        };
      } catch (e) {
        results[ticker] = { error: e instanceof Error ? e.message : "Failed" };
      }
    })
  );

  return NextResponse.json(results);
}
