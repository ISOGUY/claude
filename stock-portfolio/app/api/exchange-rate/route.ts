import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/GBP", {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.result !== "success") throw new Error("API error");

    return NextResponse.json({
      rates: data.rates,
      updated: data.time_last_update_utc,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
