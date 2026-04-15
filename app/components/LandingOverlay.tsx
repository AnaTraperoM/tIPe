"use client";

interface Props {
  onIdeaClick: () => void;
  onExploreClick: () => void;
}

export default function LandingOverlay({ onIdeaClick, onExploreClick }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight mb-2"
            style={{ color: "var(--foreground)" }}
          >
            What would you like to do?
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Choose a workflow to get started
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onIdeaClick}
            className="flex flex-col items-center gap-3 p-8 rounded-lg transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              width: 200,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span className="text-3xl">&#x1f4a1;</span>
            <div className="text-center">
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                I have an idea
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Check your innovation against the patent landscape
              </div>
            </div>
          </button>

          <button
            onClick={onExploreClick}
            className="flex flex-col items-center gap-3 p-8 rounded-lg transition-all"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              width: 200,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span className="text-3xl">&#x1f50d;</span>
            <div className="text-center">
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Explore patents
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Browse clusters, compare, and create new ideas
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
