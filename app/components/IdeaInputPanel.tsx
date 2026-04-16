"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Image, X, Type } from "lucide-react";

type InputTab = "text" | "document" | "visual";

interface Props {
  onSubmit: (data: { type: InputTab; content: string; brief: string; file?: File; patentCount: number }) => void;
  onClose: () => void;
  onMainMenu: () => void;
}

export default function IdeaInputPanel({ onSubmit, onClose, onMainMenu }: Props) {
  const [tab, setTab] = useState<InputTab>("text");
  const [textContent, setTextContent] = useState("");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Config step
  const [showConfig, setShowConfig] = useState(false);
  const [patentCount, setPatentCount] = useState(20);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const canSubmit = tab === "text"
    ? textContent.trim().length > 0
    : tab === "visual"
      ? brief.trim().length > 0 && !!file
      : !!file;

  const handleCheckLandscape = () => {
    if (!canSubmit) return;
    setShowConfig(true);
  };

  const handleStartAnalysis = () => {
    onSubmit({
      type: tab,
      content: tab === "text" ? textContent : file?.name ?? "",
      brief: tab === "text" ? textContent.slice(0, 200) : tab === "visual" ? brief : (file?.name ?? ""),
      file: file ?? undefined,
      patentCount,
    });
  };

  const tabs: { key: InputTab; label: string; icon: React.ReactNode }[] = [
    { key: "text", label: "Text", icon: <Type size={14} /> },
    { key: "document", label: "Document", icon: <FileText size={14} /> },
    { key: "visual", label: "Visual", icon: <Image size={14} /> },
  ];

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
        className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Describe your innovation
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            We&apos;ll check it against the patent landscape
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
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!showConfig ? (
          <div className="flex flex-col gap-5 max-w-2xl">
            {/* Tab selector */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setFile(null); }}
                  className="flex items-center gap-1.5 flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: tab === t.key ? "var(--surface)" : "transparent",
                    color: tab === t.key ? "var(--foreground)" : "var(--muted)",
                    border: tab === t.key ? "1px solid var(--border)" : "1px solid transparent",
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Text input */}
            {tab === "text" && (
              <div>
                <label
                  className="text-sm font-medium block mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Describe your idea in detail
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Describe your innovation in as much detail as possible. Include the technical approach, key components, and what makes it different from existing solutions..."
                  className="w-full rounded-xl text-sm p-4 outline-none resize-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    minHeight: 200,
                    lineHeight: 1.7,
                  }}
                />
              </div>
            )}

            {/* Document upload */}
            {tab === "document" && (
              <div>
                <label
                  className="text-sm font-medium block mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Upload a patent document
                </label>
                {file ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <FileText size={20} style={{ color: "var(--accent)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                        {file.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 rounded hover:bg-white/5"
                      style={{ color: "var(--muted)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-colors"
                    style={{
                      border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
                      background: dragOver ? "rgba(255,255,255,0.06)" : "var(--surface-2)",
                    }}
                  >
                    <Upload size={24} style={{ color: "var(--muted)" }} />
                    <div className="text-center">
                      <p className="text-sm" style={{ color: "var(--muted)" }}>
                        Drop a PDF, DOCX, or TXT file here
                      </p>
                      <label
                        className="text-xs mt-2 inline-block py-1.5 px-4 rounded cursor-pointer font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--muted)",
                        }}
                      >
                        Browse files
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt,.doc"
                          className="hidden"
                          onChange={handleFileInput}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Visual upload */}
            {tab === "visual" && (
              <div>
                <label
                  className="text-sm font-medium block mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Upload drawings, diagrams, or photos
                </label>
                {file ? (
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Image size={20} style={{ color: "var(--accent)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                        {file.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 rounded hover:bg-white/5"
                      style={{ color: "var(--muted)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-colors"
                    style={{
                      border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
                      background: dragOver ? "rgba(255,255,255,0.06)" : "var(--surface-2)",
                    }}
                  >
                    <Image size={24} style={{ color: "var(--muted)" }} />
                    <div className="text-center">
                      <p className="text-sm" style={{ color: "var(--muted)" }}>
                        Drop an image file here
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.6 }}>
                        Claude Vision will analyze your drawing
                      </p>
                      <label
                        className="text-xs mt-2 inline-block py-1.5 px-4 rounded cursor-pointer font-medium transition-opacity hover:opacity-80"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--muted)",
                        }}
                      >
                        Browse files
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.gif,.webp"
                          className="hidden"
                          onChange={handleFileInput}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Brief description — only for visual/picture uploads */}
            {tab === "visual" && (
              <div>
                <label
                  className="text-sm font-medium block mb-1.5"
                  style={{ color: "var(--muted)" }}
                >
                  Brief description <span style={{ color: "var(--accent)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="e.g., A food processor with alternating blade speeds for better texture"
                  className="w-full rounded-xl text-sm p-3 outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.6 }}>
                  1-2 sentences summarizing your innovation
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCheckLandscape}
              disabled={!canSubmit}
              className="text-base font-medium py-3.5 px-8 rounded-xl transition-opacity"
              style={{
                background: canSubmit ? "var(--accent)" : "var(--surface-2)",
                color: canSubmit ? "#000000" : "var(--muted)",
                border: canSubmit ? "none" : "1px solid var(--border)",
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              Check Patent Landscape &rarr;
            </button>
          </div>
        ) : (
          /* Config step — patent count */
          <div className="flex flex-col gap-6 max-w-md">
            <div>
              <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                How thorough should the search be?
              </h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                More patents means a more comprehensive analysis but takes longer.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Related patents to analyze
                </label>
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {patentCount}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={40}
                value={patentCount}
                onChange={(e) => setPatentCount(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "var(--accent)" }}
              />
              <div
                className="flex justify-between text-xs mt-1"
                style={{ color: "var(--muted)", opacity: 0.6 }}
              >
                <span>1 — quick</span>
                <span>40 — thorough</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfig(false)}
                className="text-xs py-2.5 px-4 rounded-lg transition-colors hover:opacity-80"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                Back
              </button>
              <button
                onClick={handleStartAnalysis}
                className="flex-1 text-sm font-medium py-2.5 px-6 rounded-xl transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "#000000" }}
              >
                Start Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
