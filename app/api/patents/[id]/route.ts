import { NextRequest, NextResponse } from "next/server";
import type { Patent } from "@/app/lib/types";
import { isBigQueryConfigured, getPatentById } from "@/app/lib/bigquery";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    if (!isBigQueryConfigured()) {
      return NextResponse.json(
        { error: "BigQuery not configured. Set BIGQUERY_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS in .env.local" },
        { status: 503 }
      );
    }

    const { id } = await ctx.params;
    const patent = await getPatentById(id);
    if (!patent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json<Patent>(patent);
  } catch (err) {
    console.error("[/api/patents/[id]]", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
