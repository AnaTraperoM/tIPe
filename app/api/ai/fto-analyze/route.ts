import { NextRequest, NextResponse } from "next/server";
import type { Patent, FTOReport } from "@/app/lib/types";
import { analyzeFTO } from "@/app/lib/anthropic";
import * as fs from "fs";
import * as path from "path";

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { brief, content, patentCount } = body as {
      brief: string;
      content: string;
      patentCount: number;
    };

    if (!brief || !content) {
      return NextResponse.json(
        { error: "Brief and content are required" },
        { status: 400 }
      );
    }

    const count = Math.min(Math.max(patentCount || 20, 1), 40);
    const allPatents = loadPatents();

    const report: FTOReport = await analyzeFTO(brief, content, count, allPatents);
    return NextResponse.json(report);
  } catch (err) {
    console.error("[/api/ai/fto-analyze]", err);
    return NextResponse.json(
      { error: "FTO analysis failed" },
      { status: 500 }
    );
  }
}
