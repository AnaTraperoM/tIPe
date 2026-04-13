import type { SearchRequest, Patent } from "./types";
import { computeCoordinates } from "./embeddings";

export function isBigQueryConfigured(): boolean {
  return !!(
    process.env.BIGQUERY_PROJECT_ID &&
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.BIGQUERY_CREDENTIALS_JSON)
  );
}

// IPC section → category name mapping
const IPC_TO_CATEGORY: Record<string, string> = {
  G06N: "Machine Learning",
  G06F: "Machine Learning",
  C12N: "Biotech",
  C07K: "Biotech",
  A61K: "Biotech",
  H01L: "Semiconductors",
  H01S: "Semiconductors",
  B25J: "Robotics",
  G05B: "Robotics",
  H04L: "Telecommunications",
  H04W: "Telecommunications",
  H04B: "Telecommunications",
  F03D: "Clean Energy",
  H02S: "Clean Energy",
  F24S: "Clean Energy",
};

function ipcToCategory(ipc: string): string {
  const prefix = ipc.slice(0, 4);
  return IPC_TO_CATEGORY[prefix] ?? "Other";
}

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
    FROM \`bigquery-public-data.google_patents_public_data.publications\`
    WHERE
      country_code = 'US'
      AND (SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1) IS NOT NULL
      AND LOWER((SELECT t.text FROM UNNEST(title_localized) t WHERE t.language = 'en' LIMIT 1))
          LIKE CONCAT('%', LOWER(@query), '%')
      AND CAST(SUBSTR(CAST(filing_date AS STRING), 1, 4) AS INT64) BETWEEN @yearFrom AND @yearTo
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
      abstract: (row.abstract as string) ?? undefined,
      assignee: (row.assignee as string) ?? undefined,
      ipcCodes: ipc ? [ipc] : [],
      citationCount: (row.citation_count as number) ?? 0,
      ...coords,
    } satisfies Patent;
  });
}

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
      ARRAY(SELECT c.publication_number FROM UNNEST(citation) c LIMIT 10) AS citations
    FROM \`bigquery-public-data.google_patents_public_data.publications\`
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
    abstract: (row.abstract as string) ?? undefined,
    assignee: (row.assignee as string) ?? undefined,
    ipcCodes: ipc ? [ipc] : [],
    citations: (row.citations as string[]) ?? [],
    ...coords,
  };
}
