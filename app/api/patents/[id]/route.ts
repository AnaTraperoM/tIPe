import { NextRequest, NextResponse } from "next/server";
import type { Patent } from "@/app/lib/types";
import { isBigQueryConfigured, getPatentById } from "@/app/lib/bigquery";
import * as fs from "fs";
import * as path from "path";

function findInCache(id: string): Patent | null {
  try {
    const cachePath = path.join(process.cwd(), "public", "data", "patents-cache.json");
    if (!fs.existsSync(cachePath)) return null;
    const raw = fs.readFileSync(cachePath, "utf-8");
    const data = JSON.parse(raw) as { patents: Patent[] };
    return data.patents.find(p => p.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;

    // Try cache first (works without BigQuery)
    const cached = findInCache(id);
    if (cached) return NextResponse.json<Patent>(cached);

    // Fall back to BigQuery if configured
    if (isBigQueryConfigured()) {
      const patent = await getPatentById(id);
      if (patent) return NextResponse.json<Patent>(patent);
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("[/api/patents/[id]]", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
