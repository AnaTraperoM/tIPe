"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, X, ChevronRight, Layers, Building2, ScrollText, Sparkles, Zap, MousePointer } from "lucide-react";
import type { Patent, TranslationResult, GroupSummaryResult, QueryInterpretation, PlugCreateResult } from "@/app/lib/types";
import { findSimilarPatents } from "@/app/lib/patent-enrich";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

type Tab = "patent" | "compare" | "plug-create";

interface Props {
  selected: Patent | null;
  onClear: () => void;
  translation: TranslationResult | null;
  translationLoading: boolean;
  onTranslate: () => void;
  compareCount: number;
  onOpenCompare: () => void;
  onSelectPatent: (patent: Patent | null) => void;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  groupSelection: Patent[];
  groupSummary: GroupSummaryResult | null;
  groupSummaryLoading: boolean;
  onGroupSummarize: () => void;
  onGroupClose: () => void;
  open: boolean;
  onClose: () => void;
  queryInterpretation?: QueryInterpretation | null;
  onMainMenu?: () => void;
  allPatents?: Patent[];
  // Plug & Create props
  plugCreatePatents: Map<string, Patent>;
  onTogglePlugPatent: (patent: Patent) => void;
  onPlugGenerate: () => void;
  onPlugCheckLandscape: (description: string) => void;
  plugCreateResult: PlugCreateResult | null;
  plugCreateLoading: boolean;
  onPlugSearch: (query: string) => Patent[];
}

export default function Sidebar({
  selected,
  onClear,
  translation,
  translationLoading,
  onTranslate,
  compareCount,
  onOpenCompare,
  onSelectPatent,
  tab,
  onTabChange,
  groupSelection,
  groupSummary,
  groupSummaryLoading,
  onGroupSummarize,
  onGroupClose,
  open,
  onClose,
  queryInterpretation,
  onMainMenu,
  allPatents = [],
  plugCreatePatents,
  onTogglePlugPatent,
  onPlugGenerate,
  onPlugCheckLandscape,
  plugCreateResult,
  plugCreateLoading,
  onPlugSearch,
}: Props) {
  const uniqueCategories = useMemo(
    () => [...new Set(groupSelection.map(p => p.category))],
    [groupSelection]
  );

  const groupYearRange = useMemo(() => {
    if (!groupSelection.length) return '';
    const years = groupSelection.map(p => p.year);
    const mn = Math.min(...years), mx = Math.max(...years);
    return mn === mx ? String(mn) : `${mn}–${mx}`;
  }, [groupSelection]);

  const similarPatents = useMemo(() => {
    if (!selected || allPatents.length === 0) return [];
    return findSimilarPatents(selected, allPatents, 6);
  }, [selected, allPatents]);

  const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    active:  { bg: "rgba(52,211,153,0.15)", color: "#34d399", label: "Active" },
    pending: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", label: "Pending" },
    expired: { bg: "rgba(156,163,175,0.15)", color: "#9ca3af", label: "Expired" },
  };

  // Plug & Create state
  const [plugSearchQuery, setPlugSearchQuery] = useState("");
  const [plugSearchResults, setPlugSearchResults] = useState<Patent[]>([]);
  const [plugTab, setPlugTab] = useState<"click" | "search">("click");

  const handlePlugSearch = useCallback(() => {
    if (!plugSearchQuery.trim()) return;
    const results = onPlugSearch(plugSearchQuery);
    setPlugSearchResults(results);
  }, [plugSearchQuery, onPlugSearch]);

  const handlePlugSearchKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handlePlugSearch();
    },
    [handlePlugSearch]
  );

  const plugSelected = useMemo(() => [...plugCreatePatents.values()], [plugCreatePatents]);
  const canPlugGenerate = plugSelected.length >= 2;

  const tabs: { key: Tab; label: string }[] = [
    { key: "patent", label: "Detail" },
    { key: "compare", label: `Compare${compareCount > 0 ? ` (${compareCount})` : ""}` },
    { key: "plug-create", label: "Plug & Create" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 transition-opacity"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed top-16 left-0 flex flex-col z-40"
        style={{
          width: 380,
          height: "calc(100vh - 64px)",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "4px 0 40px rgba(0,0,0,0.5)" : "none",
        }}
      >
      {/* Tab bar + close */}
      <div className="flex items-center border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{
              color: tab === key ? "var(--accent)" : "var(--muted)",
              borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
              background: "none",
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-2.5 mr-1 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--muted)" }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* ── Patent Detail Tab ── */}
        {tab === "patent" && groupSelection.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Query interpretation banner */}
            {queryInterpretation && (
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {queryInterpretation.correctedQuery !== queryInterpretation.keywords.join(" ") && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Searching for:</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{queryInterpretation.correctedQuery}</span>
                  </div>
                )}
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{queryInterpretation.explanation}</p>
                {queryInterpretation.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {queryInterpretation.keywords.slice(0, 8).map(kw => (
                      <span key={kw} className="text-xs px-1.5 py-0.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.08)", color: "var(--accent)", fontSize: 10 }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Group header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                  {groupSelection.length} patents {queryInterpretation ? "found" : "selected"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {groupYearRange}
                </div>
              </div>
              <button onClick={onGroupClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--muted)" }}>
                <X size={14} />
              </button>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5">
              {uniqueCategories.map(cat => (
                <span key={cat} className="text-xs px-2 py-0.5 rounded-lg"
                  style={{ background: `${CATEGORY_COLORS[cat] ?? "#888"}22`, color: CATEGORY_COLORS[cat] ?? "#888", border: `1px solid ${CATEGORY_COLORS[cat] ?? "#888"}44` }}>
                  {cat}
                </span>
              ))}
            </div>

            {/* Loading state */}
            {groupSummaryLoading && (
              <div className="flex items-center gap-2 text-xs rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                <svg className="animate-spin flex-shrink-0" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Analyzing cluster with Claude…
              </div>
            )}

            {/* Summary result */}
            {!groupSummaryLoading && groupSummary && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Cluster Summary</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.summary}</p>
                </div>

                {groupSummary.themes.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Key Themes</div>
                    <div className="flex flex-wrap gap-1.5">
                      {groupSummary.themes.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-lg"
                          style={{ background: "var(--surface-2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {groupSummary.technologicalTrends?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Technological Trends</div>
                    <ul className="flex flex-col gap-1.5">
                      {groupSummary.technologicalTrends.map((t, i) => (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          <span style={{ color: "var(--accent-light)", flexShrink: 0 }}>→</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {groupSummary.innovationInsights && (
                  <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Innovation Insights</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.innovationInsights}</p>
                  </div>
                )}

                {groupSummary.temporalAnalysis && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Temporal Analysis</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.temporalAnalysis}</p>
                  </div>
                )}

                {groupSummary.keyPlayers?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Key Players</div>
                    <div className="flex flex-wrap gap-1.5">
                      {groupSummary.keyPlayers.map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 rounded-lg"
                          style={{ background: "var(--surface-2)", color: "#94a3b8", border: "1px solid var(--border)" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={onGroupSummarize}
                  className="text-xs py-1.5 px-3 rounded-lg transition-opacity hover:opacity-70 self-start"
                  style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                  Re-analyze
                </button>
              </div>
            )}

            {!groupSummaryLoading && !groupSummary && (
              <button onClick={onGroupSummarize}
                className="text-xs py-2 px-3 rounded-lg font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "#000" }}>
                Summarize with AI
              </button>
            )}

            {/* Patent list */}
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Patents ({groupSelection.length})
              </div>
              <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: 280 }}>
                {groupSelection.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onSelectPatent(p); }}
                    className="flex items-start gap-2 text-left px-2 py-2 rounded-lg transition-colors hover:bg-white/5 group"
                  >
                    <span className="w-2 h-2 rounded flex-shrink-0 mt-1" style={{ background: CATEGORY_COLORS[p.category] ?? "#888" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs leading-snug truncate group-hover:text-clip" style={{ color: "var(--foreground)", fontWeight: 500 }}>
                        {p.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)", fontSize: 10 }}>
                        {p.year} · {p.assignee ?? p.category}
                      </div>
                    </div>
                    <ChevronRight size={11} className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-50" style={{ color: "var(--muted)" }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "patent" && groupSelection.length === 0 && !selected && (
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Explore Patents</div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Click a patent on the map to view details, or try one of these workflows.</p>
            </div>
            {([
              { icon: "⬡", title: "Filter & Summarize", desc: "Filter by category or year, draw a circle to summarize a cluster", action: "filter" as const },
              { icon: "⊞", title: "Compare", desc: "Shift+click patents on the map for a side-by-side comparison", action: "compare" as const },
              { icon: "⚡", title: "Plug & Create", desc: "Select 2+ patents and generate a novel idea combining their technologies", action: "plug-create" as const },
              { icon: "🏠", title: "Main Menu", desc: "Go back to the start screen", action: "main-menu" as const },
            ] as const).map(wf => (
              <button
                key={wf.action}
                onClick={() => {
                  if (wf.action === "compare") { onTabChange("compare"); }
                  else if (wf.action === "plug-create") { onTabChange("plug-create"); }
                  else if (wf.action === "main-menu") { onMainMenu?.(); }
                  else { onClose(); }
                }}
                className="flex gap-3 items-start text-left p-4 rounded-xl transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent-light)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <span className="text-xl leading-none mt-0.5">{wf.icon}</span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>{wf.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{wf.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "patent" && groupSelection.length === 0 && selected && (
            <div className="flex flex-col gap-5">
              {/* ── Header: ID + Status + Close ── */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--accent-light)" }}>
                    {selected.id}
                  </span>
                  {selected.status && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: STATUS_STYLES[selected.status]?.bg,
                        color: STATUS_STYLES[selected.status]?.color,
                      }}>
                      {STATUS_STYLES[selected.status]?.label}
                    </span>
                  )}
                </div>
                <button onClick={onClear} className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0" style={{ color: "var(--muted)" }}>
                  <X size={14} />
                </button>
              </div>

              {/* ── Title ── */}
              <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--foreground)" }}>{selected.title}</h2>

              {/* ── Tags: Category + Year ── */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-lg"
                  style={{ background: `${CATEGORY_COLORS[selected.category] ?? "#888"}22`, color: CATEGORY_COLORS[selected.category] ?? "#888" }}>
                  {selected.category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                  {selected.year}
                </span>
              </div>

              {/* ── Owner ── */}
              {selected.assignee && (
                <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={13} style={{ color: "var(--muted)" }} />
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Owner</div>
                  </div>
                  <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{selected.assignee}</div>
                </div>
              )}

              {/* ── Patent Info Grid ── */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--muted)", fontSize: 10 }}>Citations</div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                    {selected.citationCount ?? 0}
                  </div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--muted)", fontSize: 10 }}>Grant Year</div>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                    {selected.year}
                  </div>
                </div>
              </div>

              {/* ── IPC Classification ── */}
              {selected.ipcCodes && selected.ipcCodes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ScrollText size={13} style={{ color: "var(--muted)" }} />
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>IPC Classification</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.ipcCodes.map(code => (
                      <span key={code} className="text-xs font-mono px-2 py-1 rounded-lg"
                        style={{ background: "var(--surface-2)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Abstract ── */}
              {selected.abstract && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Abstract</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{selected.abstract}</p>
                </div>
              )}

              {/* ── AI Translation ── */}
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={13} style={{ color: "var(--muted)" }} />
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>AI Plain Language</div>
                </div>

                {!translation && !translationLoading && (
                  <>
                    <p className="text-xs leading-relaxed italic" style={{ color: "#7c8fa8" }}>
                      Get a plain-language explanation of this patent from Claude AI.
                    </p>
                    <button
                      onClick={onTranslate}
                      className="mt-1 text-xs py-1.5 px-3 rounded-xl font-medium transition-colors hover:opacity-90"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      Translate with AI
                    </button>
                  </>
                )}

                {translationLoading && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Translating with Claude…
                  </div>
                )}

                {translation && !translationLoading && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{translation.summary}</p>
                    <div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--muted)" }}>Key Innovation</div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{translation.keyInnovation}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--muted)" }}>Practical Use</div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{translation.practicalUse}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {translation.technicalFields.map((f) => (
                        <span key={f} className="text-xs px-1.5 py-0.5 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.15)", color: "var(--accent-light)" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={onTranslate}
                      className="text-xs py-1 px-2 rounded-lg font-medium self-start hover:opacity-80"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
                    >
                      Re-translate
                    </button>
                  </div>
                )}
              </div>

              {/* ── Compare shortcut ── */}
              <button
                onClick={() => onTabChange("compare")}
                className="flex items-center gap-2 text-xs py-2 px-3 rounded-xl transition-colors w-full"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}
              >
                <Layers size={12} />
                Add to comparison (Shift+click on map)
                <ChevronRight size={12} style={{ marginLeft: "auto" }} />
              </button>

              {/* ── Similar Patents ── */}
              {similarPatents.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                    Similar Patents
                  </div>
                  <div className="flex flex-col gap-1">
                    {similarPatents.map(p => (
                      <button
                        key={p.id}
                        onClick={() => onSelectPatent(p)}
                        className="flex items-start gap-2 text-left px-3 py-2.5 rounded-xl transition-colors hover:bg-white/5 group"
                        style={{ border: "1px solid transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                      >
                        <span className="w-2 h-2 rounded flex-shrink-0 mt-1.5" style={{ background: CATEGORY_COLORS[p.category] ?? "#888" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs leading-snug font-medium truncate group-hover:text-clip" style={{ color: "var(--foreground)" }}>
                            {p.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs" style={{ color: "var(--muted)", fontSize: 10 }}>
                              {p.year} · {p.assignee ?? p.category}
                            </span>
                            {p.status && (
                              <span className="text-xs px-1.5 py-px rounded-full" style={{
                                background: STATUS_STYLES[p.status]?.bg,
                                color: STATUS_STYLES[p.status]?.color,
                                fontSize: 9,
                              }}>
                                {STATUS_STYLES[p.status]?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={11} className="flex-shrink-0 mt-1.5 opacity-0 group-hover:opacity-50" style={{ color: "var(--muted)" }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
        )}

        {/* ── Compare Tab ── */}
        {tab === "compare" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              Shift+click patents on the map to add them to your comparison set, then open the Compare Panel for a full AI analysis.
            </p>
            {compareCount > 0 ? (
              <button
                onClick={onOpenCompare}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                <Layers size={14} />
                Open Compare Panel ({compareCount} patents)
              </button>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  {["Shift+click a patent", "Add 1–2 more", "Run AI comparison"].map((step, i, arr) => (
                    <span key={step} className="flex items-center gap-1">
                      <span className="font-semibold" style={{ color: "var(--accent)" }}>{i + 1}</span>
                      <span>{step}</span>
                      {i < arr.length - 1 && <span style={{ color: "var(--border)" }}>→</span>}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center h-24 gap-2 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <Layers size={20} style={{ color: "var(--muted)", opacity: 0.4 }} />
                  <p className="text-xs text-center" style={{ color: "var(--muted)" }}>No patents selected yet</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Plug & Create Tab ── */}
        {tab === "plug-create" && !plugCreateResult && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>Plug &amp; Create</div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Combine 2+ patents to generate a novel invention idea.</p>
            </div>

            {/* Selection tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
              <button
                onClick={() => setPlugTab("click")}
                className="flex items-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: plugTab === "click" ? "var(--surface)" : "transparent",
                  color: plugTab === "click" ? "var(--foreground)" : "var(--muted)",
                  border: plugTab === "click" ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <MousePointer size={12} />
                Click on Map
              </button>
              <button
                onClick={() => setPlugTab("search")}
                className="flex items-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: plugTab === "search" ? "var(--surface)" : "transparent",
                  color: plugTab === "search" ? "var(--foreground)" : "var(--muted)",
                  border: plugTab === "search" ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <Search size={12} />
                Search
              </button>
            </div>

            {/* Click tab instruction */}
            {plugTab === "click" && (
              <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <MousePointer size={18} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Click on patents in the map to select them.<br />Select 2 or more to generate an idea.
                </p>
              </div>
            )}

            {/* Search tab */}
            {plugTab === "search" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <Search size={12} style={{ color: "var(--muted)" }} />
                  <input
                    type="text"
                    placeholder="Search patents by keyword..."
                    className="bg-transparent text-xs outline-none flex-1"
                    style={{ color: "var(--foreground)" }}
                    value={plugSearchQuery}
                    onChange={(e) => setPlugSearchQuery(e.target.value)}
                    onKeyDown={handlePlugSearchKey}
                  />
                </div>
                {plugSearchResults.length > 0 && (
                  <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: 180 }}>
                    {plugSearchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onTogglePlugPatent(p)}
                        className="flex items-start gap-2 text-left px-2 py-2 rounded transition-colors hover:bg-white/5"
                        style={{ background: plugCreatePatents.has(p.id) ? "rgba(255,255,255,0.08)" : "transparent" }}
                      >
                        <span className="w-2 h-2 rounded flex-shrink-0 mt-1" style={{ background: CATEGORY_COLORS[p.category] ?? "#888" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs leading-snug truncate" style={{ color: "var(--foreground)", fontWeight: 500 }}>{p.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--muted)", fontSize: 10 }}>
                            {p.year} &middot; {p.assignee ?? p.category}
                          </div>
                        </div>
                        {plugCreatePatents.has(p.id) && (
                          <span className="text-xs flex-shrink-0" style={{ color: "var(--accent)" }}>&#x2713;</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected patents */}
            {plugSelected.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  Selected ({plugSelected.length})
                </div>
                <div className="flex flex-col gap-1">
                  {plugSelected.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <span className="w-2 h-2 rounded flex-shrink-0" style={{ background: CATEGORY_COLORS[p.category] ?? "#888" }} />
                      <span className="text-xs truncate flex-1" style={{ color: "var(--foreground)" }}>{p.title}</span>
                      <button onClick={() => onTogglePlugPatent(p)} className="p-0.5 rounded hover:bg-white/5 flex-shrink-0" style={{ color: "var(--muted)" }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={onPlugGenerate}
              disabled={!canPlugGenerate || plugCreateLoading}
              className="flex items-center justify-center gap-2 text-xs font-medium py-3 px-6 rounded-xl transition-opacity"
              style={{
                background: canPlugGenerate ? "var(--accent)" : "var(--surface-2)",
                color: canPlugGenerate ? "#000000" : "var(--muted)",
                border: canPlugGenerate ? "none" : "1px solid var(--border)",
                opacity: canPlugGenerate && !plugCreateLoading ? 1 : 0.5,
                cursor: canPlugGenerate && !plugCreateLoading ? "pointer" : "not-allowed",
              }}
            >
              {plugCreateLoading ? (
                <>
                  <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating idea…
                </>
              ) : (
                <>
                  <Zap size={12} />
                  Generate New Idea
                </>
              )}
            </button>

            {!canPlugGenerate && (
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                Select at least 2 patents to generate an idea
              </p>
            )}
          </div>
        )}

        {/* ── Plug & Create Result ── */}
        {tab === "plug-create" && plugCreateResult && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>{plugCreateResult.title}</h3>
              <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--muted)" }}>{plugCreateResult.description}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Source Elements</div>
              <div className="flex flex-col gap-2">
                {plugCreateResult.sourceElements.map((s, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="text-xs font-mono mb-1" style={{ color: "var(--accent-light)" }}>{s.patentId}</div>
                    <div className="text-xs font-medium mb-0.5" style={{ color: "var(--foreground)" }}>{s.patentTitle}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{s.feature}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Novelty Assessment</div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{plugCreateResult.noveltyAssessment}</p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>Suggested Claims</div>
              <div className="flex flex-col gap-2">
                {plugCreateResult.suggestedClaims.map((claim, i) => (
                  <div key={i} className="rounded-xl p-3 text-xs leading-relaxed"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
                    <span className="font-semibold mr-1" style={{ color: "var(--foreground)" }}>Claim {i + 1}.</span>
                    {claim}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onPlugCheckLandscape(`${plugCreateResult.title}: ${plugCreateResult.description.slice(0, 500)}`)}
              className="flex items-center justify-center gap-2 text-xs font-medium py-3 px-6 rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000000" }}
            >
              Check Patent Landscape &rarr;
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
