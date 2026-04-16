"use client";

import { Lightbulb, Radar } from "lucide-react";
import Logo from "./Logo";

interface Props {
  onIdeaClick: () => void;
  onExploreClick: () => void;
}

export default function LandingOverlay({ onIdeaClick, onExploreClick }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size={56} />
            <span className="text-4xl font-semibold tracking-wide" style={{ color: "var(--foreground)" }}>
              t<span style={{ color: "var(--foreground)" }}>IP</span>e
            </span>
          </div>
          <div className="text-center">
            <h1
              className="text-4xl font-bold tracking-tight mb-3"
              style={{ color: "var(--foreground)" }}
            >
              What would you like to do?
            </h1>
            <p className="text-base" style={{ color: "var(--muted)" }}>
              Choose a workflow to get started
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          <button
            onClick={onIdeaClick}
            className="flex flex-col items-center gap-4 p-10 rounded-2xl transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              width: 240,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Lightbulb size={36} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            <div className="text-center">
              <div
                className="text-lg font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                I have an idea
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Check your innovation against the patent landscape
              </div>
            </div>
          </button>

          <button
            onClick={onExploreClick}
            className="flex flex-col items-center gap-4 p-10 rounded-2xl transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              width: 240,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Radar size={36} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
            <div className="text-center">
              <div
                className="text-lg font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Explore patents
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Browse clusters, compare, and create new ideas
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
