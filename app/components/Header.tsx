"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  onSearch: (query: string) => void;
  searching: boolean;
  resultCount: number;
  mock: boolean;
  dataSource?: "loading" | "bigquery" | "error";
}

export default function Header({ onSearch, searching, resultCount, mock, dataSource }: Props) {
  const [value, setValue] = useState("");

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch(value);
  };

  return (
    <header
      className="flex items-center justify-between px-6 h-11 flex-shrink-0"
      style={{ background: "rgba(10,10,15,0.75)", borderBottom: "1px dashed rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          t<span style={{ color: "var(--foreground)" }}>IP</span>e
        </span>
        <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--muted)" }}>
          Patent Explorer
        </span>
      </div>

      <div
        className="flex items-center gap-2 px-1 py-1"
        style={{ borderBottom: "1px dashed rgba(255,255,255,0.1)", width: 280 }}
      >
        {searching ? (
          <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2.5}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <Search size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
        )}
        <input
          type="text"
          placeholder="Search patents, keywords, inventors…"
          className="bg-transparent text-xs outline-none w-full"
          style={{ color: "var(--foreground)" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>

      <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--muted)" }}>
        <span>{resultCount} patents</span>
        <span>2000–2024</span>
        <span>Google Patents</span>
      </div>
    </header>
  );
}
