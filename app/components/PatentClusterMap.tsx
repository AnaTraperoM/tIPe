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

// Pre-parse hex colors to [r, g, b] for fast canvas fillStyle construction
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const CATEGORY_RGB: Record<string, [number, number, number]> = {};
for (const [cat, hex] of Object.entries(CATEGORY_COLORS)) {
  CATEGORY_RGB[cat] = hexToRgb(hex);
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; patent: Patent } | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const xScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());
  const yScaleRef = useRef<d3.ScaleLinear<number, number>>(d3.scaleLinear());

  // Persistent D3 layer group refs (SVG overlays only)
  const contoursGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const hullGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const uploadGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const rootGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const dimsRef = useRef<{ W: number; H: number }>({ W: 0, H: 0 });

  // Ref to hold the canvas redraw function so zoom can call it
  const redrawDotsRef = useRef<() => void>(() => {});

  // Refs for latest callback values (avoids stale closures in event handlers)
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onToggleCompareRef = useRef(onToggleCompare);
  onToggleCompareRef.current = onToggleCompare;
  const patentsRef = useRef(patents);
  patentsRef.current = patents;

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

  // Find nearest patent to a screen coordinate (for hover/click hit-testing)
  // Uses refs so it always reads the latest patents without being a dep
  function findNearest(screenX: number, screenY: number): Patent | null {
    const t = transformRef.current;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;
    const pts = patentsRef.current;

    let best: Patent | null = null;
    let bestDistSq = 12 * 12; // 12px threshold, squared to avoid sqrt

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = t.x + t.k * xScale(p.x);
      const py = t.y + t.k * yScale(p.y);
      const dx = px - screenX;
      const dy = py - screenY;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = p;
      }
    }
    return best;
  }

  // ── Setup effect: SVG skeleton, canvas sizing, scales, zoom ──
  // Only re-runs when patent data changes (full rebuild of scales/groups)
  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!container || !svg || !canvas) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    dimsRef.current = { W, H };

    // Size the canvas (account for devicePixelRatio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Setup SVG (on top, handles zoom events; overlays are pointer-events: none children)
    const root = d3.select(svg).attr("width", W).attr("height", H);
    root.selectAll("*").remove();

    const g = root.append("g");
    rootGRef.current = g;

    const xScale = d3.scaleLinear().domain([0, 1]).range([40, W - 40]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([40, H - 40]);
    xScaleRef.current = xScale;
    yScaleRef.current = yScale;

    // SVG layer groups in z-order
    // Ghost arc decorations (blueprint feel)
    const ghostG = g.append("g").attr("class", "ghost-arcs");
    const ghostArcs = [
      { cx: W * 0.15, cy: H * 0.2, r: 140, startAngle: 0.3, endAngle: 1.8 },
      { cx: W * 0.85, cy: H * 0.75, r: 180, startAngle: 2.5, endAngle: 4.8 },
      { cx: W * 0.5, cy: H * 0.5, r: 280, startAngle: 1.0, endAngle: 2.2 },
      { cx: W * 0.25, cy: H * 0.8, r: 100, startAngle: 4.0, endAngle: 5.8 },
      { cx: W * 0.75, cy: H * 0.15, r: 120, startAngle: 0.5, endAngle: 2.0 },
    ];
    for (const arc of ghostArcs) {
      const pathD = d3.arc<unknown>()({
        innerRadius: arc.r, outerRadius: arc.r,
        startAngle: arc.startAngle, endAngle: arc.endAngle,
      });
      if (pathD) {
        ghostG.append("path")
          .attr("d", pathD)
          .attr("transform", `translate(${arc.cx},${arc.cy})`)
          .attr("fill", "none")
          .attr("stroke", "#ffffff")
          .attr("stroke-opacity", 0.025)
          .attr("stroke-width", 0.5)
          .attr("stroke-dasharray", "3 8");
      }
    }

    contoursGRef.current = g.append("g").attr("class", "contours-layer");
    hullGRef.current = g.append("g").attr("class", "hull-layer");
    uploadGRef.current = g.append("g").attr("class", "upload-layer");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 20])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;
        redrawDotsRef.current();
        updateMinimap();
      });
    root.call(zoom);

    // Mouse handlers on SVG for dot hit-testing.
    // Use refs for callbacks/state to avoid needing these as deps.
    root.on("mousemove.hittest", function (event: MouseEvent) {
      if (drawModeRef.current) return;
      const [mx, my] = d3.pointer(event, this);
      const nearest = findNearest(mx, my);
      if (nearest) {
        setTooltip({ x: mx, y: my, patent: nearest });
      } else {
        setTooltip(null);
      }
    });

    root.on("click.hittest", function (event: MouseEvent) {
      if (drawModeRef.current) return;
      const [mx, my] = d3.pointer(event, this);
      const nearest = findNearest(mx, my);
      if (!nearest) return;
      if (event.shiftKey) onToggleCompareRef.current(nearest);
      else onSelectRef.current(nearest);
    });

    root.on("mouseleave.hittest", () => {
      setTooltip(null);
    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patents]);

  // ── Effect 1: Static contours (SVG -- most expensive, only on data change) ──
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
        .bandwidth(40)
        .thresholds(6)(catPatents);
      contoursG.selectAll<SVGPathElement, d3.ContourMultiPolygon>(`path.topo-${cat.replace(/[^a-zA-Z0-9]/g, "-")}`)
        .data(density)
        .join("path")
        .attr("d", d3.geoPath())
        .attr("fill", color)
        .attr("fill-opacity", (_, i) => (i + 1) * 0.015)
        .attr("stroke", "#ffffff")
        .attr("stroke-opacity", (_, i) => 0.03 + i * 0.015)
        .attr("stroke-width", 0.4)
        .attr("stroke-dasharray", "4 6")
        .attr("stroke-linejoin", "round");
    }
  }, [patentsByCategory]);

  // ── Effect 2: Canvas dot rendering ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    function drawDots() {
      const { W, H } = dimsRef.current;
      const xScale = xScaleRef.current;
      const yScale = yScaleRef.current;
      const t = transformRef.current;

      // Clear entire canvas
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Apply zoom transform
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      const hasConceptMatches = conceptMatches && conceptMatches.size > 0;
      const simRadPx = xScale(similarityRadius) - xScale(0);

      // Draw similarity radius ring if a patent is selected
      if (selected) {
        const cx = xScale(selected.x);
        const cy = yScale(selected.y);
        const rgb = CATEGORY_RGB[selected.category] ?? [124, 106, 247];

        ctx.beginPath();
        ctx.arc(cx, cy, simRadPx, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.07)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`;
        ctx.lineWidth = 1 / t.k;
        ctx.setLineDash([5 / t.k, 3 / t.k]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Pre-compute selected coords for distance checks
      const selX = selected ? selected.x : 0;
      const selY = selected ? selected.y : 0;

      // Draw all dots with subtle glow halos
      for (let i = 0; i < patents.length; i++) {
        const p = patents[i];
        const isSel = selected?.id === p.id;
        const inCompare = compareSet.has(p.id);
        const isConcept = hasConceptMatches ? conceptMatches!.has(p.id) : false;

        let inRadius = false;
        if (selected && !isSel) {
          const ddx = p.x - selX;
          const ddy = p.y - selY;
          inRadius = Math.sqrt(ddx * ddx + ddy * ddy) < similarityRadius;
        }

        // Radius (scaled by inverse zoom to keep screen size constant)
        let r: number;
        if (isSel) r = 6;
        else if (inCompare) r = 4.5;
        else if (isConcept) r = 4;
        else if (inRadius) r = 4;
        else r = 2.8;
        r = r / t.k;

        // Opacity
        let alpha: number;
        if (isSel) alpha = 1;
        else if (hasConceptMatches) alpha = isConcept ? 1 : 0.08;
        else if (!selected) alpha = 0.85;
        else alpha = (inRadius || inCompare) ? 0.9 : 0.15;

        const rgb = CATEGORY_RGB[p.category] ?? [136, 136, 136];
        const cx = xScale(p.x);
        const cy = yScale(p.y);

        // Subtle glow halo behind every dot
        const glowAlpha = isSel ? 0.5 : (alpha * 0.25);
        ctx.save();
        ctx.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${glowAlpha})`;
        ctx.shadowBlur = isSel ? 14 / t.k : 6 / t.k;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.fill();
        ctx.restore();

        // Stroke rings
        if (isSel || inCompare) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 0.5 / t.k, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 1.5 / t.k;
          ctx.stroke();
        } else if (isConcept) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 0.5 / t.k, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(226,232,240,0.7)";
          ctx.lineWidth = 1.2 / t.k;
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Store for zoom handler
    redrawDotsRef.current = drawDots;
    drawDots();
  }, [patents, selected, compareSet, similarityRadius, conceptMatches]);

  // ── Effect 3: Search hull (SVG) ──
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
          .attr("fill", "rgba(226,232,240,0.05)")
          .attr("stroke", "rgba(226,232,240,0.3)")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "6 3")
          .attr("stroke-linejoin", "round");
      }
    }
  }, [patents, showSearchHull]);

  // ── Effect 4: Upload point (SVG) ──
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
      {/* Canvas layer for dots (behind SVG) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ zIndex: 1, pointerEvents: "none", background: "#0a0a0f" }}
      />
      {/* SVG on top: zoom surface + contours/hull/upload overlays */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 2, background: "transparent", cursor: drawMode ? "default" : "pointer" }}
      />

      {/* Draw mode overlay -- captures mouse for circle selection */}
      {drawMode && (
        <div
          className="absolute inset-0"
          style={{ cursor: "crosshair", zIndex: 10 }}
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
          style={{ width: "100%", height: "100%", zIndex: 11 }}
        >
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="rgba(226,232,240,0.05)"
            stroke="rgba(226,232,240,0.55)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
        </svg>
      )}

      {tooltip && !drawMode && (
        <div className="patent-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10, zIndex: 20 }}>
          <div style={{ color: CATEGORY_COLORS[tooltip.patent.category], fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
            {tooltip.patent.category} · {tooltip.patent.year}
          </div>
          <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{tooltip.patent.title}</div>
          <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 11 }}>{tooltip.patent.id}</div>
          {!compareSet.has(tooltip.patent.id) && (
            <div style={{ color: "var(--muted)", marginTop: 3, fontSize: 10 }}>Shift+click to compare</div>
          )}
        </div>
      )}

      {/* Drawer toggle + concept search */}
      <div className="absolute top-3 left-3 flex flex-col gap-2" style={{ zIndex: 15, width: 280 }}>
        <button
          onClick={onToggleDrawer}
          className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded font-medium transition-all hover:shadow-sm"
          style={{ background: "rgba(20,19,17,0.7)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--foreground)", boxShadow: "0 1px 8px rgba(0,0,0,0.3)", backdropFilter: "blur(12px)" }}
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
          className="flex flex-col rounded overflow-hidden"
          style={{ background: "rgba(20,19,17,0.7)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 16px rgba(0,0,0,0.3)", backdropFilter: "blur(12px)" }}
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
        className="absolute top-3 right-3 flex gap-1 rounded p-1"
        style={{ background: "rgba(20,19,17,0.7)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 1px 8px rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", zIndex: 15 }}
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
        className="absolute top-12 right-3 rounded overflow-hidden"
        style={{ width: 120, height: 80, background: "rgba(17,17,16,0.8)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 1px 8px rgba(0,0,0,0.4)", zIndex: 15 }}
      >
        <svg ref={minimapRef} width={120} height={80} />
      </div>

      {/* Compare badge */}
      {compareSet.size >= 1 && (
        <div className="absolute bottom-3 right-3" style={{ zIndex: 15 }}>
          <div className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: "var(--accent)", color: "#111110", boxShadow: "0 2px 8px rgba(232,228,222,0.15)" }}>
            {compareSet.size} selected — Shift+click to add · see Compare tab
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {searching && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(17,17,16,0.8)", zIndex: 20 }}>
          <div className="flex items-center gap-2 text-sm px-4 py-3 rounded" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--muted)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)", backdropFilter: "blur(8px)" }}>
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
