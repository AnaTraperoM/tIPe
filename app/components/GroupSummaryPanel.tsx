"use client";

import type { Patent, GroupSummaryResult } from "@/app/lib/types";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

interface Props {
  patents: Patent[];
  result: GroupSummaryResult | null;
  loading: boolean;
  onSummarize: () => void;
  onClose: () => void;
}

export default function GroupSummaryPanel({ patents, result, loading, onSummarize, onClose }: Props) {
  const categories = [...new Set(patents.map(p => p.category))];
  const years = patents.map(p => p.year);
  const yearMin = Math.min(...years);
  const yearMax = Math.max(...years);

  return (
    <div
      className="absolute left-3 top-3 rounded-xl flex flex-col gap-3 p-4"
      style={{
        width: 280,
        background: "rgba(12,11,10,0.97)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        zIndex: 20,
        maxHeight: "calc(100% - 24px)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            {patents.length} patents selected
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {yearMin === yearMax ? yearMin : `${yearMin}–${yearMax}`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs leading-none"
          style={{ color: "var(--muted)" }}
        >
          ✕
        </button>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => (
          <span
            key={cat}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: `${CATEGORY_COLORS[cat] ?? "#888"}22`,
              color: CATEGORY_COLORS[cat] ?? "#888",
              border: `1px solid ${CATEGORY_COLORS[cat] ?? "#888"}44`,
            }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Summarize button / results */}
      {!result && (
        <button
          onClick={onSummarize}
          disabled={loading}
          className="text-xs py-2 px-3 rounded-lg font-medium transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Summarizing…" : "Summarize with AI"}
        </button>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed" style={{ color: "var(--foreground)" }}>
            {result.summary}
          </p>

          {result.themes.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted)" }}>
                KEY THEMES
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.themes.map(theme => (
                  <span
                    key={theme}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface-2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onSummarize}
            className="text-xs py-1.5 px-3 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            Re-summarize
          </button>
        </div>
      )}
    </div>
  );
}
