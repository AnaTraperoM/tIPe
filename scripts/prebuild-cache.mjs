/**
 * Pre-generate patent cache at build time.
 * Runs before `next build` so the cache file ships with the deployment.
 * Skips if cache already exists and is fresh (< 7 days).
 */
import { BigQuery } from "@google-cloud/bigquery";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, "..", "data", "patents-cache.json");
const LIMIT = 10000;

// IPC → category mapping (mirrors app/lib/bigquery.ts)
const IPC_TO_CATEGORY = {
  G06N: "Machine Learning", G06F: "Natural Language Processing", G10L: "Speech Recognition",
  G06V: "Computer Vision", G06T: "Computer Vision", C12N: "Gene Editing",
  C12Q: "Diagnostics & Imaging", A61K: "Drug Discovery", C07K: "Synthetic Biology",
  C12P: "Synthetic Biology", H01L: "Processor Architecture", H10B: "Memory & Storage",
  H10N: "Memory & Storage", G11C: "Memory & Storage", H01S: "Photonics & Optics",
  G02B: "Photonics & Optics", H05K: "Advanced Packaging", B25J: "Industrial Automation",
  G05B: "Industrial Automation", G05D: "Autonomous Vehicles", B64C: "Drone Technology",
  B64U: "Drone Technology", H04L: "Network Architecture", H04W: "5G & Beyond",
  H04B: "Satellite Communications", H04N: "IoT & Edge Computing", H02S: "Solar Technology",
  H01M: "Battery Technology", F03D: "Wind Energy", C25B: "Hydrogen & Fuel Cells",
  H02J: "Energy Storage Systems", A61B: "Medical Devices", G16H: "Digital Health Platforms",
  A61N: "Surgical Robotics", B33Y: "3D Printing & Additive", B22F: "3D Printing & Additive",
  G01N: "Smart Materials", B29C: "Advanced Manufacturing",
};

function isCacheFresh() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return false;
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw);
    const age = Date.now() - new Date(data.cachedAt).getTime();
    return age < 7 * 24 * 60 * 60 * 1000 && data.patents?.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  if (isCacheFresh()) {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    console.log(`[prebuild] Cache is fresh (${raw.patents.length} patents), skipping BigQuery fetch`);
    return;
  }

  if (!process.env.BIGQUERY_PROJECT_ID) {
    console.warn("[prebuild] BIGQUERY_PROJECT_ID not set, skipping cache generation");
    return;
  }

  // Support credentials from env var (Vercel) or file
  let credentials;
  if (process.env.BIGQUERY_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS_JSON);
  }

  const bq = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    ...(credentials ? { credentials } : {}),
  });

  const ipcPrefixes = Object.keys(IPC_TO_CATEGORY);
  const perCategory = Math.ceil(LIMIT / ipcPrefixes.length);

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

  console.log(`[prebuild] Fetching ~${LIMIT} patents from BigQuery...`);

  const [rows] = await bq.query({
    query,
    params: { ipcPrefixes, perCategory },
    location: "US",
  });

  // Simple deterministic coordinate generation (mirrors computeCoordinates)
  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  const SECTION_MAP = {
    G06: "Machine Learning", C12: "Biotech", A61: "Medical Devices",
    H01: "Semiconductors", H04: "Telecommunications", F03: "Clean Energy",
    B25: "Industrial Automation", B64: "Drone Technology",
  };

  function ipcToCategory(ipc) {
    if (!ipc) return "Other";
    if (IPC_TO_CATEGORY[ipc.slice(0, 4)]) return IPC_TO_CATEGORY[ipc.slice(0, 4)];
    return SECTION_MAP[ipc.slice(0, 3)] ?? "Other";
  }

  const patents = rows.map((row) => {
    const ipc = row.primary_ipc ?? "";
    const category = ipcToCategory(ipc);
    const id = row.publication_number;
    const h = hashCode(id);
    const x = ((h & 0xffff) / 0xffff) * 100;
    const y = (((h >> 16) & 0xffff) / 0xffff) * 100;
    return {
      id,
      title: row.title ?? "Untitled",
      year: row.year ?? 2000,
      category,
      abstract: (row.abstract ?? "").slice(0, 500),
      assignee: row.assignee ?? undefined,
      ipcCodes: ipc ? [ipc] : [],
      citationCount: row.citation_count ?? 0,
      x, y,
    };
  });

  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify({ patents, cachedAt: new Date().toISOString() }));

  console.log(`[prebuild] Cached ${patents.length} patents to ${CACHE_PATH}`);
}

main().catch((err) => {
  console.error("[prebuild] Failed:", err.message);
  // Don't fail the build if cache generation fails — app will work without cache
  process.exit(0);
});
