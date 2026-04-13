import { NextRequest, NextResponse } from "next/server";
import { isBigQueryConfigured, loadInitialPatents } from "@/app/lib/bigquery";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 10000;

    if (!isBigQueryConfigured()) {
      return NextResponse.json(
        { error: "BigQuery not configured. Set BIGQUERY_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS in .env.local" },
        { status: 503 }
      );
    }

    const patents = await loadInitialPatents(limit);
    return NextResponse.json({ patents, source: "bigquery", count: patents.length });
  } catch (err) {
    console.error("[/api/patents/load]", err);
    return NextResponse.json(
      { error: `BigQuery query failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
