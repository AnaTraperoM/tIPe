"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import PatentClusterMap from "./components/PatentClusterMap";
import ComparePanel from "./components/ComparePanel";
import DatasetPanel from "./components/DatasetPanel";
import LandingOverlay from "./components/LandingOverlay";
import IdeaInputPanel from "./components/IdeaInputPanel";
import AnalysisProgress from "./components/AnalysisProgress";
import LandscapeReport from "./components/LandscapeReport";
import PlugAndCreate from "./components/PlugAndCreate";
import type {
  Patent,
  TranslationResult,
  ComparisonResult,
  UploadAnalysisResult,
  SearchResponse,
  GroupSummaryResult,
  HistoryEntry,
  ConceptSearchResult,
  QueryInterpretation,
  FTOReport,
  FTOProgress,
  PlugCreateResult,
} from "./lib/types";
import { CATEGORY_COLORS } from "./lib/mock-data";
import { computeCoordinates } from "./lib/embeddings";
import { enrichPatent, findSimilarPatents } from "./lib/patent-enrich";

export default function Home() {
  // Patent data
  const [patents, setPatents] = useState<Patent[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMock, setSearchMock] = useState(true);
  const [queryInterpretation, setQueryInterpretation] = useState<QueryInterpretation | null>(null);

  // Selected patent + translation
  const [selected, setSelected] = useState<Patent | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);

  // Compare
  const [compareSet, setCompareSet] = useState<Map<string, Patent>>(new Map());
  const [compareResult, setCompareResult] = useState<ComparisonResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Upload / Idea
  const [uploadedPoint, setUploadedPoint] = useState<{ x: number; y: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadAnalysisResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadRadius, setUploadRadius] = useState(10);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Session history — persisted to localStorage
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([]);

  // Load history after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tipe_history");
      if (!raw) return;
      setSessionHistory((JSON.parse(raw) as HistoryEntry[]).map(e => ({ ...e, timestamp: new Date(e.timestamp) })));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("tipe_history", JSON.stringify(sessionHistory));
  }, [sessionHistory]);

  // Group selection (circle draw)
  const [drawMode, setDrawMode] = useState(false);
  const [groupSelection, setGroupSelection] = useState<Patent[]>([]);
  const [groupSummary, setGroupSummary] = useState<GroupSummaryResult | null>(null);
  const [groupSummaryLoading, setGroupSummaryLoading] = useState(false);

  // Filters
  const [yearRange, setYearRange] = useState<[number, number]>([2000, 2024]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(Object.keys(CATEGORY_COLORS))
  );

  // Concept search
  const [conceptMatches, setConceptMatches] = useState<Set<string>>(new Set());
  const [conceptExplanation, setConceptExplanation] = useState<string>("");
  const [conceptLoading, setConceptLoading] = useState(false);

  // Sidebar tab (lifted so page can switch it)
  const [sidebarTab, setSidebarTab] = useState<"patent" | "upload" | "compare" | "history">("patent");

  // Workflow state
  const [workflow, setWorkflow] = useState<"landing" | "idea" | "explore" | "plug-create">("landing");
  const [ftoReport, setFtoReport] = useState<FTOReport | null>(null);
  const [ftoLoading, setFtoLoading] = useState(false);
  const [ftoProgress, setFtoProgress] = useState<FTOProgress[]>([]);
  const [ftoIdeaBrief, setFtoIdeaBrief] = useState("");
  const [plugCreatePatents, setPlugCreatePatents] = useState<Map<string, Patent>>(new Map());
  const [plugCreateResult, setPlugCreateResult] = useState<PlugCreateResult | null>(null);
  const [plugCreateLoading, setPlugCreateLoading] = useState(false);

  // Toast error
  const [error, setError] = useState<string | null>(null);

  // Derived: filtered patents
  const visiblePatents = useMemo(
    () =>
      patents.filter((p) => {
        const inYear = p.year >= yearRange[0] && p.year <= yearRange[1];
        const inCat = activeCategories.has(p.category);
        return inYear && inCat;
      }),
    [patents, yearRange, activeCategories]
  );

  // Memoize compareSet keys for PatentClusterMap
  const compareSetIds = useMemo(() => new Set(compareSet.keys()), [compareSet]);

  const addHistory = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    setSessionHistory(prev => [{
      ...entry,
      id: String(Date.now()) + Math.random(),
      timestamp: new Date(),
    }, ...prev].slice(0, 100));
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  const handleGroupSummarize = useCallback(async (patents?: Patent[]) => {
    const toSummarize = patents ?? groupSelection;
    if (!toSummarize.length) return;
    setGroupSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/summarize-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patents: toSummarize }),
      });
      if (!res.ok) throw new Error("Summarize failed");
      const data: GroupSummaryResult = await res.json();
      setGroupSummary(data);
    } catch (err) {
      showError("Group summarization failed. Please try again.");
      console.error(err);
    } finally {
      setGroupSummaryLoading(false);
    }
  }, [groupSelection, showError]);

  const handleGroupSelect = useCallback((selected: Patent[]) => {
    setGroupSelection(selected);
    setGroupSummary(null);
    setDrawMode(false);
    if (selected.length > 0) {
      addHistory({ type: "group_select", label: `Group selected: ${selected.length} patents` });
      setSidebarTab("patent");
      setDrawerOpen(true);
      handleGroupSummarize(selected);
    }
  }, [addHistory, handleGroupSummarize]);

  const handleToggleCategories = useCallback((cats: string[], forceActive?: boolean) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      for (const cat of cats) {
        if (forceActive === true) next.add(cat);
        else if (forceActive === false) next.delete(cat);
        else if (next.has(cat)) next.delete(cat);
        else next.add(cat);
      }
      return next.size > 0 ? next : prev;
    });
  }, []);

  const handleConceptSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setConceptMatches(new Set());
      setConceptExplanation("");
      return;
    }
    setConceptLoading(true);
    try {
      const res = await fetch("/api/ai/concept-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: query }),
      });
      if (!res.ok) throw new Error("Concept search failed");
      const data: ConceptSearchResult = await res.json();
      setConceptMatches(new Set(data.matchingIds));
      setConceptExplanation(data.explanation);
      addHistory({ type: "search", label: `Concept: "${query}" — ${data.matchingIds.length} matches` });
    } catch (err) {
      showError("Concept search failed. Please try again.");
      console.error(err);
    } finally {
      setConceptLoading(false);
    }
  }, [showError, addHistory]);

  // Select patent + log history
  const handleSelectPatent = useCallback((patent: Patent | null) => {
    setSelected(patent);
    if (patent) {
      addHistory({ type: "view", label: patent.title, patentId: patent.id });
      setDrawerOpen(true);
    }
  }, [addHistory]);

  // Reset handlers
  const handleResetSelection = useCallback(() => {
    setSelected(null);
    setTranslation(null);
  }, []);

  const handleResetCompare = useCallback(() => {
    setCompareSet(new Map());
    setCompareResult(null);
    setShowCompare(false);
  }, []);

  const handleResetFilters = useCallback(() => {
    setYearRange([2000, 2024]);
    setActiveCategories(new Set(Object.keys(CATEGORY_COLORS)));
    setConceptMatches(new Set());
    setConceptExplanation("");
  }, []);

  const handleResetUpload = useCallback(() => {
    setUploadResult(null);
    setUploadedPoint(null);
  }, []);

  const handleResetAll = useCallback(() => {
    setSelected(null);
    setTranslation(null);
    setCompareSet(new Map());
    setCompareResult(null);
    setShowCompare(false);
    setYearRange([2000, 2024]);
    setActiveCategories(new Set(Object.keys(CATEGORY_COLORS)));
    setUploadResult(null);
    setUploadedPoint(null);
    setGroupSelection([]);
    setGroupSummary(null);
    setDrawMode(false);
  }, []);

  // Memoized inline callbacks for child components
  const handleCloseSidebar = useCallback(() => setDrawerOpen(false), []);
  const handleClearSelected = useCallback(() => setSelected(null), []);
  const handleOpenCompare = useCallback(() => setShowCompare(true), []);
  const handleGroupSummarizeNoArgs = useCallback(() => handleGroupSummarize(), [handleGroupSummarize]);
  const handleGroupClose = useCallback(() => {
    setGroupSelection([]);
    setGroupSummary(null);
    setQueryInterpretation(null);
  }, []);
  const handleToggleDrawer = useCallback(() => setDrawerOpen(v => !v), []);
  const handleCloseCompare = useCallback(() => setShowCompare(false), []);
  const handleClearHistory = useCallback(() => setSessionHistory([]), []);

  // Load patents from BigQuery (no mock fallback)
  const [dataSource, setDataSource] = useState<"loading" | "bigquery" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch static cache file directly from CDN (works on Vercel without serverless fs)
        const res = await fetch("/data/patents-cache.json");
        if (!res.ok) throw new Error(`Cache fetch failed: ${res.status}`);
        const data = await res.json() as { patents: Patent[]; cachedAt: string };
        if (!cancelled) {
          // Recompute coordinates client-side from current cluster layout
          const withCoords = data.patents.map(p => {
            const coords = computeCoordinates(p.category, p.id);
            return enrichPatent({ ...p, x: coords.x, y: coords.y });
          });
          setPatents(withCoords);
          setDataSource("bigquery");
        }
      } catch (err) {
        if (!cancelled) {
          setDataSource("error");
          showError(err instanceof Error ? err.message : "Failed to load patent data.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  // Search
  const handleSearch = useCallback(async (query: string) => {
    setSearching(true);
    setGroupSelection([]);
    setGroupSummary(null);
    setQueryInterpretation(null);
    try {
      const res = await fetch("/api/patents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, yearFrom: 2000, yearTo: 2024, limit: 360 }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResponse = await res.json();
      setPatents(data.patents);
      setSearchMock(data.mock);
      setSelected(null);
      setTranslation(null);
      if (data.queryInterpretation) setQueryInterpretation(data.queryInterpretation);
      addHistory({ type: "search", label: `"${query}" — ${data.patents.length} results` });
      // Auto-open drawer with cluster summary
      if (data.patents.length > 0) {
        setGroupSelection(data.patents);
        setSidebarTab("patent");
        setDrawerOpen(true);
        handleGroupSummarize(data.patents);
      }
    } catch (err) {
      showError("Patent search failed. Please try again.");
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [showError, addHistory, handleGroupSummarize]);

  // Translation
  const handleTranslate = useCallback(async () => {
    if (!selected) return;
    setTranslationLoading(true);
    setTranslation(null);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data: TranslationResult = await res.json();
      setTranslation(data);
    } catch (err) {
      showError("AI translation failed. Please try again.");
      console.error(err);
    } finally {
      setTranslationLoading(false);
    }
  }, [selected, showError]);

  useEffect(() => {
    setTranslation(null);
  }, [selected?.id]);

  // Compare
  const handleToggleCompare = useCallback((patent: Patent) => {
    setCompareSet((prev) => {
      const next = new Map(prev);
      if (next.has(patent.id)) {
        next.delete(patent.id);
      } else if (next.size < 3) {
        next.set(patent.id, patent);
        if (next.size >= 2) setShowCompare(true);
      }
      return next;
    });
    setCompareResult(null);
  }, []);

  const handleRunCompare = useCallback(async () => {
    const patentsToCompare = [...compareSet.values()];
    if (patentsToCompare.length < 2) return;
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patents: patentsToCompare }),
      });
      if (!res.ok) throw new Error("Comparison failed");
      const data: ComparisonResult = await res.json();
      setCompareResult(data);
      addHistory({ type: "compare", label: `Compared ${patentsToCompare.length} patents` });
    } catch (err) {
      showError("AI comparison failed. Please try again.");
      console.error(err);
    } finally {
      setCompareLoading(false);
    }
  }, [compareSet, showError, addHistory]);

  const handleRemoveFromCompare = useCallback((id: string) => {
    setCompareSet((prev) => {
      const next = new Map(prev);
      next.delete(id);
      if (next.size < 1) setShowCompare(false);
      return next;
    });
    setCompareResult(null);
  }, []);

  // Upload file
  const handleUpload = useCallback(async (file: File) => {
    setUploadLoading(true);
    setUploadResult(null);
    setUploadedPoint(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("radius", String(uploadRadius));
      const res = await fetch("/api/ai/analyze-upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload analysis failed");
      const data: UploadAnalysisResult = await res.json();
      setUploadResult(data);
      setUploadedPoint(data.placementCoords);
      addHistory({ type: "upload", label: `Analyzed: ${file.name} (${data.relatedPatents.length} patents)` });
    } catch (err) {
      showError("Upload analysis failed. Please try again.");
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  }, [showError, addHistory, uploadRadius]);

  // ── FTO Analysis ──
  const handleFTOSubmit = useCallback(async (data: { type: string; content: string; brief: string; file?: File; patentCount: number }) => {
    setFtoLoading(true);
    setFtoReport(null);
    setFtoIdeaBrief(data.brief);
    setFtoProgress([
      { step: "features", status: "active", message: "Extracting features from your description" },
      { step: "search", status: "pending", message: "Building optimized query" },
      { step: "screening", status: "pending", message: "IPC screening, abstract relevance" },
      { step: "claims", status: "pending", message: "Analyzing patent claims" },
      { step: "report", status: "pending", message: "Compiling landscape report" },
    ]);

    // Simulate progress steps
    const updateProgress = (activeStep: FTOProgress["step"]) => {
      setFtoProgress(prev => prev.map(s => ({
        ...s,
        status: s.step === activeStep ? "active" : (
          ["features", "search", "screening", "claims", "report"].indexOf(s.step) <
          ["features", "search", "screening", "claims", "report"].indexOf(activeStep) ? "done" : "pending"
        ),
      })));
    };

    // Animate through steps while waiting for API
    const delays = [800, 1600, 2400, 3200];
    const timers = delays.map((d, i) =>
      setTimeout(() => updateProgress(["search", "screening", "claims", "report"][i] as FTOProgress["step"]), d)
    );

    try {
      let content = data.content;
      if (data.file) {
        content = `[Uploaded file: ${data.file.name}] ${data.brief}`;
      }

      const res = await fetch("/api/ai/fto-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: data.brief, content, patentCount: data.patentCount }),
      });
      if (!res.ok) throw new Error("FTO analysis failed");
      const report: FTOReport = await res.json();
      setFtoReport(report);
      setFtoProgress(prev => prev.map(s => ({ ...s, status: "done" as const })));
    } catch (err) {
      showError("FTO analysis failed. Please try again.");
      console.error(err);
    } finally {
      timers.forEach(clearTimeout);
      setFtoLoading(false);
    }
  }, [showError]);

  // ── Plug & Create ──
  const handlePlugCreateToggle = useCallback((patent: Patent) => {
    setPlugCreatePatents(prev => {
      const next = new Map(prev);
      if (next.has(patent.id)) next.delete(patent.id);
      else next.set(patent.id, patent);
      return next;
    });
    setPlugCreateResult(null);
  }, []);

  const handlePlugCreateGenerate = useCallback(async () => {
    const patentList = [...plugCreatePatents.values()];
    if (patentList.length < 2) return;
    setPlugCreateLoading(true);
    setPlugCreateResult(null);
    try {
      const res = await fetch("/api/ai/plug-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patents: patentList }),
      });
      if (!res.ok) throw new Error("Plug & Create failed");
      const result: PlugCreateResult = await res.json();
      setPlugCreateResult(result);
    } catch (err) {
      showError("Idea generation failed. Please try again.");
      console.error(err);
    } finally {
      setPlugCreateLoading(false);
    }
  }, [plugCreatePatents, showError]);

  const handlePlugCreateSearch = useCallback((query: string): Patent[] => {
    const q = query.toLowerCase();
    return patents.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.abstract ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [patents]);

  const handlePlugCreateCheckLandscape = useCallback((description: string) => {
    setWorkflow("idea");
    setFtoReport(null);
    setFtoIdeaBrief(description.slice(0, 100));
  }, []);

  const handleGoToMainMenu = useCallback(() => {
    setWorkflow("landing");
    setFtoReport(null);
    setFtoLoading(false);
    setFtoProgress([]);
    setPlugCreateResult(null);
    setPlugCreatePatents(new Map());
  }, []);

  // Analyze text idea
  const handleAnalyzeIdea = useCallback(async (text: string) => {
    setUploadLoading(true);
    setUploadResult(null);
    setUploadedPoint(null);
    try {
      const res = await fetch("/api/ai/analyze-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, radius: uploadRadius }),
      });
      if (!res.ok) throw new Error("Idea analysis failed");
      const data: UploadAnalysisResult = await res.json();
      setUploadResult(data);
      setUploadedPoint(data.placementCoords);
      addHistory({ type: "upload", label: `Idea analyzed (${data.relatedPatents.length} patents)` });
    } catch (err) {
      showError("Idea analysis failed. Please try again.");
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  }, [showError, addHistory, uploadRadius]);

  // Determine if left panel should show (idea workflow)
  const showIdeaPanel = workflow === "idea" && !ftoLoading && !ftoReport;
  const showProgressPanel = workflow === "idea" && ftoLoading;
  const showReportPanel = workflow === "idea" && ftoReport && !ftoLoading;
  const showPlugCreatePanel = workflow === "plug-create";
  const showLeftPanel = showIdeaPanel || showProgressPanel || showReportPanel || showPlugCreatePanel;

  return (
    <div className="flex flex-col h-full">
      <Header
        workflow={workflow}
        onIdeaClick={() => setWorkflow("idea")}
        onExploreClick={() => setWorkflow("explore")}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — shows for "I Have an Idea" and "Plug & Create" workflows */}
        {showLeftPanel && (
          <div style={{ width: "75vw", flexShrink: 0 }}>
            {showIdeaPanel && (
              <IdeaInputPanel
                onSubmit={handleFTOSubmit}
                onClose={() => setWorkflow("explore")}
                onMainMenu={handleGoToMainMenu}
              />
            )}
            {showProgressPanel && (
              <AnalysisProgress steps={ftoProgress} brief={ftoIdeaBrief} />
            )}
            {showReportPanel && ftoReport && (
              <LandscapeReport
                report={ftoReport}
                onMainMenu={handleGoToMainMenu}
                onViewOnMap={() => setWorkflow("explore")}
              />
            )}
            {showPlugCreatePanel && (
              <PlugAndCreate
                patents={patents}
                selectedPatents={plugCreatePatents}
                onTogglePatent={handlePlugCreateToggle}
                onGenerate={handlePlugCreateGenerate}
                onCheckLandscape={handlePlugCreateCheckLandscape}
                result={plugCreateResult}
                loading={plugCreateLoading}
                onClose={() => setWorkflow("explore")}
                onMainMenu={handleGoToMainMenu}
                onSearch={handlePlugCreateSearch}
              />
            )}
          </div>
        )}

        {/* Sidebar — only in explore mode */}
        {workflow === "explore" && (
          <Sidebar
            open={drawerOpen}
            onClose={handleCloseSidebar}
            selected={selected}
            onClear={handleClearSelected}
            onUpload={handleUpload}
            onAnalyzeIdea={handleAnalyzeIdea}
            uploadRadius={uploadRadius}
            onUploadRadiusChange={setUploadRadius}
            translation={translation}
            translationLoading={translationLoading}
            onTranslate={handleTranslate}
            uploadResult={uploadResult}
            uploadLoading={uploadLoading}
            compareCount={compareSet.size}
            onOpenCompare={handleOpenCompare}
            onSelectPatent={handleSelectPatent}
            sessionHistory={sessionHistory}
            onClearHistory={handleClearHistory}
            onResetSelection={handleResetSelection}
            onResetCompare={handleResetCompare}
            onResetFilters={handleResetFilters}
            onResetUpload={handleResetUpload}
            onResetAll={handleResetAll}
            tab={sidebarTab}
            onTabChange={setSidebarTab}
            groupSelection={groupSelection}
            groupSummary={groupSummary}
            groupSummaryLoading={groupSummaryLoading}
            onGroupSummarize={handleGroupSummarizeNoArgs}
            onGroupClose={handleGroupClose}
            queryInterpretation={queryInterpretation}
            onCompareMode={() => { setDrawerOpen(true); setSidebarTab("compare"); }}
            onPlugCreate={() => { setWorkflow("plug-create"); setPlugCreatePatents(new Map()); setPlugCreateResult(null); }}
            onMainMenu={handleGoToMainMenu}
            allPatents={patents}
          />
        )}

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            <PatentClusterMap
              patents={visiblePatents}
              onSelect={workflow === "plug-create" ? (p: Patent | null) => { if (p) handlePlugCreateToggle(p); } : handleSelectPatent}
              selected={selected}
              uploadedPoint={uploadedPoint}
              compareSet={workflow === "plug-create" ? new Set(plugCreatePatents.keys()) : compareSetIds}
              onToggleCompare={handleToggleCompare}
              searching={searching || conceptLoading}
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
              onGroupSelect={handleGroupSelect}
              onToggleDrawer={handleToggleDrawer}
              conceptMatches={conceptMatches}
              onConceptSearch={handleConceptSearch}
              conceptExplanation={conceptExplanation}
              showSearchHull={!!queryInterpretation && groupSelection.length > 0}
            />
            {showCompare && (
              <ComparePanel
                patents={[...compareSet.values()]}
                result={compareResult}
                loading={compareLoading}
                onCompare={handleRunCompare}
                onRemove={handleRemoveFromCompare}
                onClose={handleCloseCompare}
              />
            )}
          </div>
          <DatasetPanel
            yearRange={yearRange}
            onYearRange={setYearRange}
            activeCategories={activeCategories}
            onToggleCategories={handleToggleCategories}
            onTopicSearch={handleConceptSearch}
          />
        </main>
      </div>

      {/* Landing overlay */}
      {workflow === "landing" && (
        <LandingOverlay
          onIdeaClick={() => setWorkflow("idea")}
          onExploreClick={() => setWorkflow("explore")}
        />
      )}

      {error && (
        <div
          className="fixed bottom-5 right-5 text-xs px-4 py-3 rounded-lg shadow-xl z-50"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            maxWidth: 320,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
