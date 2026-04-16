import type { Patent } from "./types";

/**
 * Derive patent status from the patent ID suffix and grant year.
 *
 * All patents in our dataset are granted (B1/B2 suffixes).
 * US utility patents expire 20 years from filing date.
 * We estimate filing ~2 years before grant year.
 */
export function deriveStatus(p: Patent): Patent["status"] {
  const suffix = p.id.split("-").pop() ?? "";

  // A1/A2 = application (pending) — unlikely in our dataset but handle it
  if (suffix.startsWith("A")) return "pending";

  // B1/B2/E = granted — check if expired based on estimated filing year
  const estimatedFilingYear = p.year - 2;
  const estimatedExpiry = estimatedFilingYear + 20;
  const currentYear = new Date().getFullYear();

  if (currentYear >= estimatedExpiry) return "expired";
  return "active";
}

/**
 * Enrich a patent with derived metadata from real data.
 * No synthetic/fake data — only real fields + derived status.
 */
export function enrichPatent(p: Patent): Patent {
  return {
    ...p,
    status: deriveStatus(p),
  };
}

/**
 * Find similar patents by category + spatial proximity on the map.
 * Uses real coordinates from the embedding layout.
 */
export function findSimilarPatents(target: Patent, allPatents: Patent[], count = 6): Patent[] {
  return allPatents
    .filter(p => p.id !== target.id && p.category === target.category)
    .map(p => ({
      patent: p,
      dist: Math.hypot(p.x - target.x, p.y - target.y),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map(r => r.patent);
}
