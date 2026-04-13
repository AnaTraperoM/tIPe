import { NextRequest, NextResponse } from "next/server";
import type { SearchRequest, SearchResponse } from "@/app/lib/types";
import { isBigQueryConfigured, searchPatents } from "@/app/lib/bigquery";
import { generateMockPatents, CATEGORY_COLORS } from "@/app/lib/mock-data";
import { interpretSearch } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: SearchRequest = await req.json();
    const query = body.query?.trim() ?? "";

    const availableCategories = Object.keys(CATEGORY_COLORS);
    const interpretation = query ? await interpretSearch(query, availableCategories) : null;

    if (!isBigQueryConfigured()) {
      const all = generateMockPatents();
      const yearFrom = body.yearFrom ?? 2000;
      const yearTo = body.yearTo ?? 2030;

      const kwLower = interpretation?.keywords.map(k => k.toLowerCase()) ?? [];
      const catSet = new Set(interpretation?.suggestedCategories ?? []);
      const qLower = (interpretation?.correctedQuery ?? query).toLowerCase();

      const filtered = all.filter((p) => {
        if (!query) return p.year >= yearFrom && p.year <= yearTo;
        const titleLower = p.title.toLowerCase();
        const abstractLower = (p.abstract ?? "").toLowerCase();
        const catLower = p.category.toLowerCase();
        const matchDirect = titleLower.includes(qLower) || abstractLower.includes(qLower) || catLower.includes(qLower);
        const matchCategory = catSet.size > 0 && catSet.has(p.category);
        const matchKeyword = kwLower.length > 0 && kwLower.some(kw => titleLower.includes(kw) || abstractLower.includes(kw));
        const matchYear = p.year >= yearFrom && p.year <= yearTo;
        return matchYear && (matchDirect || matchCategory || matchKeyword);
      });

      return NextResponse.json<SearchResponse>({
        patents: filtered.slice(0, body.limit ?? 360),
        total: filtered.length,
        mock: true,
        queryInterpretation: interpretation ?? undefined,
      });
    }

    const patents = await searchPatents(body);
    return NextResponse.json<SearchResponse>({
      patents,
      total: patents.length,
      mock: false,
      queryInterpretation: interpretation ?? undefined,
    });
  } catch (err) {
    console.error("[/api/patents/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
