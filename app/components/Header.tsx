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
      className="flex items-center gap-6 px-5 h-10 flex-shrink-0"
      style={{ background: "transparent" }}
    >
      <span className="text-sm font-bold tracking-tight flex-shrink-0" style={{ color: "var(--foreground)" }}>
        tIPe
      </span>

      <div
        className="flex items-center gap-2 flex-1"
        style={{ maxWidth: 320, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        {searching ? (
          <svg className="animate-spin flex-shrink-0" width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2.5}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <Search size={11} style={{ color: "var(--muted)", flexShrink: 0 }} />
        )}
        <input
          type="text"
          placeholder="Search patents…"
          className="bg-transparent text-xs outline-none w-full py-1.5"
          style={{ color: "var(--foreground)" }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>
    </header>
  );
}
