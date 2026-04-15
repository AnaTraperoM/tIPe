import { CATEGORY_COLORS } from "./mock-data";

// ── Subcategory cluster centres (normalised [0,1]) ──────────────────────────
// Mirrors SUBCATEGORY_POSITIONS in mock-data.ts — keep in sync.
const CLUSTER_CENTERS: Record<string, { cx: number; cy: number }> = {
  // AI & ML
  "Natural Language Processing": { cx: 0.12, cy: 0.14 },
  "Computer Vision":             { cx: 0.19, cy: 0.14 },
  "Reinforcement Learning":      { cx: 0.12, cy: 0.21 },
  "AI Hardware & Chips":         { cx: 0.19, cy: 0.21 },
  "Machine Learning":            { cx: 0.15, cy: 0.17 },
  // Semiconductors
  "Processor Architecture":      { cx: 0.36, cy: 0.12 },
  "Memory & Storage":            { cx: 0.43, cy: 0.12 },
  "Advanced Packaging":          { cx: 0.36, cy: 0.19 },
  "Photonics & Optics":          { cx: 0.43, cy: 0.19 },
  // Telecommunications
  "5G & Beyond":                 { cx: 0.65, cy: 0.15 },
  "5G & 6G Networks":            { cx: 0.62, cy: 0.12 },
  "Network Security":            { cx: 0.69, cy: 0.12 },
  "Satellite Communications":    { cx: 0.62, cy: 0.19 },
  "Satellite Communication":     { cx: 0.62, cy: 0.19 },
  "Network Architecture":        { cx: 0.65, cy: 0.15 },
  "IoT & Edge Computing":        { cx: 0.69, cy: 0.19 },
  // Robotics
  "Industrial Automation":       { cx: 0.11, cy: 0.44 },
  "Autonomous Vehicles":         { cx: 0.18, cy: 0.44 },
  "Drone Technology":            { cx: 0.11, cy: 0.51 },
  "Humanoid Robots":             { cx: 0.18, cy: 0.51 },
  // Advanced Manufacturing
  "3D Printing & Additive":      { cx: 0.37, cy: 0.42 },
  "Smart Materials":             { cx: 0.44, cy: 0.42 },
  "Quantum Technology":          { cx: 0.37, cy: 0.49 },
  "Space Technology":            { cx: 0.44, cy: 0.49 },
  "Advanced Manufacturing":      { cx: 0.40, cy: 0.45 },
  // Clean Energy
  "Solar Technology":            { cx: 0.63, cy: 0.42 },
  "Solar Energy":                { cx: 0.63, cy: 0.42 },
  "Battery Technology":          { cx: 0.70, cy: 0.42 },
  "Hydrogen & Fuel Cells":       { cx: 0.63, cy: 0.49 },
  "Wind Energy":                 { cx: 0.70, cy: 0.49 },
  "Wind & Ocean Energy":         { cx: 0.70, cy: 0.49 },
  "Energy Storage Systems":      { cx: 0.66, cy: 0.45 },
  // Biotechnology
  "Gene Editing":                { cx: 0.14, cy: 0.76 },
  "Drug Discovery":              { cx: 0.21, cy: 0.76 },
  "Synthetic Biology":           { cx: 0.14, cy: 0.83 },
  "Diagnostics & Imaging":       { cx: 0.21, cy: 0.83 },
  // Healthcare
  "Medical Devices":             { cx: 0.40, cy: 0.76 },
  "Digital Health Platforms":    { cx: 0.47, cy: 0.76 },
  "Digital Health":              { cx: 0.47, cy: 0.76 },
  "Surgical Robotics":           { cx: 0.40, cy: 0.83 },
  "Neurotechnology":             { cx: 0.40, cy: 0.83 },
  "Precision Medicine":          { cx: 0.47, cy: 0.83 },
  // Legacy fallbacks
  "Biotech":                     { cx: 0.17, cy: 0.79 },
  "Semiconductors":              { cx: 0.39, cy: 0.15 },
  "Robotics":                    { cx: 0.14, cy: 0.47 },
  "Telecommunications":          { cx: 0.65, cy: 0.15 },
  "Clean Energy":                { cx: 0.66, cy: 0.45 },
  "Speech Recognition":          { cx: 0.12, cy: 0.17 },
  "Other":                       { cx: 0.50, cy: 0.60 },
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
  const r = hashFloat(patentId + "_r") * 0.18; // very wide spread for heavy cluster overlap
  return {
    x: center.cx + r * Math.cos(angle),
    y: center.cy + r * Math.sin(angle),
  };
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
