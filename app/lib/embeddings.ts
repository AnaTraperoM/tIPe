const CLUSTER_CENTERS: Record<string, { cx: number; cy: number }> = {
  "Machine Learning":   { cx: 0.2,  cy: 0.25 },
  "Biotech":            { cx: 0.75, cy: 0.2  },
  "Semiconductors":     { cx: 0.5,  cy: 0.6  },
  "Robotics":           { cx: 0.25, cy: 0.7  },
  "Telecommunications": { cx: 0.78, cy: 0.65 },
  "Clean Energy":       { cx: 0.52, cy: 0.18 },
  "Other":              { cx: 0.5,  cy: 0.45 },
};

// Simple hash from string → float [0,1]
function hashFloat(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

export function computeCoordinates(category: string, patentId: string): { x: number; y: number } {
  const center = CLUSTER_CENTERS[category] ?? CLUSTER_CENTERS["Other"];
  const angle = hashFloat(patentId) * 2 * Math.PI;
  const r = hashFloat(patentId + "_r") * 0.13;
  return {
    x: center.cx + r * Math.cos(angle),
    y: center.cy + r * Math.sin(angle),
  };
}

export function computeUploadCoordinates(category: string): { x: number; y: number } {
  const center = CLUSTER_CENTERS[category] ?? CLUSTER_CENTERS["Other"];
  // Small random-ish jitter (deterministic — use category string as seed)
  const angle = (category.length * 0.7) % (2 * Math.PI);
  const r = 0.04;
  return {
    x: center.cx + r * Math.cos(angle),
    y: center.cy + r * Math.sin(angle),
  };
}

export { CLUSTER_CENTERS };
