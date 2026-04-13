"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  onSearch: (query: string) => void;
  searching: boolean;
  resultCount: number;
  mock: boolean;
}

export default function Header({ onSearch, searching, resultCount, mock }: Props) {
  const [value, setValue] = useState("");

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch(value);
  };

  return (
    <header
      className="flex items-center justify-between px-5 h-14 flex-shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
          t<span style={{ color: "var(--accent)" }}>IP</span>e
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}
        >
          Patent Explorer
        </span>
      </div>

      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", width: 300 }}
      >
        {searching ? (
          <svg className="animate-spin" width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2.5}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <Search size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
        )}
        <input
          type="text"
          placeholder="Search patents, keywords, inventors…"
          className="bg-transparent text-xs outline-none w-full"
          style={{ color: "#94a3b8" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <span>{resultCount} patents</span>
        {mock && (
          <>
            <span style={{ color: "var(--border)" }}>·</span>
            <span style={{ color: "var(--accent-light)" }}>demo</span>
          </>
        )}
        <span style={{ color: "var(--border)" }}>·</span>
        <span>2000–2024</span>
        <span style={{ color: "var(--border)" }}>·</span>
        <span style={{ color: "var(--accent-light)" }}>Google Patents</span>
      </div>
    </header>
  );
}
