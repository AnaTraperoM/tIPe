import { NextRequest, NextResponse } from "next/server";
import { conceptSearch } from "@/app/lib/anthropic";
import type { Patent, ConceptSearchResult } from "@/app/lib/types";
import * as fs from "fs";
import * as path from "path";

export async function POST(req: NextRequest) {
  try {
    const { concept, patents: clientPatents }: { concept: string; patents?: Patent[] } = await req.json();
    if (!concept?.trim()) {
      return NextResponse.json({ error: "No concept provided" }, { status: 400 });
    }

    let allPatents: Patent[];
    if (clientPatents?.length) {
      allPatents = clientPatents;
    } else {
      const cachePath = path.join(process.cwd(), "data", "patents-cache.json");
      if (!fs.existsSync(cachePath)) {
        return NextResponse.json(
          { error: "No patent data available. Load patents first via /api/patents/load." },
          { status: 503 }
        );
      }
      const raw = fs.readFileSync(cachePath, "utf-8");
      allPatents = (JSON.parse(raw) as { patents: Patent[] }).patents;
    }
    const availableCategories = [...new Set(allPatents.map(p => p.category))];

    // Ask Claude which categories + keywords match the concept
    const { suggestedCategories, keywords, explanation } = await conceptSearch(concept, availableCategories);

    // Filter patents locally
    const kwLower = keywords.map(k => k.toLowerCase());
    const catSet = new Set(suggestedCategories);

    const matches = allPatents.filter(p => {
      const inCategory = catSet.size > 0 && catSet.has(p.category);
      const titleLower = p.title.toLowerCase();
      const abstractLower = (p.abstract ?? "").toLowerCase();
      const kwMatch = kwLower.some(kw => titleLower.includes(kw) || abstractLower.includes(kw));
      return inCategory || kwMatch;
    });

    const result: ConceptSearchResult = {
      matchingIds: matches.map(p => p.id),
      explanation,
      suggestedCategories,
      keywords,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("concept-search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
