import { NextRequest, NextResponse } from "next/server";
import type { SearchRequest, SearchResponse } from "@/app/lib/types";
import { searchCachedPatents } from "@/app/lib/bigquery";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";
import { interpretSearch } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: SearchRequest = await req.json();
    const query = body.query?.trim() ?? "";
    const limit = body.limit ?? 200;

    const availableCategories = Object.keys(CATEGORY_COLORS);
    const interpretation = query ? await interpretSearch(query, availableCategories) : null;

    // Search cached patents locally (zero BigQuery cost)
    const searchQuery = interpretation?.correctedQuery ?? query;
    const patents = searchCachedPatents(searchQuery, limit);

    return NextResponse.json<SearchResponse>({
      patents,
      total: patents.length,
      mock: false,
      queryInterpretation: interpretation ?? undefined,
    });
  } catch (err) {
    console.error("[/api/patents/search]", err);
    return NextResponse.json({ error: `Search failed: ${String(err)}` }, { status: 500 });
  }
}
