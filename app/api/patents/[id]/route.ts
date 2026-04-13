import { NextRequest, NextResponse } from "next/server";
import type { Patent } from "@/app/lib/types";
import { isBigQueryConfigured, getPatentById } from "@/app/lib/bigquery";
import { generateMockPatents } from "@/app/lib/mock-data";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;

    if (!isBigQueryConfigured()) {
      const patent = generateMockPatents().find((p) => p.id === id) ?? null;
      if (!patent) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json<Patent>(patent);
    }

    const patent = await getPatentById(id);
    if (!patent) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json<Patent>(patent);
  } catch (err) {
    console.error("[/api/patents/[id]]", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
