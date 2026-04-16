"use client";

import { Lightbulb, Radar } from "lucide-react";
import Logo from "./Logo";

interface Props {
  onIdeaClick: () => void;
  onExploreClick: () => void;
}

const gridStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 340,
  pointerEvents: "none",
  backgroundImage: [
    // Intersection dots — at grid line crossings (corners of squares)
    "radial-gradient(circle, rgba(132,177,242,0.5) 1.5px, transparent 1.5px)",
    // Vertical solid thin lines
    "linear-gradient(90deg, rgba(132,177,242,0.18) 1px, transparent 1px)",
    // Horizontal solid thin lines
    "linear-gradient(0deg, rgba(132,177,242,0.18) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "80px 80px, 80px 80px, 80px 80px",
  backgroundPosition: "-40px -40px, 0 0, 0 0",
};

export default function LandingOverlay({ onIdeaClick, onExploreClick }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(16px)" }}
    >
      {/* Grid overlay — top */}
      <div style={{ ...gridStyle, top: 0, maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)" }} />
      {/* Grid overlay — bottom */}
      <div style={{ ...gridStyle, bottom: 0, maskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)" }} />

      <div className="min-h-full flex items-center justify-center py-12 px-8 relative">
      <div className="flex flex-col items-center gap-10" style={{ maxWidth: "90vw" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="flex items-center gap-4">
            <Logo size={72} />
            <span style={{ color: "var(--foreground)", fontSize: "3.5rem", fontWeight: 600, letterSpacing: "0.05em" }}>
              t<span style={{ color: "var(--foreground)" }}>IP</span>e
            </span>
          </div>
          <div className="text-center">
            <h1
              className="tracking-tight mb-4"
              style={{ color: "var(--foreground)", fontSize: "3.75rem", lineHeight: 1.1, fontWeight: 400 }}
            >
              Start with your idea
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "2rem", lineHeight: 1.4 }}>
              or explore what&apos;s already out there
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
              minWidth: 300,
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
                className="mb-1"
                style={{ fontSize: "2.25rem", color: "var(--foreground)", fontWeight: 400, whiteSpace: "nowrap" }}
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
              minWidth: 300,
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
                className="mb-1"
                style={{ fontSize: "2.25rem", color: "var(--foreground)", fontWeight: 400, whiteSpace: "nowrap" }}
              >
                Explore patents
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Browse patents, compare and combine for new ideas
              </div>
            </div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
