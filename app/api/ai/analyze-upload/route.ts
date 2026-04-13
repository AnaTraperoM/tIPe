import { NextRequest, NextResponse } from "next/server";
import type { UploadAnalysisResult } from "@/app/lib/types";
import { isAnthropicConfigured, analyzeUploadedDocument } from "@/app/lib/anthropic";
import { generateMockPatents } from "@/app/lib/mock-data";
import { computeUploadCoordinates, CLUSTER_CENTERS } from "@/app/lib/embeddings";

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

/** Euclidean distance between two points in [0,1] space */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let text: string;
    let inputType: "file" | "idea";
    let radius: number;
    let fileName: string | undefined;

    if (contentType.includes("application/json")) {
      // Text idea submission
      const body = await req.json();
      text = (body.text ?? "").slice(0, 8000);
      radius = Math.min(50, Math.max(1, Number(body.radius) || 10));
      inputType = "idea";
      if (!text.trim()) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
    } else {
      // File upload (FormData)
      const formData = await req.formData();
      const file = formData.get("file");
      radius = Math.min(50, Math.max(1, Number(formData.get("radius")) || 10));
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      text = await extractText(file as File);
      fileName = (file as File).name;
      inputType = "file";
    }

    const allPatents = generateMockPatents();

    if (!isAnthropicConfigured()) {
      // Mock fallback: pick a category, find nearest patents by distance
      const category = "Machine Learning";
      const coords = computeUploadCoordinates(category);
      const sorted = [...allPatents]
        .map(p => ({ patent: p, dist: dist(coords, { x: p.x, y: p.y }) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, radius);

      const categories = [...new Set(sorted.map(s => s.patent.category))];

      return NextResponse.json<UploadAnalysisResult>({
        extractedText: text.slice(0, 500),
        placementCoords: coords,
        relatedPatents: sorted.map(s => s.patent),
        aiSummary: "Document analyzed. The content appears to relate to computing and technology. Connect an Anthropic API key for full AI-powered analysis with claims extraction.",
        detectedCategory: category,
        inputType,
        spaceSummary: `This idea falls within the ${categories.join(", ")} technology space. The ${radius} closest patents span innovations in these domains, indicating an active area of research and development.`,
        mainClaims: [
          "Novel approach to data processing and system optimization",
          "Integration of multiple technical components for improved performance",
          "Method and apparatus for enhanced computational efficiency",
        ],
      });
    }

    const analysis = await analyzeUploadedDocument(text, allPatents, radius);

    // Find related patents by proximity to placement coords
    const sorted = [...allPatents]
      .map(p => ({ patent: p, dist: dist(analysis.placementCoords, { x: p.x, y: p.y }) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, radius);

    // Also include any AI-identified patents that aren't already in the list
    const nearestIds = new Set(sorted.map(s => s.patent.id));
    const aiMatches = allPatents
      .filter(p => analysis.relatedPatentIds.includes(p.id) && !nearestIds.has(p.id));

    const relatedPatents = [
      ...sorted.map(s => s.patent),
      ...aiMatches,
    ].slice(0, radius);

    return NextResponse.json<UploadAnalysisResult>({
      extractedText: text.slice(0, 500),
      placementCoords: analysis.placementCoords,
      relatedPatents,
      aiSummary: analysis.summary,
      detectedCategory: analysis.category,
      inputType,
      spaceSummary: analysis.spaceSummary,
      mainClaims: analysis.mainClaims,
    });
  } catch (err) {
    console.error("[/api/ai/analyze-upload]", err);
    return NextResponse.json({ error: "Upload analysis failed" }, { status: 500 });
  }
}
