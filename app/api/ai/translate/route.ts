import { NextRequest, NextResponse } from "next/server";
import type { Patent, TranslationResult } from "@/app/lib/types";
import { translatePatent } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const patent: Patent = await req.json();

    const result = await translatePatent(patent);
    return NextResponse.json<TranslationResult>(result);
  } catch (err) {
    console.error("[/api/ai/translate]", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
