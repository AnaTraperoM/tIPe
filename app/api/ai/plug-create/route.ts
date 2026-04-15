import { NextRequest, NextResponse } from "next/server";
import type { Patent, PlugCreateResult } from "@/app/lib/types";
import { plugAndCreate } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { patents }: { patents: Patent[] } = await req.json();

    if (!patents || patents.length < 2) {
      return NextResponse.json(
        { error: "Provide at least 2 patents" },
        { status: 400 }
      );
    }

    const result: PlugCreateResult = await plugAndCreate(patents);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/ai/plug-create]", err);
    return NextResponse.json(
      { error: "Plug & Create failed" },
      { status: 500 }
    );
  }
}
