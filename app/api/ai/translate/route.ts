import { NextRequest, NextResponse } from "next/server";
import type { Patent, TranslationResult } from "@/app/lib/types";
import { isAnthropicConfigured, translatePatent } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const patent: Patent = await req.json();

    if (!isAnthropicConfigured()) {
      return NextResponse.json<TranslationResult>({
        patentId: patent.id,
        summary: `This patent describes a ${patent.category.toLowerCase()} innovation from ${patent.year}. It introduces a novel approach that improves upon existing methods in the field.`,
        keyInnovation: `A novel method combining multiple ${patent.category.toLowerCase()} techniques to achieve better performance and efficiency.`,
        practicalUse: `Could be applied in commercial products and industrial systems within the ${patent.category.toLowerCase()} domain.`,
        technicalFields: [patent.category, "Engineering", "Applied Research"],
      });
    }

    const result = await translatePatent(patent);
    return NextResponse.json<TranslationResult>(result);
  } catch (err) {
    console.error("[/api/ai/translate]", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
