import { NextRequest, NextResponse } from "next/server";
import { summarizeGroup } from "@/app/lib/anthropic";
import type { Patent } from "@/app/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { patents }: { patents: Patent[] } = await req.json();
    if (!patents?.length) {
      return NextResponse.json({ error: "No patents provided" }, { status: 400 });
    }
    const result = await summarizeGroup(patents);
    return NextResponse.json(result);
  } catch (err) {
    console.error("summarize-group error:", err);
    return NextResponse.json({ error: "Failed to summarize group" }, { status: 500 });
  }
}
