"use client";

import type { FTOProgress } from "@/app/lib/types";

interface Props {
  steps: FTOProgress[];
  brief: string;
}

export default function AnalysisProgress({ steps, brief }: Props) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div
        className="px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Analyzing Patent Landscape
        </h2>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: "var(--muted)" }}
        >
          {brief}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col gap-5 w-full max-w-md">
          {steps.map((step) => (
            <div key={step.step} className="flex items-start gap-3">
              {/* Status icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === "done" && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ background: "rgba(82,201,139,0.15)", color: "#52c98b" }}
                  >
                    &#x2713;
                  </div>
                )}
                {step.status === "active" && (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      className="animate-spin"
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                )}
                {step.status === "pending" && (
                  <div
                    className="w-6 h-6 rounded-full border-2"
                    style={{ borderColor: "var(--border)" }}
                  />
                )}
              </div>

              {/* Label */}
              <div>
                <div
                  className="text-base font-medium"
                  style={{
                    color:
                      step.status === "done"
                        ? "var(--foreground)"
                        : step.status === "active"
                          ? "var(--accent)"
                          : "var(--muted)",
                  }}
                >
                  {step.step === "features" && "Extract Features"}
                  {step.step === "search" && "Patent Search"}
                  {step.step === "screening" && "Patent Screening"}
                  {step.step === "claims" && "Claims Comparison"}
                  {step.step === "report" && "Report Generation"}
                </div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: "var(--muted)" }}
                >
                  {step.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
