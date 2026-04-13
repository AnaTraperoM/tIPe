export interface Patent {
  id: string;
  title: string;
  year: number;
  category: string;
  x: number;
  y: number;
  abstract?: string;
  inventors?: string[];
  assignee?: string;
  ipcCodes?: string[];
  citationCount?: number;
  citations?: string[];
}

export interface CitationLink {
  source: string;
  target: string;
}

export interface CitationGraph {
  nodes: Patent[];
  links: CitationLink[];
}

export interface TranslationResult {
  patentId: string;
  summary: string;
  keyInnovation: string;
  practicalUse: string;
  technicalFields: string[];
}

export interface ComparisonRow {
  dimension: string;
  values: string[];
}

export interface ComparisonResult {
  patents: string[];
  summary: string;
  similarities: string[];
  differences: string[];
  noveltyAssessment: string;
  tableRows: ComparisonRow[];
}

export interface UploadAnalysisResult {
  extractedText: string;
  placementCoords: { x: number; y: number };
  relatedPatents: Patent[];
  aiSummary: string;
  detectedCategory: string;
  spaceSummary?: string;
  mainClaims?: string[];
  inputType: "file" | "idea";
}

export interface SearchRequest {
  query: string;
  yearFrom?: number;
  yearTo?: number;
  ipcCodes?: string[];
  limit?: number;
}

export interface QueryInterpretation {
  correctedQuery: string;
  explanation: string;
  suggestedCategories: string[];
  keywords: string[];
}

export interface SearchResponse {
  patents: Patent[];
  total: number;
  mock: boolean;
  queryInterpretation?: QueryInterpretation;
}

export interface GroupSummaryResult {
  count: number;
  categories: string[];
  yearRange: [number, number];
  summary: string;
  themes: string[];
  technologicalTrends: string[];
  keyPlayers: string[];
  innovationInsights: string;
  temporalAnalysis: string;
}

export interface ConceptSearchResult {
  matchingIds: string[];
  explanation: string;
  suggestedCategories: string[];
  keywords: string[];
}

export interface HistoryEntry {
  id: string;
  type: "search" | "view" | "compare" | "upload" | "group_select";
  label: string;
  timestamp: Date;
  patentId?: string;
}
