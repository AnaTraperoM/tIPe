import { NextRequest, NextResponse } from "next/server";
import type { UploadAnalysisResult } from "@/app/lib/types";
import { isBigQueryConfigured, vectorSearchByText, searchCachedPatents } from "@/app/lib/bigquery";
import { computeUploadCoordinates } from "@/app/lib/embeddings";

// Force Node.js runtime — required for pdf-parse and tesseract.js
export const runtime = "nodejs";

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = file.type;

  if (type === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = (await import("pdf-parse" as string)).default ?? (await import("pdf-parse" as string));
    const result = await pdfParse(buffer);
    return result.text.slice(0, 8000);
  }

  if (type.startsWith("image/")) {
    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng");
    try {
      const { data: { text } } = await worker.recognize(buffer);
      return text.slice(0, 8000);
    } finally {
      await worker.terminate();
    }
  }

  // Plain text, .doc, etc.
  return buffer.toString("utf-8").slice(0, 8000);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let text: string;
    let inputType: "file" | "idea";
    let radius: number;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = (body.text ?? "").slice(0, 8000);
      radius = Math.min(50, Math.max(1, Number(body.radius) || 10));
      inputType = "idea";
      if (!text.trim()) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file");
      radius = Math.min(50, Math.max(1, Number(formData.get("radius")) || 10));
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      text = await extractText(file as File);
      inputType = "file";
    }

    // Vector search BigQuery for semantically similar patents, fall back to cached search
    let relatedPatents;
    try {
      relatedPatents = isBigQueryConfigured()
        ? await vectorSearchByText(text, radius)
        : searchCachedPatents(text, radius);
    } catch {
      console.warn("[analyze-upload] BigQuery vector search failed, using cached patents");
      relatedPatents = searchCachedPatents(text, radius);
    }

    // Derive category from majority of results
    const catCounts = new Map<string, number>();
    for (const p of relatedPatents) {
      catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
    }
    const detectedCategory = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
    const coords = computeUploadCoordinates(detectedCategory);

    // Build summary from results
    const categories = [...new Set(relatedPatents.map(p => p.category))];
    const years = relatedPatents.map(p => p.year).filter(y => y > 0);
    const yearMin = years.length ? Math.min(...years) : 2000;
    const yearMax = years.length ? Math.max(...years) : 2024;
    const topAssignees = [...new Set(relatedPatents.map(p => p.assignee).filter(Boolean))].slice(0, 5);

    const spaceSummary = `This idea maps to the ${categories.join(", ")} technology space. `
      + `The ${relatedPatents.length} most similar patents span ${yearMin}–${yearMax}, `
      + `with key players including ${topAssignees.length ? topAssignees.join(", ") : "various assignees"}. `
      + `The concentration across ${categories.length} categories suggests ${categories.length > 3 ? "a cross-disciplinary innovation space" : "a focused technology domain"}.`;

    const aiSummary = `Found ${relatedPatents.length} semantically similar patents via vector search across the Google Patents corpus. `
      + `The closest matches are in ${detectedCategory}, indicating your idea falls within this technology landscape.`;

    // Extract potential claims from top patent abstracts
    const mainClaims = relatedPatents.slice(0, 5)
      .map(p => p.abstract ?? "")
      .filter(a => a.length > 50)
      .map(a => {
        const firstSentence = a.split(/\.\s/)[0];
        return firstSentence.length > 200 ? firstSentence.slice(0, 200) + "…" : firstSentence + ".";
      });

    return NextResponse.json<UploadAnalysisResult>({
      extractedText: text.slice(0, 500),
      placementCoords: coords,
      relatedPatents,
      aiSummary,
      detectedCategory,
      inputType,
      spaceSummary,
      mainClaims,
    });
  } catch (err) {
    console.error("[/api/ai/analyze-upload]", err);
    return NextResponse.json({ error: `Analysis failed: ${String(err)}` }, { status: 500 });
  }
}
