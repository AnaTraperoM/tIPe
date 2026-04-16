"use client";

import { useState, useMemo } from "react";
import { Upload, FileText, Search, X, ChevronRight, Layers, Clock, Building2, ScrollText, Sparkles } from "lucide-react";
import type { Patent, TranslationResult, UploadAnalysisResult, HistoryEntry, GroupSummaryResult, QueryInterpretation } from "@/app/lib/types";
import { findSimilarPatents } from "@/app/lib/patent-enrich";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";
import UploadAnalysis from "./UploadAnalysis";

interface Props {
  selected: Patent | null;
  onClear: () => void;
  onUpload: (file: File) => void;
  onAnalyzeIdea: (text: string) => void;
  uploadRadius: number;
  onUploadRadiusChange: (radius: number) => void;
  translation: TranslationResult | null;
  translationLoading: boolean;
  onTranslate: () => void;
  uploadResult: UploadAnalysisResult | null;
  uploadLoading: boolean;
  compareCount: number;
  onOpenCompare: () => void;
  onSelectPatent: (patent: Patent | null) => void;
  sessionHistory: HistoryEntry[];
  onClearHistory: () => void;
  onResetSelection: () => void;
  onResetCompare: () => void;
  onResetFilters: () => void;
  onResetUpload: () => void;
  onResetAll: () => void;
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
  onCompareMode?: () => void;
  onPlugCreate?: () => void;
  onMainMenu?: () => void;
  allPatents?: Patent[];
}

type Tab = "patent" | "upload" | "compare" | "history";

export default function Sidebar({
  selected,
  onClear,
  onUpload,
  onAnalyzeIdea,
  uploadRadius,
  onUploadRadiusChange,
  translation,
  translationLoading,
  onTranslate,
  uploadResult,
  uploadLoading,
  compareCount,
  onOpenCompare,
  onSelectPatent,
  sessionHistory,
  onResetSelection,
  onResetCompare,
  onResetFilters,
  onResetUpload,
  onResetAll,
  tab,
  onTabChange,
  groupSelection,
  groupSummary,
  groupSummaryLoading,
  onGroupSummarize,
  onGroupClose,
  open,
  onClose,
  onClearHistory,
  queryInterpretation,
  onCompareMode,
  onPlugCreate,
  onMainMenu,
  allPatents = [],
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [ideaText, setIdeaText] = useState("");

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

  function relativeTime(date: Date): string {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  const HISTORY_ICONS: Record<HistoryEntry["type"], string> = {
    search: "⌕",
    view: "◉",
    compare: "⊞",
    upload: "↑",
    group_select: "◎",
  };

  const HISTORY_COLORS: Record<HistoryEntry["type"], string> = {
    search: "#5aaad4",
    view: "#9d8ff0",
    compare: "#d4a043",
    upload: "#52c98b",
    group_select: "#d97060",
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setUploadedFile(file.name); onUpload(file); }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedFile(file.name); onUpload(file); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "patent", label: "Detail" },
    { key: "upload", label: "Idea" },
    { key: "compare", label: `Compare${compareCount > 0 ? ` (${compareCount})` : ""}` },
    { key: "history", label: `History${sessionHistory.length > 0 ? ` (${sessionHistory.length})` : ""}` },
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
                {/* Executive summary */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Cluster Summary</div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.summary}</p>
                </div>

                {/* Themes */}
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

                {/* Technological trends */}
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

                {/* Innovation insights */}
                {groupSummary.innovationInsights && (
                  <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Innovation Insights</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.innovationInsights}</p>
                  </div>
                )}

                {/* Temporal analysis */}
                {groupSummary.temporalAnalysis && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Temporal Analysis</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{groupSummary.temporalAnalysis}</p>
                  </div>
                )}

                {/* Key players */}
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

            {/* No summary yet (shouldn't normally show since we auto-trigger) */}
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
              <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--foreground)" }}>What would you like to do?</div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Pick a workflow to get started.</p>
            </div>
            {([
              { icon: "🔍", title: "Search & Explore", desc: "Search for patents, click to view details and translate with AI", action: "search" as const },
              { icon: "↑", title: "Upload & Classify", desc: "Drop a patent document to find where it lands and discover related patents", action: "upload" as const },
              { icon: "⬡", title: "Filter & Summarize", desc: "Filter by category or year, draw a circle to summarize a cluster", action: "filter" as const },
              { icon: "⊞", title: "Compare", desc: "Click patents on the map to add them to a side-by-side comparison", action: "compare" as const },
              { icon: "⚡", title: "Plug & Create", desc: "Select 2+ patents and generate a novel idea combining their technologies", action: "plug-create" as const },
              { icon: "🏠", title: "Main Menu", desc: "Go back to the start screen", action: "main-menu" as const },
            ] as const).map(wf => (
              <button
                key={wf.action}
                onClick={() => {
                  if (wf.action === "upload") { onTabChange("upload"); }
                  else if (wf.action === "compare") { onCompareMode?.(); }
                  else if (wf.action === "plug-create") { onPlugCreate?.(); }
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

            {sessionHistory.length > 0 && (
              <div className="mt-2">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Recent Activity</div>
                <div className="flex flex-col gap-1">
                  {sessionHistory.slice(0, 4).map(entry => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                      <span style={{ color: HISTORY_COLORS[entry.type], fontSize: 13 }}>{HISTORY_ICONS[entry.type]}</span>
                      <span className="truncate flex-1" style={{ color: "var(--foreground)" }}>{entry.label}</span>
                      <span style={{ color: "var(--muted)", flexShrink: 0 }}>{relativeTime(entry.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

              {/* ── Patent Timeline ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={13} style={{ color: "var(--muted)" }} />
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>History</div>
                </div>
                <div className="flex flex-col gap-0 relative ml-2">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px" style={{ background: "var(--border)" }} />
                  {[
                    { label: "Filed", value: `~${selected.year - 2}`, icon: "○", dim: true },
                    { label: "Granted", value: String(selected.year), icon: "●", dim: false },
                    { label: "Expires", value: `~${selected.year - 2 + 20}`, icon: selected.status === "expired" ? "✕" : "◇", dim: selected.status === "expired" },
                  ].map((event) => (
                    <div key={event.label} className="flex items-center gap-3 py-1.5 relative">
                      <span className="text-xs flex-shrink-0 relative z-10" style={{
                        color: event.dim ? "var(--muted)" : "var(--foreground)",
                        width: 12,
                        textAlign: "center",
                        background: "var(--surface)",
                      }}>
                        {event.icon}
                      </span>
                      <div className="flex items-center justify-between flex-1 gap-2">
                        <span className="text-xs font-medium" style={{ color: event.dim ? "var(--muted)" : "var(--foreground)" }}>{event.label}</span>
                        <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>{event.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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

        {/* ── Upload / Idea Tab ── */}
        {tab === "upload" && (
          <div className="flex flex-col gap-4">
            {/* Step guide */}
            {!uploadResult && !uploadLoading && (
              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
                {["Describe idea or drop file", "Set radius", "Get report"].map((step, i, arr) => (
                  <span key={step} className="flex items-center gap-1">
                    <span className="font-semibold" style={{ color: "var(--accent)" }}>{i + 1}</span>
                    <span>{step}</span>
                    {i < arr.length - 1 && <span style={{ color: "var(--border)" }}>→</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Idea textarea */}
            {!uploadResult && !uploadLoading && (
              <>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--muted)" }}>
                    Describe your idea
                  </label>
                  <textarea
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="e.g. A wearable device that monitors blood glucose levels using non-invasive optical sensors and provides real-time alerts via a mobile app…"
                    className="w-full rounded-lg text-xs p-3 outline-none resize-none"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                      minHeight: 90,
                      lineHeight: 1.6,
                    }}
                    rows={4}
                  />
                </div>

                {/* Radius slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Related patents</label>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                      {uploadRadius}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={uploadRadius}
                    onChange={(e) => onUploadRadiusChange(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                    style={{ height: 4 }}
                  />
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: "var(--muted)", opacity: 0.6 }}>
                    <span>1 — narrow</span>
                    <span>50 — broad</span>
                  </div>
                </div>

                {/* Analyze idea button */}
                {ideaText.trim() && (
                  <button
                    onClick={() => onAnalyzeIdea(ideaText)}
                    className="text-xs font-medium py-2 px-4 rounded-lg transition-opacity hover:opacity-90 w-full"
                    style={{ background: "var(--accent)", color: "#000000" }}
                  >
                    Analyze idea
                  </button>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>or drop a file</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>
              </>
            )}

            {/* File drop zone */}
            {!uploadResult && !uploadLoading && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="relative flex flex-col items-center justify-center gap-2 rounded-xl p-4 cursor-pointer transition-colors"
                style={{
                  border: `2px solid ${dragOver ? "var(--accent)" : "var(--border)"}`,
                  background: dragOver ? "rgba(255,255,255,0.06)" : "var(--surface-2)",
                  minHeight: 80,
                }}
              >
                <Upload size={18} style={{ color: dragOver ? "var(--accent-light)" : "var(--muted)" }} />
                <div className="text-center">
                  <p className="text-xs" style={{ color: "var(--muted)" }}>PDF, PNG, JPG, TXT, DOC</p>
                </div>
                <label className="text-xs py-1 px-3 rounded-md cursor-pointer font-medium transition-opacity hover:opacity-80"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "#94a3b8" }}>
                  Browse
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx" className="hidden" onChange={handleFileInput} />
                </label>
              </div>
            )}

            {uploadedFile && !uploadResult && !uploadLoading && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.3)" }}>
                <FileText size={14} style={{ color: "var(--accent-light)" }} />
                <span className="text-xs truncate flex-1" style={{ color: "var(--accent-light)" }}>{uploadedFile}</span>
                <button onClick={() => setUploadedFile(null)} style={{ color: "var(--muted)" }}>
                  <X size={12} />
                </button>
              </div>
            )}

            {uploadLoading && (
              <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Analyzing {uploadResult?.inputType === "idea" ? "idea" : "document"} and finding related patents…
                </div>
              </div>
            )}

            {uploadResult && !uploadLoading && (
              <UploadAnalysis result={uploadResult} onSelectPatent={onSelectPatent} />
            )}
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <div className="flex flex-col gap-4">
            {/* Reset controls */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Reset</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Deselect", action: onResetSelection },
                  { label: "Compare", action: onResetCompare },
                  { label: "Filters", action: onResetFilters },
                  { label: "Upload", action: onResetUpload },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors hover:text-white"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={onResetAll}
                className="text-xs py-1.5 px-3 rounded-md font-medium transition-colors hover:opacity-90 w-full"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--accent-light)" }}
              >
                Reset All
              </button>
            </div>

            <div className="border-t" style={{ borderColor: "var(--border)" }} />

            {/* Activity log */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Activity
              </div>
              {sessionHistory.length > 0 && (
                <button onClick={onClearHistory} className="text-xs transition-colors hover:opacity-70" style={{ color: "var(--muted)" }}>
                  Clear
                </button>
              )}
            </div>
            {sessionHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: "var(--muted)" }}>
                <span style={{ fontSize: 22, opacity: 0.25 }}>◷</span>
                <p className="text-xs text-center" style={{ opacity: 0.6 }}>Your workflow sessions will appear here.<br />History is saved across refreshes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {sessionHistory.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="flex-shrink-0 mt-px text-sm w-4 text-center" style={{ color: HISTORY_COLORS[entry.type] }}>
                      {HISTORY_ICONS[entry.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug truncate" style={{ color: "var(--foreground)" }}>{entry.label}</p>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--muted)", fontSize: 10 }}>
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
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
      </div>
    </aside>
    </>
  );
}
