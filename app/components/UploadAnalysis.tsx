"use client";

import { useState } from "react";
import { FileText, ChevronRight, ChevronDown, Shield, MapPin, Lightbulb } from "lucide-react";
import type { Patent, UploadAnalysisResult } from "@/app/lib/types";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

interface Props {
  result: UploadAnalysisResult;
  onSelectPatent: (patent: Patent) => void;
}

export default function UploadAnalysis({ result, onSelectPatent }: Props) {
  const [showText, setShowText] = useState(false);
  const [showAllPatents, setShowAllPatents] = useState(false);

  const visiblePatents = showAllPatents
    ? result.relatedPatents
    : result.relatedPatents.slice(0, 8);

  const categories = [...new Set(result.relatedPatents.map(p => p.category))];

  return (
    <div className="flex flex-col gap-3">
      {/* Header: category + type badge */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: `${CATEGORY_COLORS[result.detectedCategory] ?? "#888"}22`,
            color: CATEGORY_COLORS[result.detectedCategory] ?? "#888",
            border: `1px solid ${CATEGORY_COLORS[result.detectedCategory] ?? "#888"}44`,
          }}
        >
          {result.detectedCategory}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          {result.inputType === "idea" ? "Idea analysis" : "File analysis"}
        </span>
        <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
          {result.relatedPatents.length} patents
        </span>
      </div>

      {/* Executive summary */}
      <div className="rounded-lg p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb size={12} style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Summary</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{result.aiSummary}</p>
      </div>

      {/* Space / landscape summary */}
      {result.spaceSummary && (
        <div className="rounded-lg p-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin size={12} style={{ color: "var(--accent-light)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--accent-light)" }}>Patent landscape</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{result.spaceSummary}</p>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {categories.map(cat => (
                <span
                  key={cat}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: `${CATEGORY_COLORS[cat] ?? "#888"}15`,
                    color: CATEGORY_COLORS[cat] ?? "#888",
                    fontSize: 10,
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main claims */}
      {result.mainClaims && result.mainClaims.length > 0 && (
        <div className="rounded-lg p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={12} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Potential claims</span>
          </div>
          <ol className="flex flex-col gap-1.5 pl-0" style={{ listStyle: "none", margin: 0 }}>
            {result.mainClaims.map((claim, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                <span className="font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--accent)", minWidth: 16, textAlign: "right" }}>
                  {i + 1}.
                </span>
                <span>{claim}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Extracted text preview (for file uploads) */}
      {result.extractedText && result.inputType === "file" && (
        <div>
          <button
            onClick={() => setShowText((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "var(--muted)" }}
          >
            {showText ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Extracted text preview
          </button>
          {showText && (
            <div
              className="mt-2 rounded-lg p-3 text-xs font-mono leading-relaxed"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 150,
                overflow: "auto",
              }}
            >
              {result.extractedText}
            </div>
          )}
        </div>
      )}

      {/* Related patents list */}
      {result.relatedPatents.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
            Related patents ({result.relatedPatents.length})
          </div>
          <div className="flex flex-col gap-0.5" style={{ maxHeight: 320, overflowY: "auto" }}>
            {visiblePatents.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onSelectPatent(p)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-left transition-colors w-full group"
                style={{ border: "1px solid transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="flex-shrink-0 rounded-full"
                  style={{
                    width: 8, height: 8,
                    background: CATEGORY_COLORS[p.category] ?? "var(--accent-light)",
                  }}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs truncate" style={{ color: "var(--foreground)" }}>{p.title}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--muted)", fontSize: 10 }}>{p.id} · {p.year} · {p.category}</span>
                </div>
                <ChevronRight size={10} style={{ color: "var(--muted)", flexShrink: 0, opacity: 0.5 }} />
              </button>
            ))}
          </div>
          {result.relatedPatents.length > 8 && !showAllPatents && (
            <button
              onClick={() => setShowAllPatents(true)}
              className="text-xs mt-1 w-full text-center py-1 rounded"
              style={{ color: "var(--accent-light)" }}
            >
              Show all {result.relatedPatents.length} patents
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: "var(--muted)", opacity: 0.7 }}>
        The marker on the map shows the estimated position of your {result.inputType === "idea" ? "idea" : "document"}.
      </p>
    </div>
  );
}
