"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { Patent } from "@/app/lib/types";
import { CATEGORY_COLORS } from "@/app/lib/mock-data";

export type { Patent };

interface Props {
  patents: Patent[];
  onSelect: (patent: Patent | null) => void;
  selected: Patent | null;
  uploadedPoint?: { x: number; y: number } | null;
  compareSet: Set<string>;
  onToggleCompare: (patent: Patent) => void;
  searching: boolean;
  similarityRadius?: number;
  drawMode: boolean;
  onDrawModeChange: (active: boolean) => void;
  onGroupSelect: (patents: Patent[]) => void;
  onToggleDrawer?: () => void;
  conceptMatches?: Set<string>;
  onConceptSearch?: (query: string) => void;
  conceptExplanation?: string;
  showSearchHull?: boolean;
}

const SIMILARITY_THRESHOLD = 0.12;

export default function PatentClusterMap({
  patents,
  onSelect,
  selected,
  uploadedPoint,
  compareSet,
  onToggleCompare,
  searching,
  similarityRadius = SIMILARITY_THRESHOLD,
  drawMode,
  onDrawModeChange,
  onGroupSelect,
  onToggleDrawer,
  conceptMatches,
  onConceptSearch,
  conceptExplanation,
  showSearchHull,
}: Props) {
  const [conceptQuery, setConceptQuery] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; patent: Patent } | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const xScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());
  const yScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());

  // Persistent D3 layer group refs
  const contoursGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dotsGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const hullGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const uploadGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const rootGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dimsRef = useRef<{ W: number; H: number }>({ W: 0, H: 0 });

  // Drawing state
  const [drawCircle, setDrawCircle] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);

  const handleDrawStart = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawCircle({ startX: x, startY: y, curX: x, curY: y });
  }, []);

  const handleDrawMove = useCallback((e: React.MouseEvent) => {
    setDrawCircle(prev => {
      if (!prev) return null;
      const rect = containerRef.current!.getBoundingClientRect();
      return { ...prev, curX: e.clientX - rect.left, curY: e.clientY - rect.top };
    });
  }, []);

  const handleDrawEnd = useCallback(() => {
    if (!drawCircle) return;
    const r = Math.sqrt(
      (drawCircle.curX - drawCircle.startX) ** 2 +
      (drawCircle.curY - drawCircle.startY) ** 2
    );
    if (r < 8) { setDrawCircle(null); return; }

    const t = transformRef.current;
    const xS = xScaleRef.current;
    const yS = yScaleRef.current;

    const inCircle = patents.filter(p => {
      const px = t.x + t.k * xS(p.x);
      const py = t.y + t.k * yS(p.y);
      const dx = px - drawCircle.startX;
      const dy = py - drawCircle.startY;
      return Math.sqrt(dx * dx + dy * dy) <= r;
    });

    setDrawCircle(null);
    onGroupSelect(inCircle);
  }, [drawCircle, patents, onGroupSelect]);

  // Memoize category-filtered patent groups
  const patentsByCategory = useMemo(() => {
    const map = new Map<string, Patent[]>();
    for (const p of patents) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, [patents]);

  // ── Setup effect: SVG skeleton, scales, zoom, defs, layer groups ──
  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    dimsRef.current = { W, H };
    const root = d3.select(svg).attr("width", W).attr("height", H);
    root.selectAll("*").remove();

    // Defs: glow filters per category
    const defs = root.append("defs");
    Object.entries(CATEGORY_COLORS).forEach(([cat, color]) => {
      const filterId = `glow-${cat.replace(/[^a-zA-Z0-9]/g, "-")}`;
      const filter = defs.append("filter").attr("id", filterId).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      filter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "2.5").attr("result", "blur");
      const merge = filter.append("feMerge");
      merge.append("feMergeNode").attr("in", "blur");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
      void color;
    });

    const g = root.append("g");
    rootGRef.current = g;

    const xScale = d3.scaleLinear().domain([0, 1]).range([40, W - 40]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([40, H - 40]);
    xScaleRef.current = xScale;
    yScaleRef.current = yScale;

    // Create persistent layer groups in correct z-order
    contoursGRef.current = g.append("g").attr("class", "contours-layer");
    hullGRef.current = g.append("g").attr("class", "hull-layer");
    dotsGRef.current = g.append("g").attr("class", "dots-layer");
    uploadGRef.current = g.append("g").attr("class", "upload-layer");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 20])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;
        updateMinimap();
      });
    root.call(zoom);

    // Mini-map
    function updateMinimap() {
      const mm = minimapRef.current;
      if (!mm) return;
      const MW = mm.clientWidth;
      const MH = mm.clientHeight;
      const mmRoot = d3.select(mm);
      mmRoot.selectAll("*").remove();

      const mmX = d3.scaleLinear().domain([0, 1]).range([4, MW - 4]);
      const mmY = d3.scaleLinear().domain([0, 1]).range([4, MH - 4]);

      mmRoot.selectAll("circle.mm-dot")
        .data(patents)
        .join("circle")
        .attr("class", "mm-dot")
        .attr("cx", (d) => mmX(d.x))
        .attr("cy", (d) => mmY(d.y))
        .attr("r", 1.2)
        .attr("fill", (d) => CATEGORY_COLORS[d.category] ?? "#888")
        .attr("fill-opacity", 0.7);

      const t = transformRef.current;
      const vx0 = (0 - t.x) / t.k;
      const vy0 = (0 - t.y) / t.k;
      const vx1 = (W - t.x) / t.k;
      const vy1 = (H - t.y) / t.k;

      const toMmX = (px: number) => mmX(xScale.invert(px));
      const toMmY = (py: number) => mmY(yScale.invert(py));

      mmRoot.append("rect")
        .attr("x", toMmX(vx0)).attr("y", toMmY(vy0))
        .attr("width", toMmX(vx1) - toMmX(vx0))
        .attr("height", toMmY(vy1) - toMmY(vy0))
        .attr("fill", "none")
        .attr("stroke", "var(--accent-light)")
        .attr("stroke-width", 1)
        .attr("opacity", 0.7);
    }

    updateMinimap();
    // Setup only re-runs when patent data changes (triggers full rebuild of scales/groups)
  }, [patents]);

  // ── Effect 1: Static contours (most expensive) ──
  useEffect(() => {
    const contoursG = contoursGRef.current;
    if (!contoursG) return;
    const { W, H } = dimsRef.current;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    contoursG.selectAll("*").remove();

    for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
      const catPatents = patentsByCategory.get(cat);
      if (!catPatents || catPatents.length < 3) continue;
      const density = d3.contourDensity<Patent>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .size([W, H])
        .bandwidth(28)
        .thresholds(5)(catPatents);
      contoursG.selectAll<SVGPathElement, d3.ContourMultiPolygon>(`path.topo-${cat.replace(/[^a-zA-Z0-9]/g, "-")}`)
        .data(density)
        .join("path")
        .attr("d", d3.geoPath())
        .attr("fill", color)
        .attr("fill-opacity", (_, i) => (i + 1) * 0.025)
        .attr("stroke", color)
        .attr("stroke-opacity", 0.18)
        .attr("stroke-width", 0.8)
        .attr("stroke-linejoin", "round");
    }
  }, [patentsByCategory]);

  // ── Effect 2: Dots/circles rendering ──
  useEffect(() => {
    const dotsG = dotsGRef.current;
    if (!dotsG) return;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    dotsG.selectAll("*").remove();

    // Similarity radius ring
    if (selected) {
      const cx = xScale(selected.x);
      const cy = yScale(selected.y);
      const rPx = xScale(similarityRadius) - xScale(0);

      dotsG.append("circle")
        .attr("class", "similarity-ring")
        .attr("cx", cx).attr("cy", cy)
        .attr("r", rPx)
        .attr("fill", `${CATEGORY_COLORS[selected.category] ?? "#7c6af7"}12`)
        .attr("stroke", CATEGORY_COLORS[selected.category] ?? "#7c6af7")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5 3")
        .attr("stroke-opacity", 0.5);
    }

    // Dots
    dotsG.selectAll<SVGCircleElement, Patent>("circle.patent")
      .data(patents, (d) => d.id)
      .join("circle")
      .attr("class", "patent")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", (d) => {
        if (selected?.id === d.id) return 7;
        if (compareSet.has(d.id)) return 5.5;
        if (selected) {
          const dx = d.x - selected.x;
          const dy = d.y - selected.y;
          if (Math.sqrt(dx * dx + dy * dy) < similarityRadius) return 5;
        }
        return 3.5;
      })
      .attr("fill", (d) => CATEGORY_COLORS[d.category] ?? "#888")
      .attr("stroke", (d) => {
        if (compareSet.has(d.id)) return "#ffffff";
        if (selected?.id === d.id) return "#ffffff";
        if (conceptMatches?.has(d.id)) return "#6366f1";
        return "none";
      })
      .attr("stroke-width", (d) => {
        if (compareSet.has(d.id) || selected?.id === d.id) return 2;
        if (conceptMatches?.has(d.id)) return 1.5;
        return 0;
      })
      .attr("fill-opacity", (d) => {
        if (selected?.id === d.id) return 1;
        if (conceptMatches?.size) {
          return conceptMatches.has(d.id) ? 1 : 0.1;
        }
        if (!selected) return 0.8;
        const dx = d.x - selected.x;
        const dy = d.y - selected.y;
        const inRadius = Math.sqrt(dx * dx + dy * dy) < similarityRadius;
        return inRadius || compareSet.has(d.id) ? 0.9 : 0.25;
      })
      .attr("filter", (d) => selected?.id === d.id ? `url(#glow-${d.category.replace(/\s+/g, "-")})` : null)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        if (drawMode) return;
        d3.select(event.currentTarget).attr("r", 7).attr("fill-opacity", 1);
        setTooltip({ x: event.offsetX, y: event.offsetY, patent: d });
      })
      .on("mouseleave", (event, d) => {
        const isSel = selected?.id === d.id;
        const inCompare = compareSet.has(d.id);
        const isConcept = conceptMatches?.has(d.id) ?? false;
        const dx = selected ? d.x - selected.x : 1;
        const dy = selected ? d.y - selected.y : 1;
        const inRadius = selected ? Math.sqrt(dx * dx + dy * dy) < similarityRadius : false;
        let opacity: number;
        if (isSel) opacity = 1;
        else if (conceptMatches?.size) opacity = isConcept ? 0.95 : 0.1;
        else if (!selected) opacity = 0.8;
        else opacity = inRadius || inCompare ? 0.9 : 0.25;
        d3.select(event.currentTarget)
          .attr("r", isSel ? 7 : inCompare ? 5.5 : isConcept ? 5 : inRadius ? 5 : 3.5)
          .attr("fill-opacity", opacity)
          .attr("stroke", isSel || inCompare ? "#ffffff" : isConcept ? "#6366f1" : "none")
          .attr("stroke-width", isSel || inCompare ? 2 : isConcept ? 1.5 : 0);
        setTooltip(null);
      })
      .on("click", (event, d) => {
        if (drawMode) return;
        if (event.shiftKey) onToggleCompare(d);
        else onSelect(d);
      });
  }, [patents, selected, compareSet, similarityRadius, drawMode, onSelect, onToggleCompare, conceptMatches]);

  // ── Effect 3: Search hull ──
  useEffect(() => {
    const hullG = hullGRef.current;
    if (!hullG) return;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    hullG.selectAll("*").remove();

    if (showSearchHull && patents.length >= 3) {
      const points = patents.map(p => [xScale(p.x), yScale(p.y)] as [number, number]);
      const hull = d3.polygonHull(points);
      if (hull) {
        const padded = hull.map(([x, y]) => {
          const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
          const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
          const dx = x - cx, dy = y - cy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          return [x + (dx / len) * 24, y + (dy / len) * 24] as [number, number];
        });
        hullG.append("path")
          .attr("class", "search-hull")
          .attr("d", `M${padded.map(p => p.join(",")).join("L")}Z`)
          .attr("fill", "rgba(99,102,241,0.05)")
          .attr("stroke", "rgba(99,102,241,0.3)")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "6 3")
          .attr("stroke-linejoin", "round");
      }
    }
  }, [patents, showSearchHull]);

  // ── Effect 4: Upload point ──
  useEffect(() => {
    const uploadG = uploadGRef.current;
    if (!uploadG) return;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    uploadG.selectAll("*").remove();

    if (uploadedPoint) {
      uploadG.append("circle")
        .attr("cx", xScale(uploadedPoint.x)).attr("cy", yScale(uploadedPoint.y))
        .attr("r", 12).attr("fill", "none")
        .attr("stroke", "#f0abfc").attr("stroke-width", 2).attr("stroke-dasharray", "4 2");
      uploadG.append("circle")
        .attr("cx", xScale(uploadedPoint.x)).attr("cy", yScale(uploadedPoint.y))
        .attr("r", 4).attr("fill", "#f0abfc");
    }
  }, [uploadedPoint]);

  // Drawn circle geometry
  const circle = drawCircle ? {
    cx: drawCircle.startX,
    cy: drawCircle.startY,
    r: Math.sqrt(
      (drawCircle.curX - drawCircle.startX) ** 2 +
      (drawCircle.curY - drawCircle.startY) ** 2
    ),
  } : null;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full" style={{ background: "var(--background)" }} />

      {/* Draw mode overlay — captures mouse for circle selection */}
      {drawMode && (
        <div
          className="absolute inset-0"
          style={{ cursor: "crosshair", zIndex: 5 }}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
        />
      )}

      {/* SVG overlay showing the circle being drawn */}
      {circle && circle.r > 4 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", zIndex: 6 }}
        >
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="rgba(99,102,241,0.05)"
            stroke="rgba(99,102,241,0.55)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        </svg>
      )}

      {tooltip && !drawMode && (
        <div className="patent-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div style={{ color: CATEGORY_COLORS[tooltip.patent.category], fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
            {tooltip.patent.category} · {tooltip.patent.year}
          </div>
          <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{tooltip.patent.title}</div>
          <div style={{ color: "#64748b", marginTop: 4, fontSize: 11 }}>{tooltip.patent.id}</div>
          {!compareSet.has(tooltip.patent.id) && (
            <div style={{ color: "var(--muted)", marginTop: 3, fontSize: 10 }}>Shift+click to compare</div>
          )}
        </div>
      )}

      {/* ☰ Drawer toggle + concept search */}
      <div className="absolute top-3 left-3 flex flex-col gap-2" style={{ zIndex: 10, width: 280 }}>
        <button
          onClick={onToggleDrawer}
          className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all hover:shadow-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
        >
          <svg width={13} height={13} viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
          Panel
        </button>

        {/* Concept search bar */}
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(15,23,42,0.08)" }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.5} style={{ flexShrink: 0 }}>
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <input
              type="text"
              value={conceptQuery}
              onChange={e => setConceptQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && conceptQuery.trim()) {
                  onConceptSearch?.(conceptQuery.trim());
                }
              }}
              placeholder="What ideas are you looking for?"
              className="bg-transparent outline-none w-full text-xs"
              style={{ color: "var(--foreground)" }}
            />
            {conceptQuery && (
              <button
                onClick={() => { setConceptQuery(""); onConceptSearch?.(""); }}
                className="flex-shrink-0 text-xs"
                style={{ color: "var(--muted)" }}
              >✕</button>
            )}
          </div>
          {conceptExplanation && (
            <div className="px-3 pb-2 text-xs border-t" style={{ borderColor: "var(--border)", color: "var(--muted)", paddingTop: 6 }}>
              {conceptExplanation}
              {conceptMatches && conceptMatches.size > 0 && (
                <span className="ml-1 font-semibold" style={{ color: "var(--accent)" }}>
                  {conceptMatches.size} patents highlighted
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Draw mode button */}
      <div
        className="absolute top-3 right-3 flex gap-1 rounded-lg p-1"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
      >
        <button
          onClick={() => onDrawModeChange(!drawMode)}
          className="text-xs px-2.5 py-1 rounded-md font-medium transition-colors"
          title="Draw a circle to select and summarize a group of patents"
          style={{
            background: drawMode ? "var(--accent)" : "transparent",
            color: drawMode ? "#fff" : "var(--muted)",
          }}
        >
          ◎ Select
        </button>
      </div>

      {/* Mini-map */}
      <div
        className="absolute top-12 right-3 rounded-lg overflow-hidden"
        style={{ width: 120, height: 80, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
      >
        <svg ref={minimapRef} width={120} height={80} />
      </div>

      {/* Compare badge */}
      {compareSet.size >= 1 && (
        <div className="absolute bottom-3 right-3">
          <div className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 2px 8px rgba(99,102,241,0.3)" }}>
            {compareSet.size} selected — Shift+click to add · see Compare tab
          </div>
        </div>
      )}


      {/* Loading overlay */}
      {searching && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(248,250,252,0.85)", zIndex: 10 }}>
          <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}>
            <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2.5}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Searching patents…
          </div>
        </div>
      )}
    </div>
  );
}
