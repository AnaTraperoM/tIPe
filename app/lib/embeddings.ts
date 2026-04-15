import { CATEGORY_COLORS } from "./mock-data";

// ── Subcategory cluster centres (normalised [0,1]) ──────────────────────────
// Semantic layout: related domains near each other, unrelated ones far apart.
// Mirrors SUBCATEGORY_POSITIONS in mock-data.ts — keep in sync.
const CLUSTER_CENTERS: Record<string, { cx: number; cy: number }> = {
  // AI & ML (centre-left) — hub connecting Semiconductors, Robotics, Healthcare
  "Natural Language Processing": { cx: 0.30, cy: 0.28 },
  "Computer Vision":             { cx: 0.37, cy: 0.25 },
  "Reinforcement Learning":      { cx: 0.27, cy: 0.35 },
  "AI Hardware & Chips":         { cx: 0.35, cy: 0.33 },
  "Machine Learning":            { cx: 0.32, cy: 0.30 },
  "Speech Recognition":          { cx: 0.28, cy: 0.30 },
  // Semiconductors (upper-right) — near AI & Telecom
  "Processor Architecture":      { cx: 0.55, cy: 0.18 },
  "Memory & Storage":            { cx: 0.62, cy: 0.15 },
  "Advanced Packaging":          { cx: 0.58, cy: 0.25 },
  "Photonics & Optics":          { cx: 0.65, cy: 0.22 },
  // Telecommunications (far right) — near Semiconductors, bridges to Clean Energy
  "5G & Beyond":                 { cx: 0.79, cy: 0.32 },
  "5G & 6G Networks":            { cx: 0.78, cy: 0.30 },
  "Network Security":            { cx: 0.82, cy: 0.24 },
  "Satellite Communications":    { cx: 0.75, cy: 0.37 },
  "Satellite Communication":     { cx: 0.75, cy: 0.37 },
  "Network Architecture":        { cx: 0.79, cy: 0.32 },
  "IoT & Edge Computing":        { cx: 0.80, cy: 0.38 },
  // Robotics & Automation (left) — near AI & Advanced Manufacturing
  "Industrial Automation":       { cx: 0.10, cy: 0.42 },
  "Autonomous Vehicles":         { cx: 0.17, cy: 0.38 },
  "Drone Technology":            { cx: 0.08, cy: 0.50 },
  "Humanoid Robots":             { cx: 0.15, cy: 0.48 },
  // Advanced Manufacturing (centre-bottom) — bridges Robotics ↔ Clean Energy
  "3D Printing & Additive":      { cx: 0.35, cy: 0.55 },
  "Smart Materials":             { cx: 0.42, cy: 0.52 },
  "Quantum Technology":          { cx: 0.38, cy: 0.62 },
  "Space Technology":            { cx: 0.45, cy: 0.58 },
  "Advanced Manufacturing":      { cx: 0.40, cy: 0.57 },
  // Clean Energy (right-centre) — near Telecom (smart grid) & Manufacturing
  "Solar Technology":            { cx: 0.65, cy: 0.48 },
  "Solar Energy":                { cx: 0.65, cy: 0.48 },
  "Battery Technology":          { cx: 0.72, cy: 0.50 },
  "Hydrogen & Fuel Cells":       { cx: 0.68, cy: 0.56 },
  "Wind Energy":                 { cx: 0.75, cy: 0.55 },
  "Wind & Ocean Energy":         { cx: 0.75, cy: 0.55 },
  "Energy Storage Systems":      { cx: 0.70, cy: 0.52 },
  // Biotechnology (lower-left) — near Healthcare, away from hardware
  "Gene Editing":                { cx: 0.12, cy: 0.72 },
  "Drug Discovery":              { cx: 0.20, cy: 0.70 },
  "Synthetic Biology":           { cx: 0.10, cy: 0.80 },
  "Diagnostics & Imaging":       { cx: 0.18, cy: 0.78 },
  // Healthcare (lower-centre) — bridges Biotech ↔ AI
  "Medical Devices":             { cx: 0.32, cy: 0.75 },
  "Digital Health Platforms":    { cx: 0.40, cy: 0.72 },
  "Digital Health":              { cx: 0.40, cy: 0.72 },
  "Surgical Robotics":           { cx: 0.33, cy: 0.78 },
  "Neurotechnology":             { cx: 0.35, cy: 0.82 },
  "Precision Medicine":          { cx: 0.28, cy: 0.80 },
  // Legacy fallbacks
  "Biotech":                     { cx: 0.15, cy: 0.75 },
  "Semiconductors":              { cx: 0.60, cy: 0.20 },
  "Robotics":                    { cx: 0.12, cy: 0.45 },
  "Telecommunications":          { cx: 0.79, cy: 0.32 },
  "Clean Energy":                { cx: 0.70, cy: 0.52 },
  "Other":                       { cx: 0.50, cy: 0.50 },
};

// Simple hash from string → float [0,1]
function hashFloat(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

// Domain groupings for drift logic — maps category to a domain key
const DOMAIN_OF: Record<string, string> = {};
const DOMAIN_GROUPS: Record<string, string[]> = {
  ai: ["Natural Language Processing", "Computer Vision", "Reinforcement Learning", "AI Hardware & Chips", "Machine Learning", "Speech Recognition"],
  semi: ["Processor Architecture", "Memory & Storage", "Advanced Packaging", "Photonics & Optics", "Semiconductors"],
  telecom: ["5G & Beyond", "5G & 6G Networks", "Network Security", "Satellite Communications", "Satellite Communication", "Network Architecture", "IoT & Edge Computing", "Telecommunications"],
  robotics: ["Industrial Automation", "Autonomous Vehicles", "Drone Technology", "Humanoid Robots", "Robotics"],
  mfg: ["3D Printing & Additive", "Smart Materials", "Quantum Technology", "Space Technology", "Advanced Manufacturing"],
  energy: ["Solar Technology", "Solar Energy", "Battery Technology", "Hydrogen & Fuel Cells", "Wind Energy", "Wind & Ocean Energy", "Energy Storage Systems", "Clean Energy"],
  biotech: ["Gene Editing", "Drug Discovery", "Synthetic Biology", "Diagnostics & Imaging", "Biotech"],
  health: ["Medical Devices", "Digital Health Platforms", "Digital Health", "Surgical Robotics", "Neurotechnology", "Precision Medicine"],
};
for (const [domain, cats] of Object.entries(DOMAIN_GROUPS)) {
  for (const cat of cats) DOMAIN_OF[cat] = domain;
}

// Find the nearest cluster center from a different domain (cached per category)
const neighborCache = new Map<string, { cx: number; cy: number }>();
function nearestCrossDomainCenter(category: string): { cx: number; cy: number } {
  const cached = neighborCache.get(category);
  if (cached) return cached;
  const myDomain = DOMAIN_OF[category] ?? "other";
  const myCenter = CLUSTER_CENTERS[category] ?? CLUSTER_CENTERS["Other"];
  let bestDist = Infinity;
  let best = myCenter;
  for (const [cat, center] of Object.entries(CLUSTER_CENTERS)) {
    if ((DOMAIN_OF[cat] ?? "other") === myDomain) continue;
    const dx = center.cx - myCenter.cx;
    const dy = center.cy - myCenter.cy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = center; }
  }
  neighborCache.set(category, best);
  return best;
}

const coordCache = new Map<string, { x: number; y: number }>();

export function computeCoordinates(category: string, patentId: string): { x: number; y: number } {
  const key = category + "|" + patentId;
  const cached = coordCache.get(key);
  if (cached) return cached;

  const center = CLUSTER_CENTERS[category] ?? CLUSTER_CENTERS["Other"];

  // Gaussian (Rayleigh) radial distribution — dense core with meaningful tails
  const u1 = Math.max(hashFloat(patentId + "_r"), 0.001);
  const u2 = hashFloat(patentId + "_r2");
  const gauss = Math.sqrt(-2 * Math.log(u1));
  const r = Math.min(gauss * 0.06, 0.25);
  const angle = u2 * 2 * Math.PI;

  let x = center.cx + r * Math.cos(angle);
  let y = center.cy + r * Math.sin(angle);

  // Directional drift: ~12% of patents pull toward nearest cross-domain neighbor
  const drift = hashFloat(patentId + "_drift");
  if (drift > 0.88) {
    const neighbor = nearestCrossDomainCenter(category);
    const pull = 0.3;
    x = x + (neighbor.cx - center.cx) * pull;
    y = y + (neighbor.cy - center.cy) * pull;
  }

  const result = { x, y };
  coordCache.set(key, result);
  return result;
}

export function computeUploadCoordinates(category: string): { x: number; y: number } {
  const center = CLUSTER_CENTERS[category] ?? CLUSTER_CENTERS["Other"];
  const angle = (category.length * 0.7) % (2 * Math.PI);
  const r = 0.03;
  return {
    x: center.cx + r * Math.cos(angle),
    y: center.cy + r * Math.sin(angle),
  };
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#cbd5e1";
}

export { CLUSTER_CENTERS };
