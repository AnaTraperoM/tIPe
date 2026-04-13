"use client";

import { CATEGORY_COLORS } from "@/app/lib/mock-data";

interface Props {
  yearRange: [number, number];
  onYearRange: (range: [number, number]) => void;
  activeCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2024;

export default function MapControls({ yearRange, onYearRange, activeCategories, onToggleCategory }: Props) {
  const pct = (v: number) => ((v - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.min(Number(e.target.value), yearRange[1] - 1);
    onYearRange([v, yearRange[1]]);
  };

  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(Number(e.target.value), yearRange[0] + 1);
    onYearRange([yearRange[0], v]);
  };

  return (
    <div
      className="flex flex-col gap-3 px-4 py-3 flex-shrink-0"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
    >
      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all"
              style={{
                background: active ? `${color}22` : "var(--surface-2)",
                border: `1px solid ${active ? color + "66" : "var(--border)"}`,
                color: active ? color : "var(--muted)",
                opacity: active ? 1 : 0.6,
              }}
            >
              <span
                className="inline-block rounded-full w-2 h-2 flex-shrink-0"
                style={{ background: active ? color : "var(--muted)" }}
              />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Year range slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: "var(--accent-light)" }}>
          {yearRange[0]}
        </span>

        <div className="relative flex-1 h-5 flex items-center">
          {/* Track background */}
          <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: "var(--border)" }} />
          {/* Active range highlight */}
          <div
            className="absolute h-1 rounded-full"
            style={{
              left: `${pct(yearRange[0])}%`,
              right: `${100 - pct(yearRange[1])}%`,
              background: "var(--accent)",
            }}
          />
          {/* From thumb */}
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRange[0]}
            onChange={handleFrom}
            className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: yearRange[0] > MAX_YEAR - 4 ? 5 : 3 }}
          />
          {/* To thumb */}
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={yearRange[1]}
            onChange={handleTo}
            className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
            style={{ zIndex: 4 }}
          />
        </div>

        <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: "var(--accent-light)" }}>
          {yearRange[1]}
        </span>
      </div>
    </div>
  );
}
