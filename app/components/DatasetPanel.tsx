"use client";

import { useState, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORY_COLORS, DOMAIN_HIERARCHY, L3_TOPICS } from "@/app/lib/mock-data";

interface Props {
  yearRange: [number, number];
  onYearRange: (range: [number, number]) => void;
  activeCategories: Set<string>;
  onToggleCategories: (cats: string[], forceActive?: boolean) => void;
  onTopicSearch?: (topic: string) => void;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2024;

export default function DatasetPanel({
  yearRange, onYearRange, activeCategories, onToggleCategories, onTopicSearch,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const pct = (v: number) => ((v - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) =>
    onYearRange([Math.min(Number(e.target.value), yearRange[1] - 1), yearRange[1]]);
  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) =>
    onYearRange([yearRange[0], Math.max(Number(e.target.value), yearRange[0] + 1)]);

  const flatTopics = useMemo(
    () => Object.entries(L3_TOPICS).flatMap(([, topics]) => topics),
    []
  );

  const isDomainFullyActive = (subs: string[]) => subs.every(s => activeCategories.has(s));
  const isDomainPartiallyActive = (subs: string[]) =>
    subs.some(s => activeCategories.has(s)) && !isDomainFullyActive(subs);

  return (
    <div
      className="flex-shrink-0"
      style={{ background: "var(--surface)", borderTop: "1px dashed rgba(255,255,255,0.08)" }}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors"
        style={{ color: "var(--foreground)" }}
      >
        <span className="flex items-center gap-2">
          <span style={{ color: "var(--muted)", fontSize: 15 }}>+</span>
          Add or remove datasets
          <span
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: "var(--surface-2)", color: "var(--muted)", fontSize: 10 }}
          >
            {activeCategories.size} / {Object.keys(CATEGORY_COLORS).length} active
          </span>
        </span>
        {expanded ? <ChevronDown size={14} style={{ color: "var(--muted)" }} /> : <ChevronUp size={14} style={{ color: "var(--muted)" }} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-6 px-6 pb-6">

          {/* Year range slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: "var(--accent)" }}>
              {yearRange[0]}
            </span>
            <div className="relative flex-1 h-5 flex items-center">
              <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: "var(--border)" }} />
              <div className="absolute h-1 rounded-full" style={{ left: `${pct(yearRange[0])}%`, right: `${100 - pct(yearRange[1])}%`, background: "var(--accent)" }} />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={yearRange[0]} onChange={handleFrom}
                className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: yearRange[0] > MAX_YEAR - 4 ? 5 : 3 }} />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={yearRange[1]} onChange={handleTo}
                className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: 4 }} />
            </div>
            <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: "var(--accent)" }}>
              {yearRange[1]}
            </span>
          </div>

          {/* Level 1 — Domains */}
          <LevelRow
            label="Domains"
            sublabel="Broad technology areas"
            level={1}
          >
            {DOMAIN_HIERARCHY.map(domain => {
              const fullyActive = isDomainFullyActive(domain.subcategories);
              const partial = isDomainPartiallyActive(domain.subcategories);
              const isOn = fullyActive || partial;
              return (
                <button
                  key={domain.name}
                  onClick={() => onToggleCategories(domain.subcategories, fullyActive ? false : true)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={{
                    background: "transparent",
                    border: `1px dashed ${isOn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                    color: isOn ? "var(--foreground)" : "var(--muted)",
                    opacity: isOn ? 1 : 0.6,
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isOn ? domain.color : "rgba(255,255,255,0.12)" }} />
                  {domain.name}
                </button>
              );
            })}
          </LevelRow>

          {/* Level 2 — Technology subcategories */}
          <LevelRow
            label="Technologies"
            sublabel="Specific technology subcategories — more granular than domains"
            level={2}
          >
            {Object.keys(CATEGORY_COLORS).map(cat => {
              const active = activeCategories.has(cat);
              const color = CATEGORY_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => onToggleCategories([cat])}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: "transparent",
                    border: `1px dashed ${active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
                    color: active ? "var(--foreground)" : "var(--muted)",
                    opacity: active ? 1 : 0.5,
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? color : "rgba(255,255,255,0.1)" }} />
                  {cat}
                </button>
              );
            })}
          </LevelRow>

          {/* Level 3 — Specific topics */}
          <LevelRow
            label="Topics"
            sublabel="Specific research topics — click to search for matching patents"
            level={3}
          >
            {flatTopics.map(topic => (
                <button
                  key={topic}
                  onClick={() => onTopicSearch?.(topic)}
                  className="flex-shrink-0 text-xs px-2 py-0.5 rounded-md transition-all"
                  style={{
                    background: "transparent",
                    border: "1px dashed rgba(255,255,255,0.06)",
                    color: "var(--muted)",
                    fontSize: 11,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }}
                >
                  {topic}
                </button>
            ))}
          </LevelRow>
        </div>
      )}
    </div>
  );
}

// ─── Scrollable row wrapper ───────────────────────────────────────────────────
function LevelRow({ label, sublabel, level, children }: {
  label: string;
  sublabel: string;
  level: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const labelColor = level === 1 ? "var(--foreground)" : level === 2 ? "#475569" : "var(--muted)";
  const badgeColors: Record<number, string> = { 1: "var(--accent)", 2: "#818cf8", 3: "#94a3b8" };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${badgeColors[level]}18`, color: badgeColors[level], fontSize: 10 }}
        >
          L{level}
        </span>
        <span className="text-xs font-semibold" style={{ color: labelColor }}>{label}</span>
        <span className="text-xs" style={{ color: "var(--muted)", fontSize: 10 }}>{sublabel}</span>
      </div>
      <div
        ref={ref}
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {children}
      </div>
    </div>
  );
}
