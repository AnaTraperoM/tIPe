import { NextRequest, NextResponse } from "next/server";
import { loadInitialPatents } from "@/app/lib/bigquery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 10000;
    const patents = await loadInitialPatents(limit);
    return NextResponse.json({ patents, source: patents.length > 0 ? "cache" : "empty", count: patents.length });
  } catch (err) {
    console.error("[/api/patents/load]", err);
    return NextResponse.json(
      { error: `Failed to load patents: ${String(err)}` },
      { status: 500 }
    );
  }
}
