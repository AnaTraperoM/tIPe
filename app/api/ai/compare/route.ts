import { NextRequest, NextResponse } from "next/server";
import type { Patent, ComparisonResult } from "@/app/lib/types";
import { isAnthropicConfigured, comparePatents } from "@/app/lib/anthropic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { patents }: { patents: Patent[] } = await req.json();

    if (!patents || patents.length < 2 || patents.length > 3) {
      return NextResponse.json({ error: "Provide 2–3 patents" }, { status: 400 });
    }

    if (!isAnthropicConfigured()) {
      return NextResponse.json<ComparisonResult>({
        patents: patents.map((p) => p.id),
        summary: `These ${patents.length} patents share a technical domain but differ in their specific approach and scope. Each addresses distinct aspects of the problem space.`,
        similarities: [
          `All patents operate in the ${patents[0].category} domain`,
          "Similar technical vocabulary and methodology",
          "Comparable scope of claims",
        ],
        differences: [
          `Filed across different years: ${patents.map((p) => p.year).join(", ")}`,
          "Different assignees and organizational contexts",
          "Distinct primary claims and independent innovations",
        ],
        noveltyAssessment: `Each patent addresses a unique facet of ${patents[0].category} technology. Together they represent a progression of innovation in the field across the period ${Math.min(...patents.map((p) => p.year))}–${Math.max(...patents.map((p) => p.year))}.`,
        tableRows: [
          { dimension: "Year", values: patents.map((p) => String(p.year)) },
          { dimension: "Category", values: patents.map((p) => p.category) },
          { dimension: "Assignee", values: patents.map((p) => p.assignee ?? "Unknown") },
          { dimension: "IPC Code", values: patents.map((p) => p.ipcCodes?.[0] ?? "N/A") },
        ],
      });
    }

    const result = await comparePatents(patents);
    return NextResponse.json<ComparisonResult>(result);
  } catch (err) {
    console.error("[/api/ai/compare]", err);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
