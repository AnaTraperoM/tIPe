"use client";

import { X } from "lucide-react";
import type { Patent, ComparisonResult } from "@/app/lib/types";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

interface Props {
  patents: Patent[];
  result: ComparisonResult | null;
  loading: boolean;
  onCompare: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ComparePanel({ patents, result, loading, onCompare, onRemove, onClose }: Props) {
  return (
    <div
      className="absolute inset-y-0 right-0 flex flex-col overflow-hidden"
      style={{
        width: 480,
        background: "var(--surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 20,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Compare Patents
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5" style={{ color: "var(--muted)" }}>
          <X size={16} />
        </button>
      </div>

      {/* Patent chips */}
      <div className="flex flex-wrap gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {patents.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs"
            style={{
              background: `${CATEGORY_COLORS[p.category] ?? "#888"}22`,
              border: `1px solid ${CATEGORY_COLORS[p.category] ?? "#888"}55`,
              color: CATEGORY_COLORS[p.category] ?? "#888",
            }}
          >
            <span className="font-mono">{p.id.slice(-8)}</span>
            <button onClick={() => onRemove(p.id)} className="opacity-60 hover:opacity-100">
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={onCompare}
          disabled={patents.length < 2 || loading}
          className="rounded px-3 py-1 text-xs font-medium transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Analyzing…" : "Run Comparison"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!result && !loading && (
          /* Pre-comparison: side-by-side cards */
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Select 2–3 patents (Shift+click on map) then run comparison to get an AI analysis.
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(patents.length, 3)}, 1fr)` }}>
              {patents.map((p) => (
                <div key={p.id} className="rounded-xl p-4 flex flex-col gap-2"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="text-xs font-mono truncate" style={{ color: "var(--accent-light)" }}>{p.id}</div>
                  <div className="text-xs font-medium leading-snug" style={{ color: "var(--foreground)" }}>{p.title}</div>
                  <div className="flex gap-1.5 flex-wrap mt-auto">
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${CATEGORY_COLORS[p.category] ?? "#888"}22`, color: CATEGORY_COLORS[p.category] ?? "#888" }}>
                      {p.category}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                      {p.year}
                    </span>
                  </div>
                  {p.abstract && (
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>{p.abstract}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-40 gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Comparing with Claude AI…
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-5">
            {/* Summary */}
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Summary</div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--accent-light)" }}>{result.summary}</p>
            </div>

            {/* Similarities & Differences */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>Similarities</div>
                <ul className="flex flex-col gap-1.5">
                  {result.similarities.map((s, i) => (
                    <li key={i} className="text-xs leading-relaxed flex gap-1.5" style={{ color: "var(--accent-light)" }}>
                      <span style={{ color: "#10b981", flexShrink: 0 }}>·</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>Differences</div>
                <ul className="flex flex-col gap-1.5">
                  {result.differences.map((d, i) => (
                    <li key={i} className="text-xs leading-relaxed flex gap-1.5" style={{ color: "var(--accent-light)" }}>
                      <span style={{ color: "#ef4444", flexShrink: 0 }}>·</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Novelty assessment */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent-light)" }}>Novelty Assessment</div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--accent-light)" }}>{result.noveltyAssessment}</p>
            </div>

            {/* Comparison table */}
            {result.tableRows.length > 0 && (
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Comparison Table</div>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--surface-2)" }}>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--muted)", borderRight: "1px solid var(--border)" }}>
                          Dimension
                        </th>
                        {patents.map((p) => (
                          <th key={p.id} className="text-left px-3 py-2 font-mono" style={{ color: "var(--accent-light)" }}>
                            {p.id.slice(-8)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.tableRows.map((row, i) => (
                        <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--muted)", borderRight: "1px solid var(--border)", background: "var(--surface-2)" }}>
                            {row.dimension}
                          </td>
                          {row.values.map((v, j) => (
                            <td key={j} className="px-3 py-2" style={{ color: "var(--accent-light)" }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
