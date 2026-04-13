import type { SearchRequest, Patent } from "./types";
import { computeCoordinates } from "./embeddings";
import * as fs from "fs";
import * as path from "path";

export function isBigQueryConfigured(): boolean {
  return !!(
    process.env.BIGQUERY_PROJECT_ID &&
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.BIGQUERY_CREDENTIALS_JSON)
  );
}

function createBigQueryClient() {
  const opts: Record<string, unknown> = { projectId: process.env.BIGQUERY_PROJECT_ID };
  if (process.env.BIGQUERY_CREDENTIALS_JSON) {
    opts.credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS_JSON);
  }
  return import("@google-cloud/bigquery").then(m => new m.BigQuery(opts));
}

// ─── IPC / CPC → L2 category mapping ────────────────────────────────────────
// Maps 4-char IPC section codes to the 32 subcategories used in tIPe
const IPC_TO_CATEGORY: Record<string, string> = {
  // AI & Machine Learning
  G06N: "Machine Learning",
  G06F: "Natural Language Processing",
  G10L: "Speech Recognition",
  G06V: "Computer Vision",
  G06T: "Computer Vision",
  // Biotechnology
  C12N: "Gene Editing",
  C12Q: "Diagnostics & Imaging",
  A61K: "Drug Discovery",
  C07K: "Synthetic Biology",
  C12P: "Synthetic Biology",
  // Semiconductors
  H01L: "Processor Architecture",
  H10B: "Memory & Storage",
  H10N: "Memory & Storage",
  G11C: "Memory & Storage",
  H01S: "Photonics & Optics",
  G02B: "Photonics & Optics",
  H05K: "Advanced Packaging",
  // Robotics & Automation
  B25J: "Industrial Automation",
  G05B: "Industrial Automation",
  G05D: "Autonomous Vehicles",
  B64C: "Drone Technology",
  B64U: "Drone Technology",
  // Telecommunications
  H04L: "Network Architecture",
  H04W: "5G & Beyond",
  H04B: "Satellite Communications",
  H04N: "IoT & Edge Computing",
  // Clean Energy
  H02S: "Solar Technology",
  H01M: "Battery Technology",
  F03D: "Wind Energy",
  C25B: "Hydrogen & Fuel Cells",
  H02J: "Energy Storage Systems",
  // Healthcare Technology
  A61B: "Medical Devices",
  G16H: "Digital Health Platforms",
  A61N: "Surgical Robotics",
  // Advanced Manufacturing
  B33Y: "3D Printing & Additive",
  B22F: "3D Printing & Additive",
  G01N: "Smart Materials",
  B29C: "Advanced Manufacturing",
};

function ipcToCategory(ipc: string): string {
  if (!ipc) return "Other";
  const prefix4 = ipc.slice(0, 4);
  if (IPC_TO_CATEGORY[prefix4]) return IPC_TO_CATEGORY[prefix4];
  const prefix3 = ipc.slice(0, 3);
  // Fallback to broad section
  const SECTION_MAP: Record<string, string> = {
    G06: "Machine Learning",
    C12: "Biotech",
    A61: "Medical Devices",
    H01: "Semiconductors",
    H04: "Telecommunications",
    F03: "Clean Energy",
    B25: "Industrial Automation",
    B64: "Drone Technology",
  };
  return SECTION_MAP[prefix3] ?? "Other";
}

// ─── JSON file cache ─────────────────────────────────────────────────────────
const CACHE_PATH = path.join(process.cwd(), "data", "patents-cache.json");

function readCache(): Patent[] | null {
  try {
    if (!fs.existsSync(CACHE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw) as { patents: Patent[]; cachedAt: string };
    // Skip expiry check — committed cache is the primary data source
    // and can only be refreshed by running prebuild locally
    // Recompute coordinates from current cluster layout (cache may have stale positions)
    return data.patents.map(p => {
      const coords = computeCoordinates(p.category, p.id);
      return { ...p, x: coords.x, y: coords.y };
    });
  } catch {
    return null;
  }
}

function writeCache(patents: Patent[]): void {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ patents, cachedAt: new Date().toISOString() }));
  } catch (err) {
    console.error("[bigquery] Failed to write cache:", err);
  }
}

// ─── Initial patent load ─────────────────────────────────────────────────────
// Loads a diverse set of patents across technology categories
export async function loadInitialPatents(limit: number = 3000): Promise<Patent[]> {
  // Try cache first
  const cached = readCache();
  if (cached && cached.length > 0) {
    console.log(`[bigquery] Loaded ${cached.length} patents from cache`);
    return cached;
  }

  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID });

  // Query a diverse sample across IPC sections relevant to our categories
  const ipcPrefixes = Object.keys(IPC_TO_CATEGORY);
  const perCategory = Math.ceil(limit / ipcPrefixes.length);

  const query = `
    WITH ranked AS (
      SELECT
        publication_number,
        (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) AS title,
        (SELECT a.text FROM UNNEST(abstract_localized) a WHERE a.language = 'en' LIMIT 1) AS abstract,
        CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) AS year,
        (SELECT h.name FROM UNNEST(assignee_harmonized) h LIMIT 1) AS assignee,
        (SELECT i.code FROM UNNEST(ipc) i LIMIT 1) AS primary_ipc,
        (SELECT COUNT(*) FROM UNNEST(citation)) AS citation_count,
        ROW_NUMBER() OVER (
          PARTITION BY SUBSTR((SELECT i.code FROM UNNEST(ipc) i LIMIT 1), 1, 4)
          ORDER BY (SELECT COUNT(*) FROM UNNEST(citation)) DESC
        ) AS rn
      FROM \`patents-public-data.patents.publications\`
      WHERE
        country_code = 'US'
        AND SUBSTR((SELECT i.code FROM UNNEST(ipc) i LIMIT 1), 1, 4) IN UNNEST(@ipcPrefixes)
        AND (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) IS NOT NULL
        AND CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) BETWEEN 2000 AND 2024
    )
    SELECT * FROM ranked
    WHERE rn <= @perCategory
    ORDER BY primary_ipc, citation_count DESC
  `;

  console.log(`[bigquery] Fetching ~${limit} patents across ${ipcPrefixes.length} IPC categories...`);

  const [rows] = await bq.query({
    query,
    params: { ipcPrefixes, perCategory },
    location: "US",
  });

  const patents: Patent[] = rows.map((row: Record<string, unknown>) => {
    const ipc = (row.primary_ipc as string) ?? "";
    const category = ipcToCategory(ipc);
    const id = row.publication_number as string;
    const coords = computeCoordinates(category, id);
    return {
      id,
      title: (row.title as string) ?? "Untitled",
      year: (row.year as number) ?? 2000,
      category,
      abstract: ((row.abstract as string) ?? "").slice(0, 500),
      assignee: (row.assignee as string) ?? undefined,
      ipcCodes: ipc ? [ipc] : [],
      citationCount: (row.citation_count as number) ?? 0,
      ...coords,
    };
  });

  console.log(`[bigquery] Fetched ${patents.length} patents, caching to disk`);
  writeCache(patents);
  return patents;
}

// ─── Local cache search (zero BigQuery cost) ────────────────────────────────
export function searchCachedPatents(query: string, limit: number = 200): Patent[] {
  const cached = readCache();
  if (!cached || cached.length === 0) return [];

  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (keywords.length === 0) return cached.slice(0, limit);

  // Score each patent by keyword matches in title + abstract
  const scored = cached.map(p => {
    const text = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
    const hits = keywords.filter(kw => text.includes(kw)).length;
    return { patent: p, score: hits };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.patent.citationCount ?? 0) - (a.patent.citationCount ?? 0))
    .slice(0, limit)
    .map(s => s.patent);
}

// ─── Search ──────────────────────────────────────────────────────────────────
export async function searchPatents(req: SearchRequest): Promise<Patent[]> {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID });

  const yearFrom = req.yearFrom ?? 2000;
  const yearTo = req.yearTo ?? 2024;
  const limit = req.limit ?? 200;

  const query = `
    SELECT
      publication_number,
      (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) AS title,
      (SELECT a.text FROM UNNEST(abstract_localized) a WHERE a.language = 'en' LIMIT 1) AS abstract,
      CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) AS year,
      (SELECT h.name FROM UNNEST(assignee_harmonized) h LIMIT 1) AS assignee,
      (SELECT i.code FROM UNNEST(ipc) i LIMIT 1) AS primary_ipc,
      (SELECT COUNT(*) FROM UNNEST(citation)) AS citation_count
    FROM \`patents-public-data.patents.publications\`
    WHERE
      country_code = 'US'
      AND (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) IS NOT NULL
      AND LOWER((SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1))
          LIKE CONCAT('%', LOWER(@query), '%')
      AND CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) BETWEEN @yearFrom AND @yearTo
    ORDER BY (SELECT COUNT(*) FROM UNNEST(citation)) DESC
    LIMIT @limit
  `;

  const [rows] = await bq.query({
    query,
    params: { query: req.query, yearFrom, yearTo, limit },
    location: "US",
  });

  return rows.map((row: Record<string, unknown>) => {
    const ipc = (row.primary_ipc as string) ?? "";
    const category = ipcToCategory(ipc);
    const id = row.publication_number as string;
    const coords = computeCoordinates(category, id);
    return {
      id,
      title: (row.title as string) ?? "Untitled",
      year: (row.year as number) ?? 2000,
      category,
      abstract: ((row.abstract as string) ?? "").slice(0, 500),
      assignee: (row.assignee as string) ?? undefined,
      ipcCodes: ipc ? [ipc] : [],
      citationCount: (row.citation_count as number) ?? 0,
      ...coords,
    } satisfies Patent;
  });
}

// ─── Get by ID ───────────────────────────────────────────────────────────────
export async function getPatentById(id: string): Promise<Patent | null> {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID });

  const query = `
    SELECT
      publication_number,
      (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) AS title,
      (SELECT a.text FROM UNNEST(abstract_localized) a WHERE a.language = 'en' LIMIT 1) AS abstract,
      CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) AS year,
      (SELECT h.name FROM UNNEST(assignee_harmonized) h LIMIT 1) AS assignee,
      (SELECT i.code FROM UNNEST(ipc) i LIMIT 1) AS primary_ipc,
      ARRAY(SELECT c.publication_number FROM UNNEST(citation) c LIMIT 10) AS citations,
      (SELECT COUNT(*) FROM UNNEST(citation)) AS citation_count
    FROM \`patents-public-data.patents.publications\`
    WHERE publication_number = @id
    LIMIT 1
  `;

  const [rows] = await bq.query({ query, params: { id }, location: "US" });
  if (!rows.length) return null;

  const row = rows[0] as Record<string, unknown>;
  const ipc = (row.primary_ipc as string) ?? "";
  const category = ipcToCategory(ipc);
  const coords = computeCoordinates(category, id);

  return {
    id,
    title: (row.title as string) ?? "Untitled",
    year: (row.year as number) ?? 2000,
    category,
    abstract: ((row.abstract as string) ?? "").slice(0, 500),
    assignee: (row.assignee as string) ?? undefined,
    ipcCodes: ipc ? [ipc] : [],
    citations: (row.citations as string[]) ?? [],
    citationCount: (row.citation_count as number) ?? 0,
    ...coords,
  };
}

// ─── Vector search (semantic similarity via research table embeddings) ────────
// 1. Find a seed patent matching the idea text via keyword search
// 2. Use that patent's embedding_v1 to VECTOR_SEARCH for similar patents
export async function vectorSearchByText(
  text: string,
  topK: number = 10,
): Promise<Patent[]> {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID });

  // Extract meaningful keywords (3+ chars, deduplicated, max 8)
  const stopWords = new Set(["the", "and", "for", "that", "with", "this", "from", "are", "was", "were", "been", "have", "has", "had", "not", "but", "what", "all", "can", "her", "his", "one", "our", "out", "you", "use", "using", "based", "method", "system", "device", "apparatus"]);
  const keywords = [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w))
  )].slice(0, 8);

  if (keywords.length === 0) return [];

  // Build search conditions from keywords
  const keywordConditions = keywords
    .map((_, i) => `LOWER(r.title) LIKE CONCAT('%', @kw${i}, '%') OR LOWER(r.abstract) LIKE CONCAT('%', @kw${i}, '%')`)
    .join(" OR ");

  const keywordParams: Record<string, string> = {};
  keywords.forEach((kw, i) => { keywordParams[`kw${i}`] = kw; });

  console.log(`[bigquery] Vector search for: "${text.slice(0, 80)}..." with keywords: [${keywords.join(", ")}]`);

  // Step 1+2 combined: find seed patent and vector search in one query
  const query = `
    WITH seed AS (
      SELECT r.publication_number, r.embedding_v1
      FROM \`patents-public-data.google_patents_research.publications\` r
      WHERE
        r.country = 'US'
        AND ARRAY_LENGTH(r.embedding_v1) > 0
        AND (${keywordConditions})
      LIMIT 1
    ),
    candidate_pool AS (
      SELECT publication_number, title, abstract_translated, country, embedding_v1
      FROM \`patents-public-data.google_patents_research.publications\`
      WHERE country = 'US' AND ARRAY_LENGTH(embedding_v1) > 0
      LIMIT 10000
    ),
    similar AS (
      SELECT
        base.publication_number,
        base.title,
        base.abstract_translated,
        base.country,
        distance
      FROM VECTOR_SEARCH(
        TABLE candidate_pool,
        'embedding_v1',
        (SELECT embedding_v1 FROM seed),
        top_k => @topK,
        distance_type => 'COSINE'
      )
    )
    SELECT
      s.publication_number,
      s.title,
      s.abstract_translated AS abstract,
      s.distance
    FROM similar s
    ORDER BY s.distance ASC
  `;

  const [rows] = await bq.query({
    query,
    params: { ...keywordParams, topK },
    location: "US",
  });

  console.log(`[bigquery] Vector search returned ${rows.length} patents`);

  return rows.map((row: Record<string, unknown>) => {
    const id = row.publication_number as string;
    const category = "Other";
    const coords = computeCoordinates(category, id);
    return {
      id,
      title: (row.title as string) ?? "Untitled",
      year: 2000,
      category,
      abstract: ((row.abstract as string) ?? "").slice(0, 500),
      ipcCodes: [],
      citationCount: 0,
      ...coords,
    } satisfies Patent;
  });
}

// ─── Keyword search via research table (no vector, faster) ───────────────────
export async function keywordSearchPatents(
  text: string,
  limit: number = 50,
): Promise<Patent[]> {
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID });

  const keywords = [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3)
  )].slice(0, 6);

  if (keywords.length === 0) return [];

  const conditions = keywords
    .map((_, i) => `(LOWER(title) LIKE CONCAT('%', @kw${i}, '%') OR LOWER(abstract_translated) LIKE CONCAT('%', @kw${i}, '%'))`)
    .join(" OR ");

  const params: Record<string, string | number> = { limit };
  keywords.forEach((kw, i) => { params[`kw${i}`] = kw; });

  const query = `
    SELECT
      publication_number,
      title,
      abstract_translated AS abstract
    FROM \`patents-public-data.google_patents_research.publications\`
    WHERE
      country = 'US'
      AND (${conditions})
    LIMIT @limit
  `;

  const [rows] = await bq.query({ query, params, location: "US" });

  return rows.map((row: Record<string, unknown>) => {
    const id = row.publication_number as string;
    const category = "Other";
    const coords = computeCoordinates(category, id);
    return {
      id,
      title: (row.title as string) ?? "Untitled",
      year: 2000,
      category,
      abstract: ((row.abstract as string) ?? "").slice(0, 500),
      ipcCodes: [],
      citationCount: 0,
      ...coords,
    } satisfies Patent;
  });
}
