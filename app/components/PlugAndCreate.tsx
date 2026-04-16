"use client";

import { useState, useCallback } from "react";
import { Search, X, Zap, MousePointer } from "lucide-react";
import type { Patent, PlugCreateResult } from "@/app/lib/types";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

type SelectionTab = "search" | "click";

interface Props {
  patents: Patent[];
  selectedPatents: Map<string, Patent>;
  onTogglePatent: (patent: Patent) => void;
  onGenerate: () => void;
  onCheckLandscape: (description: string) => void;
  result: PlugCreateResult | null;
  loading: boolean;
  onClose: () => void;
  onMainMenu: () => void;
  onSearch: (query: string) => Patent[];
}

export default function PlugAndCreate({
  selectedPatents,
  onTogglePatent,
  onGenerate,
  onCheckLandscape,
  result,
  loading,
  onClose,
  onMainMenu,
  onSearch,
}: Props) {
  const [tab, setTab] = useState<SelectionTab>("click");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patent[]>([]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const results = onSearch(searchQuery);
    setSearchResults(results);
  }, [searchQuery, onSearch]);

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const selected = [...selectedPatents.values()];
  const canGenerate = selected.length >= 2;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Plug &amp; Create
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Combine 2+ patents to generate a novel idea
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMainMenu}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            Main Menu
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors hover:bg-white/5"
            style={{ color: "var(--muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!result ? (
          <div className="flex flex-col gap-5">
            {/* Selection tabs */}
            <div
              className="flex gap-1 p-1 rounded-xl"
              style={{ background: "var(--surface-2)" }}
            >
              <button
                onClick={() => setTab("click")}
                className="flex items-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: tab === "click" ? "var(--surface)" : "transparent",
                  color: tab === "click" ? "var(--foreground)" : "var(--muted)",
                  border:
                    tab === "click"
                      ? "1px solid var(--border)"
                      : "1px solid transparent",
                }}
              >
                <MousePointer size={14} />
                Click on Map
              </button>
              <button
                onClick={() => setTab("search")}
                className="flex items-center gap-1.5 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: tab === "search" ? "var(--surface)" : "transparent",
                  color: tab === "search" ? "var(--foreground)" : "var(--muted)",
                  border:
                    tab === "search"
                      ? "1px solid var(--border)"
                      : "1px solid transparent",
                }}
              >
                <Search size={14} />
                Search Patents
              </button>
            </div>

            {/* Click tab */}
            {tab === "click" && (
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <MousePointer
                  size={20}
                  className="mx-auto mb-2"
                  style={{ color: "var(--muted)" }}
                />
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Click on patents in the map to select them.
                  <br />
                  Select 2 or more to generate an idea.
                </p>
              </div>
            )}

            {/* Search tab */}
            {tab === "search" && (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <Search size={14} style={{ color: "var(--muted)" }} />
                  <input
                    type="text"
                    placeholder="Search patents by keyword..."
                    className="bg-transparent text-sm outline-none flex-1"
                    style={{ color: "var(--foreground)" }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKey}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div
                    className="flex flex-col gap-0.5 overflow-y-auto"
                    style={{ maxHeight: 200 }}
                  >
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onTogglePatent(p)}
                        className="flex items-start gap-2 text-left px-2 py-2 rounded transition-colors hover:bg-white/5"
                        style={{
                          background: selectedPatents.has(p.id)
                            ? "rgba(255,255,255,0.08)"
                            : "transparent",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded flex-shrink-0 mt-1"
                          style={{
                            background:
                              CATEGORY_COLORS[p.category] ?? "#888",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-xs leading-snug truncate"
                            style={{
                              color: "var(--foreground)",
                              fontWeight: 500,
                            }}
                          >
                            {p.title}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{
                              color: "var(--muted)",
                              fontSize: 10,
                            }}
                          >
                            {p.year} &middot; {p.assignee ?? p.category}
                          </div>
                        </div>
                        {selectedPatents.has(p.id) && (
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: "var(--accent)" }}
                          >
                            &#x2713;
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected patents */}
            {selected.length > 0 && (
              <div className="flex flex-col gap-2">
                <div
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--muted)" }}
                >
                  Selected ({selected.length})
                </div>
                <div className="flex flex-col gap-1">
                  {selected.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded flex-shrink-0"
                        style={{
                          background:
                            CATEGORY_COLORS[p.category] ?? "#888",
                        }}
                      />
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: "var(--foreground)" }}
                      >
                        {p.title}
                      </span>
                      <button
                        onClick={() => onTogglePatent(p)}
                        className="p-0.5 rounded hover:bg-white/5 flex-shrink-0"
                        style={{ color: "var(--muted)" }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={onGenerate}
              disabled={!canGenerate || loading}
              className="flex items-center justify-center gap-2 text-sm font-medium py-3.5 px-8 rounded-xl transition-opacity"
              style={{
                background: canGenerate ? "var(--accent)" : "var(--surface-2)",
                color: canGenerate ? "#000000" : "var(--muted)",
                border: canGenerate ? "none" : "1px solid var(--border)",
                opacity: canGenerate && !loading ? 1 : 0.5,
                cursor: canGenerate && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating idea...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Generate New Idea
                </>
              )}
            </button>

            {!canGenerate && (
              <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
                Select at least 2 patents to generate an idea
              </p>
            )}
          </div>
        ) : (
          /* Result */
          <div className="flex flex-col gap-6 max-w-2xl">
            <div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                {result.title}
              </h3>
              <div
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--muted)" }}
              >
                {result.description}
              </div>
            </div>

            {/* Source elements */}
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--accent)" }}
              >
                Source Elements
              </div>
              <div className="flex flex-col gap-2">
                {result.sourceElements.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="text-xs font-mono mb-1"
                      style={{ color: "var(--accent-light)" }}
                    >
                      {s.patentId}
                    </div>
                    <div
                      className="text-xs font-medium mb-0.5"
                      style={{ color: "var(--foreground)" }}
                    >
                      {s.patentTitle}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {s.feature}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Novelty */}
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--accent)" }}
              >
                Novelty Assessment
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--muted)" }}
              >
                {result.noveltyAssessment}
              </p>
            </div>

            {/* Suggested claims */}
            <div>
              <div
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--accent)" }}
              >
                Suggested Claims
              </div>
              <div className="flex flex-col gap-2">
                {result.suggestedClaims.map((claim, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 text-xs leading-relaxed"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    <span
                      className="font-semibold mr-1"
                      style={{ color: "var(--foreground)" }}
                    >
                      Claim {i + 1}.
                    </span>
                    {claim}
                  </div>
                ))}
              </div>
            </div>

            {/* Check Landscape button */}
            <button
              onClick={() =>
                onCheckLandscape(
                  `${result.title}: ${result.description.slice(0, 500)}`
                )
              }
              className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-6 rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000000" }}
            >
              Check Patent Landscape &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
