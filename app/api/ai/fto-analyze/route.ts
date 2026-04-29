import { NextRequest, NextResponse } from "next/server";
import type { Patent, FTOReport } from "@/app/lib/types";
import { analyzeFTO } from "@/app/lib/anthropic";
import * as fs from "fs";
import * as path from "path";

// Force Node.js runtime — required for pdf-parse and tesseract.js
export const runtime = "nodejs";

// Load the patents cache for analysis
function loadPatents(): Patent[] {
  try {
    const cachePath = path.join(process.cwd(), "public", "data", "patents-cache.json");
    const raw = fs.readFileSync(cachePath, "utf-8");
    const data = JSON.parse(raw) as { patents: Patent[] };
    return data.patents;
  } catch {
    return [];
  }
}

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

    let brief: string;
    let content: string;
    let patentCount: number;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      brief = (formData.get("brief") as string) ?? "";
      patentCount = Number(formData.get("patentCount")) || 20;
      const file = formData.get("file");

      if (file && typeof file !== "string") {
        content = await extractText(file as File);
        // Prepend the brief for context
        if (brief && !content.includes(brief)) {
          content = `${brief}\n\n${content}`;
        }
      } else {
        content = brief;
      }
    } else {
      // JSON body (text input)
      const body = await req.json();
      brief = (body.brief as string) ?? "";
      content = (body.content as string) ?? "";
      patentCount = (body.patentCount as number) || 20;
    }

    if (!brief && !content) {
      return NextResponse.json(
        { error: "Brief and content are required" },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(patentCount, 1), 40);
    const allPatents = loadPatents();

    const report: FTOReport = await analyzeFTO(brief || content.slice(0, 200), content, count, allPatents);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[/api/ai/fto-analyze]", err);
    return NextResponse.json(
      { error: "FTO analysis failed" },
      { status: 500 }
    );
  }
}
