"use client";

import { useCallback } from "react";
import { Download, Home, MapPin } from "lucide-react";
import type { FTOReport } from "@/app/lib/types";

interface Props {
  report: FTOReport;
  onMainMenu: () => void;
  onViewOnMap: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(82,201,139,0.15)", text: "#52c98b", label: "Active" },
  pending: { bg: "rgba(232,212,77,0.15)", text: "#E8D44D", label: "Pending" },
  abandoned: { bg: "rgba(212,98,123,0.15)", text: "#D4627B", label: "Abandoned" },
};

const OVERLAP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "rgba(239,68,68,0.12)", text: "#fca5a5", label: "High Overlap" },
  moderate: { bg: "rgba(232,212,77,0.12)", text: "#E8D44D", label: "Moderate Overlap" },
  low: { bg: "rgba(82,201,139,0.12)", text: "#52c98b", label: "Low Overlap" },
};

const RELEVANCE_COLORS: Record<string, string> = {
  high: "#fca5a5",
  medium: "#E8D44D",
  low: "#52c98b",
};

export default function LandscapeReport({ report, onMainMenu, onViewOnMap }: Props) {
  const handleDownloadPDF = useCallback(() => {
    // Use browser print as a simple PDF export
    window.print();
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Sticky header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex-1 min-w-0">
          <h2
            className="text-sm font-semibold truncate"
            style={{ color: "var(--foreground)" }}
          >
            {report.brief}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {new Date(report.timestamp).toLocaleDateString()}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#fca5a5",
                fontSize: 10,
              }}
            >
              Non-binding — not legal advice
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <button
            onClick={onViewOnMap}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded transition-colors hover:opacity-80"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <MapPin size={12} />
            View on Map
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded transition-colors hover:opacity-80"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <Download size={12} />
            Download PDF
          </button>
          <button
            onClick={onMainMenu}
            className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded transition-colors hover:opacity-80"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <Home size={12} />
            Main Menu
          </button>
        </div>
      </div>

      {/* Scrollable report body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-8 max-w-3xl">
          {/* B. White Space Analysis */}
          <section>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent)" }}
            >
              B. White Space Analysis
            </div>
            <div
              className="rounded-lg p-5"
              style={{
                background: "rgba(82,201,139,0.06)",
                border: "1px solid rgba(82,201,139,0.2)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "#52c98b" }}
              >
                Where your innovation could be novel
              </h3>
              <p
                className="text-xs leading-relaxed mb-4"
                style={{ color: "var(--muted)" }}
              >
                {report.whiteSpace.summary}
              </p>

              {report.whiteSpace.gaps.length > 0 && (
                <div className="mb-4">
                  <div
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    Gaps in existing landscape
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {report.whiteSpace.gaps.map((gap, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-xs leading-relaxed"
                        style={{ color: "var(--muted)" }}
                      >
                        <span style={{ color: "#52c98b", flexShrink: 0 }}>
                          &#x25CB;
                        </span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.whiteSpace.suggestedAngles.length > 0 && (
                <div>
                  <div
                    className="text-xs font-semibold mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    Suggested angles for patent filing
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {report.whiteSpace.suggestedAngles.map((angle, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-xs leading-relaxed"
                        style={{ color: "var(--muted)" }}
                      >
                        <span style={{ color: "var(--accent)", flexShrink: 0 }}>
                          &rarr;
                        </span>
                        {angle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* C. Innovation Summary */}
          <section>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent)" }}
            >
              C. Innovation Summary
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <th
                      className="text-left py-2 px-3 font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)", width: 140 }}
                    >
                      Type
                    </th>
                    <th
                      className="text-left py-2 px-3 font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}
                    >
                      Description
                    </th>
                    <th
                      className="text-left py-2 px-3 font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)", width: 180 }}
                    >
                      Keywords
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.features.map((f, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        className="py-2.5 px-3 font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {f.type}
                      </td>
                      <td
                        className="py-2.5 px-3"
                        style={{ color: "var(--muted)" }}
                      >
                        {f.description}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {f.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--surface-2)",
                                color: "var(--accent-light)",
                                fontSize: 10,
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* D. Patent Landscape Overview */}
          <section>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent)" }}
            >
              D. Patent Landscape Overview
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div
                className="rounded p-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="text-lg font-bold tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {report.landscape.totalAnalyzed}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Patents analyzed
                </div>
              </div>
              <div
                className="rounded p-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex gap-3">
                  <div>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: "#fca5a5" }}
                    >
                      {report.landscape.highRelevance}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
                      high
                    </span>
                  </div>
                  <div>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: "#E8D44D" }}
                    >
                      {report.landscape.mediumRelevance}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
                      med
                    </span>
                  </div>
                  <div>
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: "#52c98b" }}
                    >
                      {report.landscape.lowRelevance}
                    </span>
                    <span className="text-xs ml-1" style={{ color: "var(--muted)" }}>
                      low
                    </span>
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  Relevance distribution
                </div>
              </div>
              <div
                className="rounded p-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  Top assignees
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {report.landscape.topAssignees.slice(0, 3).map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <span
                        className="truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {a.name}
                      </span>
                      <span
                        className="tabular-nums ml-2 flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                      >
                        {a.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* E. Key Claims Analysis */}
          <section>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent)" }}
            >
              E. Key Claims Analysis
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
              Claims sorted by relevance to your idea
            </p>
            <div className="flex flex-col gap-3">
              {report.claims.map((claim, i) => {
                const overlap = OVERLAP_COLORS[claim.overlapLevel] ?? OVERLAP_COLORS.low;
                const status = STATUS_COLORS[claim.patentStatus] ?? STATUS_COLORS.active;
                return (
                  <div
                    key={i}
                    className="rounded-lg p-4"
                    style={{
                      background: overlap.bg,
                      border: `1px solid ${overlap.text}33`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ background: overlap.bg, color: overlap.text }}
                      >
                        {overlap.label}
                      </span>
                    </div>
                    <div
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      Claim {claim.claimNumber} &mdash; {claim.patentId}{" "}
                      <span
                        className="px-1.5 py-0.5 rounded ml-1"
                        style={{
                          background: status.bg,
                          color: status.text,
                          fontSize: 10,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p
                      className="text-xs leading-relaxed mb-2 italic"
                      style={{ color: "var(--muted)" }}
                    >
                      &ldquo;{claim.claimText}&rdquo;
                    </p>
                    <div>
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: "var(--foreground)" }}
                      >
                        Why it matters:
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--muted)" }}
                      >
                        {claim.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* F. Patent List Table */}
          <section>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--accent)" }}
            >
              F. Patent List
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["#", "Patent ID", "Title", "Status", "Assignee", "Relevance", "Year"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left py-2 px-2 font-semibold uppercase tracking-wider"
                          style={{ color: "var(--muted)" }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.patents.map((p, i) => {
                    const status = STATUS_COLORS[p.status] ?? STATUS_COLORS.active;
                    return (
                      <tr
                        key={p.patentId}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td
                          className="py-2 px-2 tabular-nums"
                          style={{ color: "var(--muted)" }}
                        >
                          {i + 1}
                        </td>
                        <td
                          className="py-2 px-2 font-mono"
                          style={{ color: "var(--accent-light)" }}
                        >
                          {p.patentId}
                        </td>
                        <td
                          className="py-2 px-2"
                          style={{
                            color: "var(--foreground)",
                            maxWidth: 200,
                          }}
                        >
                          <span className="truncate block">{p.title}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              background: status.bg,
                              color: status.text,
                              fontSize: 10,
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2"
                          style={{ color: "var(--muted)" }}
                        >
                          {p.assignee}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            style={{
                              color: RELEVANCE_COLORS[p.relevance] ?? "var(--muted)",
                              fontWeight: 600,
                            }}
                          >
                            {p.relevance.charAt(0).toUpperCase() + p.relevance.slice(1)}
                          </span>
                        </td>
                        <td
                          className="py-2 px-2 tabular-nums"
                          style={{ color: "var(--muted)" }}
                        >
                          {p.year}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
