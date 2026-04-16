import { NextRequest, NextResponse } from "next/server";
import { conceptSearch } from "@/app/lib/anthropic";
import type { Patent, ConceptSearchResult } from "@/app/lib/types";
import * as fs from "fs";
import * as path from "path";

/** Score a patent's relevance to a set of keywords + categories.
 *  Higher score = more semantically related. */
function scorePatent(
  p: Patent,
  kwLower: string[],
  catSet: Set<string>,
): number {
  let score = 0;
  const titleLower = p.title.toLowerCase();
  const abstractLower = (p.abstract ?? "").toLowerCase();

  // Category match gives a base boost
  if (catSet.has(p.category)) score += 2;

  // Count how many keywords match in title (high weight) and abstract (medium weight)
  for (const kw of kwLower) {
    // Word-boundary-aware matching: check if the keyword appears as a distinct term
    if (titleLower.includes(kw)) score += 3;
    if (abstractLower.includes(kw)) score += 1;
  }

  return score;
}

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
      const cachePath = path.join(process.cwd(), "public", "data", "patents-cache.json");
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

    // Score every patent by semantic relevance
    const kwLower = keywords.map(k => k.toLowerCase());
    const catSet = new Set(suggestedCategories);

    const scored = allPatents
      .map(p => ({ patent: p, score: scorePatent(p, kwLower, catSet) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Take the top cluster — patents with score >= threshold (at least 2 keyword matches or category + 1 keyword)
    // Minimum threshold of 3 ensures meaningful matches; take up to 60 patents max
    const threshold = Math.max(3, scored.length > 0 ? Math.floor(scored[0].score * 0.3) : 3);
    const matches = scored
      .filter(({ score }) => score >= threshold)
      .slice(0, 60)
      .map(({ patent }) => patent);

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
