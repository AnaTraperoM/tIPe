"use client";

import { Lightbulb, Radar } from "lucide-react";
import Logo from "./Logo";

interface Props {
  workflow: "landing" | "idea" | "explore" | "plug-create";
  onIdeaClick: () => void;
  onExploreClick: () => void;
}

export default function Header({ workflow, onIdeaClick, onExploreClick }: Props) {
  return (
    <header
      className="flex items-center justify-between px-8 h-16 flex-shrink-0"
      style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", position: "relative", zIndex: 10 }}
    >
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-lg font-semibold tracking-wide" style={{ color: "var(--foreground)" }}>
          t<span style={{ color: "var(--foreground)" }}>IP</span>e
        </span>
      </div>

      <nav className="flex items-center gap-1">
        <button
          onClick={onIdeaClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: workflow === "idea" ? "var(--surface-2)" : "transparent",
            color: workflow === "idea" ? "var(--foreground)" : "var(--muted)",
            border: workflow === "idea" ? "1px solid var(--border)" : "1px solid transparent",
          }}
        >
          <Lightbulb size={16} strokeWidth={1.5} />
          I have an idea
        </button>
        <button
          onClick={onExploreClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: workflow === "explore" || workflow === "plug-create" ? "var(--surface-2)" : "transparent",
            color: workflow === "explore" || workflow === "plug-create" ? "var(--foreground)" : "var(--muted)",
            border: workflow === "explore" || workflow === "plug-create" ? "1px solid var(--border)" : "1px solid transparent",
          }}
        >
          <Radar size={16} strokeWidth={1.5} />
          Explore patents
        </button>
      </nav>

      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
        <span>2000–2024</span>
        <span>USPTO</span>
      </div>
    </header>
  );
}
