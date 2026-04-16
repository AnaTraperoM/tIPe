import { NextRequest, NextResponse } from "next/server";
import type { Patent, ComparisonResult } from "@/app/lib/types";
import { comparePatents } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { patents }: { patents: Patent[] } = await req.json();

    if (!patents || patents.length < 2 || patents.length > 3) {
      return NextResponse.json({ error: "Provide 2–3 patents" }, { status: 400 });
    }

    const result = await comparePatents(patents);
    return NextResponse.json<ComparisonResult>(result);
  } catch (err) {
    console.error("[/api/ai/compare]", err);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
