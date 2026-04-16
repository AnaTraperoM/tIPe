import Anthropic from "@anthropic-ai/sdk";
import type { Patent, TranslationResult, ComparisonResult, UploadAnalysisResult, GroupSummaryResult, FTOReport, PlugCreateResult } from "./types";
import { computeUploadCoordinates } from "./embeddings";

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

// ─── Helper: keyword extraction from text ───────────────────────────────────
function extractKeywords(text: string): string[] {
  const stops = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","that","this","these","those","it","its","not","no","nor","as","such","than","also","each","which","their","them","they","there","then","so","if","when","what","how","all","any","both","other","into","through","during","before","after","above","below","between","about","up","out","over","under","more","most","some","one","two","first","second","new","used","use","using","based","method","system","device","apparatus","comprising","includes","including","according","wherein","configured"]);
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stops.has(w));
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
}

// ─── Helper: find patents matching keywords ─────────────────────────────────
function findMatchingPatents(keywords: string[], allPatents: Patent[], limit: number): Patent[] {
  const scored = allPatents.map(p => {
    const haystack = `${p.title} ${p.abstract ?? ""} ${p.category}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score += 1;
      if (p.title.toLowerCase().includes(kw)) score += 2; // title matches are stronger
    }
    return { patent: p, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.patent);
}

/** Weighted variant: primary keywords (from the user's text) score 3x more than
 *  secondary keywords (from Claude's semantic expansion). This ensures exact
 *  matches still rank highest while the expanded terms cast a wider net. */
function findMatchingPatentsWeighted(
  primary: string[],
  secondary: string[],
  allPatents: Patent[],
  limit: number,
): Patent[] {
  const scored = allPatents.map(p => {
    const titleLower = p.title.toLowerCase();
    const haystack = `${titleLower} ${(p.abstract ?? "").toLowerCase()} ${p.category.toLowerCase()}`;
    let score = 0;
    for (const kw of primary) {
      if (titleLower.includes(kw)) score += 6;   // primary + title
      else if (haystack.includes(kw)) score += 3; // primary + abstract/category
    }
    for (const kw of secondary) {
      if (titleLower.includes(kw)) score += 2;   // secondary + title
      else if (haystack.includes(kw)) score += 1; // secondary + abstract/category
    }
    return { patent: p, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.patent);
}

// ─── Helper: guess category from text ───────────────────────────────────────
function guessCategory(text: string, allPatents: Patent[]): string {
  const lower = text.toLowerCase();
  const categoryScores: Record<string, number> = {};
  const categories = [...new Set(allPatents.map(p => p.category))];

  for (const cat of categories) {
    const catWords = cat.toLowerCase().split(/[\s&]+/).filter(w => w.length > 2);
    let score = 0;
    for (const w of catWords) {
      if (lower.includes(w)) score += 3;
    }
    // Also check how many patents in this category match the text keywords
    const kws = extractKeywords(text).slice(0, 6);
    const catPatents = allPatents.filter(p => p.category === cat);
    for (const p of catPatents.slice(0, 30)) {
      const haystack = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
      for (const kw of kws) {
        if (haystack.includes(kw)) score += 0.1;
      }
    }
    if (score > 0) categoryScores[cat] = score;
  }

  const best = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : categories[0] ?? "Other";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC KEYWORD EXPANSION
// ═══════════════════════════════════════════════════════════════════════════════

/** Use Claude Haiku to expand an idea into a comprehensive set of search terms.
 *  Returns both the original extracted keywords (primary) and Claude-generated
 *  expansion terms (secondary) so callers can weight them differently. */
export async function expandIdeaTerms(
  ideaText: string,
  availableCategories: string[],
): Promise<{ primary: string[]; secondary: string[]; suggestedCategories: string[] }> {
  const primary = extractKeywords(ideaText);
  const localCategories = availableCategories.filter(cat => {
    const catLower = cat.toLowerCase();
    return primary.some(kw => catLower.includes(kw));
  }).slice(0, 6);

  const fallback = { primary, secondary: [] as string[], suggestedCategories: localCategories };

  if (!isAnthropicConfigured()) return fallback;

  const prompt = `You are a patent search expert. Given an innovation idea, generate a COMPREHENSIVE list of search terms that would find ALL semantically related patents — not just exact matches, but synonyms, related techniques, component technologies, and alternative approaches to the same problem.

Think about:
- Direct synonyms and alternative phrasings
- Component technologies and sub-systems
- Adjacent fields that use similar techniques
- Problem-domain keywords (what problem does this solve?)
- Implementation-level technical terms
- Industry-standard terminology for these concepts

Idea:
"${ideaText.slice(0, 3000)}"

Available technology categories:
${availableCategories.map(c => `- ${c}`).join("\n")}

Respond with valid JSON only (no markdown fences):
{
  "keywords": ["<25-40 search terms — mix of specific technical terms, broader concepts, synonyms, and related techniques>"],
  "suggestedCategories": ["<1-6 most relevant categories from the list>"]
}`;

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = parseJSON(text, null);

    if (parsed && typeof parsed === "object") {
      const p = parsed as Record<string, unknown>;
      const expanded = ((p.keywords as string[]) ?? []).map(k => k.toLowerCase());
      // Remove duplicates with primary keywords
      const primarySet = new Set(primary);
      const secondary = [...new Set(expanded)].filter(k => !primarySet.has(k));
      return {
        primary,
        secondary,
        suggestedCategories: (p.suggestedCategories as string[]) ?? localCategories,
      };
    }
  } catch (err) {
    console.error("[expandIdeaTerms] Haiku expansion failed, using local keywords:", err);
  }

  return fallback;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATE PATENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function translatePatent(patent: Patent): Promise<TranslationResult> {
  if (!isAnthropicConfigured()) {
    return buildLocalTranslation(patent);
  }

  const prompt = `You are a patent analyst explaining inventions in plain English.
Given the patent below, respond with valid JSON only (no markdown fences):
{
  "summary": "<2-3 sentence plain English explanation>",
  "keyInnovation": "<one sentence: what is specifically new>",
  "practicalUse": "<one sentence: real-world application>",
  "technicalFields": ["<field1>", "<field2>"]
}

Patent ID: ${patent.id}
Title: ${patent.title}
Year: ${patent.year}
${patent.assignee ? `Assignee: ${patent.assignee}` : ""}
Abstract: ${patent.abstract ?? "Not available"}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    return {
      patentId: patent.id,
      summary: (parsed as Record<string, unknown>).summary as string ?? "",
      keyInnovation: (parsed as Record<string, unknown>).keyInnovation as string ?? "",
      practicalUse: (parsed as Record<string, unknown>).practicalUse as string ?? "",
      technicalFields: (parsed as Record<string, unknown>).technicalFields as string[] ?? [patent.category],
    };
  }

  return {
    patentId: patent.id,
    summary: text.slice(0, 300),
    keyInnovation: "",
    practicalUse: "",
    technicalFields: [patent.category],
  };
}

function buildLocalTranslation(patent: Patent): TranslationResult {
  const abs = patent.abstract ?? "";
  // Extract first 2 sentences as summary
  const sentences = abs.split(/\.\s+/).filter(s => s.length > 10);
  const summary = sentences.length > 0
    ? sentences.slice(0, 2).join(". ") + "."
    : `This patent from ${patent.assignee ?? "an unknown assignee"} describes technology related to ${patent.category.toLowerCase()}.`;

  // Extract key innovation from title
  const keyInnovation = `The invention introduces ${patent.title.toLowerCase()}, a novel approach in the ${patent.category.toLowerCase()} domain.`;

  // Practical use from category
  const practicalUse = `This technology can be applied in ${patent.category.toLowerCase()} applications, potentially benefiting industries that rely on advancements in this field.`;

  // Technical fields from IPC codes + category
  const fields: string[] = [patent.category];
  if (patent.ipcCodes?.length) {
    const ipcDescriptions: Record<string, string> = {
      A: "Human Necessities", B: "Operations & Transport", C: "Chemistry & Metallurgy",
      D: "Textiles & Paper", E: "Fixed Constructions", F: "Mechanical Engineering",
      G: "Physics & Instruments", H: "Electricity",
    };
    const ipcLetter = patent.ipcCodes[0]?.[0];
    if (ipcLetter && ipcDescriptions[ipcLetter]) fields.push(ipcDescriptions[ipcLetter]);
  }

  return { patentId: patent.id, summary, keyInnovation, practicalUse, technicalFields: fields };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARE PATENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function comparePatents(patents: Patent[]): Promise<ComparisonResult> {
  if (!isAnthropicConfigured()) {
    return buildLocalComparison(patents);
  }

  const patentList = patents
    .map((p, i) => `[${i + 1}] ${p.id}: ${p.title} (${p.year})\nAssignee: ${p.assignee ?? "Unknown"}\nAbstract: ${p.abstract ?? "N/A"}`)
    .join("\n\n");

  const prompt = `You are a patent analyst performing structured comparison.
Compare the following ${patents.length} patents and respond with valid JSON only (no markdown fences):
{
  "summary": "<overall comparison in 2-3 sentences>",
  "similarities": ["<point1>", "<point2>"],
  "differences": ["<point1>", "<point2>"],
  "noveltyAssessment": "<paragraph assessing the novelty of each>",
  "tableRows": [
    { "dimension": "Filing Year", "values": ["<val1>", "<val2>"] },
    { "dimension": "Core Technology", "values": ["<val1>", "<val2>"] },
    { "dimension": "Primary Claim", "values": ["<val1>", "<val2>"] },
    { "dimension": "Assignee", "values": ["<val1>", "<val2>"] }
  ]
}

Patents:
${patentList}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      patents: patents.map(p => p.id),
      summary: p.summary as string ?? "",
      similarities: p.similarities as string[] ?? [],
      differences: p.differences as string[] ?? [],
      noveltyAssessment: p.noveltyAssessment as string ?? "",
      tableRows: p.tableRows as ComparisonResult["tableRows"] ?? [],
    };
  }

  return buildLocalComparison(patents);
}

function buildLocalComparison(patents: Patent[]): ComparisonResult {
  const categories = [...new Set(patents.map(p => p.category))];
  const assignees = [...new Set(patents.map(p => p.assignee ?? "Unknown"))];
  const years = patents.map(p => p.year);
  const sameCategory = categories.length === 1;
  const sameAssignee = assignees.length === 1;

  const similarities: string[] = [];
  const differences: string[] = [];

  if (sameCategory) similarities.push(`All patents belong to the ${categories[0]} technology domain`);
  else differences.push(`Patents span ${categories.length} different domains: ${categories.join(", ")}`);

  if (sameAssignee) similarities.push(`All patents are owned by ${assignees[0]}`);
  else differences.push(`Patents come from different assignees: ${assignees.join(", ")}`);

  const yearSpread = Math.max(...years) - Math.min(...years);
  if (yearSpread <= 2) similarities.push(`All patents were granted within a ${yearSpread + 1}-year window (${Math.min(...years)}–${Math.max(...years)})`);
  else differences.push(`Patents span ${yearSpread + 1} years from ${Math.min(...years)} to ${Math.max(...years)}`);

  // Check IPC overlap
  const allIpc = patents.flatMap(p => p.ipcCodes ?? []);
  const ipcOverlap = allIpc.filter((v, i, a) => a.indexOf(v) !== i);
  if (ipcOverlap.length > 0) similarities.push(`Share IPC classification codes: ${[...new Set(ipcOverlap)].join(", ")}`);
  else if (allIpc.length > 0) differences.push("Patents have distinct IPC classification codes");

  const avgCitations = Math.round(patents.reduce((s, p) => s + (p.citationCount ?? 0), 0) / patents.length);

  return {
    patents: patents.map(p => p.id),
    summary: `Comparison of ${patents.length} patents${sameCategory ? ` in ${categories[0]}` : ` across ${categories.length} domains`}. Average citation count is ${avgCitations}, with grant years ranging from ${Math.min(...years)} to ${Math.max(...years)}.`,
    similarities,
    differences,
    noveltyAssessment: `These ${patents.length} patents ${sameCategory ? "operate in the same technology space" : "span multiple technology domains"}, ${sameAssignee ? "all from " + assignees[0] : "from " + assignees.length + " different assignees"}. ${yearSpread > 5 ? "The wide time range suggests an evolving technology area." : "The close filing dates suggest competitive activity in this space."}`,
    tableRows: [
      { dimension: "Grant Year", values: patents.map(p => String(p.year)) },
      { dimension: "Category", values: patents.map(p => p.category) },
      { dimension: "Assignee", values: patents.map(p => p.assignee ?? "Unknown") },
      { dimension: "Citations", values: patents.map(p => String(p.citationCount ?? 0)) },
      { dimension: "IPC Codes", values: patents.map(p => (p.ipcCodes ?? []).join(", ") || "—") },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYZE UPLOADED DOCUMENT / IDEA
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeUploadedDocument(
  text: string,
  allPatents: Patent[],
  radius: number = 10,
): Promise<{
  category: string;
  relatedPatentIds: string[];
  summary: string;
  placementCoords: { x: number; y: number };
  spaceSummary: string;
  mainClaims: string[];
}> {
  if (!isAnthropicConfigured()) {
    return buildLocalUploadAnalysis(text, allPatents, radius);
  }

  // Semantic expansion: use Haiku to generate comprehensive search terms before matching
  const availableCategories = [...new Set(allPatents.map(p => p.category))];
  const { primary, secondary, suggestedCategories } = await expandIdeaTerms(text, availableCategories);
  const relevantForUpload = findMatchingPatentsWeighted(primary, secondary, allPatents, 80);

  // Pad with category matches if not enough keyword hits
  if (relevantForUpload.length < 40) {
    const cat = suggestedCategories[0] ?? guessCategory(text, allPatents);
    const catPatents = allPatents.filter(p => p.category === cat && !relevantForUpload.some(r => r.id === p.id));
    relevantForUpload.push(...catPatents.slice(0, 40 - relevantForUpload.length));
  }

  const patentSamples = relevantForUpload
    .map(p => `${p.id}: ${p.title} (${p.category})`)
    .join("\n");

  const prompt = `You are a senior patent analyst. A user has submitted an idea or document for patent landscape analysis. Analyze it thoroughly and respond with valid JSON only (no markdown fences):
{
  "category": "<best-fit category from: Machine Learning | Biotech | Semiconductors | Robotics | Telecommunications | Clean Energy | Other>",
  "relatedPatentIds": ["<id1>", "<id2>", "...up to ${Math.min(radius, 15)} most relevant IDs"],
  "summary": "<2-3 sentence executive summary of the idea/document and its positioning in the patent landscape>",
  "spaceSummary": "<3-4 sentence analysis of the technology space this idea occupies: what domains does it span, how crowded is the space, what are the key players and trends, and where are the gaps or opportunities>",
  "mainClaims": ["<potential patent claim 1 — written as a formal patent claim starting with 'A method/system/apparatus for...'>", "<claim 2>", "<claim 3>", "<claim 4>", "<claim 5>"]
}

Document/idea text (first 6000 chars):
${text.slice(0, 6000)}

Available patent IDs (select the most relevant):
${patentSamples}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(responseText, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    const category = (p.category as string) ?? "Other";
    return {
      category,
      relatedPatentIds: (p.relatedPatentIds as string[]) ?? [],
      summary: (p.summary as string) ?? "",
      placementCoords: computeUploadCoordinates(category),
      spaceSummary: (p.spaceSummary as string) ?? "",
      mainClaims: (p.mainClaims as string[]) ?? [],
    };
  }

  return buildLocalUploadAnalysis(text, allPatents, radius);
}

function buildLocalUploadAnalysis(
  text: string,
  allPatents: Patent[],
  radius: number,
): {
  category: string;
  relatedPatentIds: string[];
  summary: string;
  placementCoords: { x: number; y: number };
  spaceSummary: string;
  mainClaims: string[];
} {
  const keywords = extractKeywords(text);
  const category = guessCategory(text, allPatents);
  const matched = findMatchingPatents(keywords, allPatents, Math.min(radius, 15));
  const relatedIds = matched.map(p => p.id);

  // Analyze the matched patents for insights
  const matchedCategories = [...new Set(matched.map(p => p.category))];
  const matchedAssignees = [...new Set(matched.map(p => p.assignee).filter(Boolean))].slice(0, 5);
  const matchedYears = matched.map(p => p.year);
  const yearMin = matchedYears.length ? Math.min(...matchedYears) : 0;
  const yearMax = matchedYears.length ? Math.max(...matchedYears) : 0;

  const summary = matched.length > 0
    ? `Your idea aligns with the ${category} domain. Found ${matched.length} related patents from ${yearMin} to ${yearMax}, primarily from ${matchedAssignees.slice(0, 3).join(", ") || "various assignees"}. The idea touches on keywords: ${keywords.slice(0, 5).join(", ")}.`
    : `Your idea appears to relate to ${category}. No closely matching patents were found using keyword analysis, which may indicate a novel area. Keywords identified: ${keywords.slice(0, 6).join(", ")}.`;

  const catPatentCount = allPatents.filter(p => p.category === category).length;
  const spaceSummary = `The ${category} space contains ${catPatentCount} patents in our database${matchedCategories.length > 1 ? `, and your idea also intersects with ${matchedCategories.filter(c => c !== category).join(", ")}` : ""}. ${matchedAssignees.length > 0 ? `Key players in this space include ${matchedAssignees.join(", ")}.` : "This appears to be an area with diverse assignees."} ${matched.length < 3 ? "The low number of matches suggests potential white space for your innovation." : `With ${matched.length} related patents found, this is an active area of research.`}`;

  return {
    category,
    relatedPatentIds: relatedIds,
    summary,
    placementCoords: computeUploadCoordinates(category),
    spaceSummary,
    mainClaims: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARIZE GROUP
// ═══════════════════════════════════════════════════════════════════════════════

export async function summarizeGroup(patents: Patent[]): Promise<GroupSummaryResult> {
  const categories = [...new Set(patents.map(p => p.category))];
  const years = patents.map(p => p.year);
  const yearRange: [number, number] = [Math.min(...years), Math.max(...years)];
  const assignees = [...new Set(patents.map(p => p.assignee).filter(Boolean))].slice(0, 10);

  // Build a rich local fallback from real data
  const assigneeCounts: Record<string, number> = {};
  for (const p of patents) {
    const a = p.assignee ?? "Unknown";
    assigneeCounts[a] = (assigneeCounts[a] ?? 0) + 1;
  }
  const topAssignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const yearCounts: Record<number, number> = {};
  for (const y of years) yearCounts[y] = (yearCounts[y] ?? 0) + 1;
  const peakYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];

  // Extract common keywords from titles
  const titleWords = extractKeywords(patents.map(p => p.title).join(" "));
  const themes = titleWords.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1));

  const avgCitations = Math.round(patents.reduce((s, p) => s + (p.citationCount ?? 0), 0) / patents.length);

  const fallback: GroupSummaryResult = {
    count: patents.length,
    categories,
    yearRange,
    summary: `This cluster contains ${patents.length} patents spanning ${categories.length} ${categories.length === 1 ? "category" : "categories"} (${categories.slice(0, 3).join(", ")}${categories.length > 3 ? ` and ${categories.length - 3} more` : ""}) from ${yearRange[0]} to ${yearRange[1]}. The dominant assignee is ${topAssignees[0]?.[0] ?? "various"} with ${topAssignees[0]?.[1] ?? 0} patents. Average citation count is ${avgCitations}, indicating ${avgCitations > 50 ? "highly influential" : avgCitations > 10 ? "moderately cited" : "emerging"} research.`,
    themes: themes.length > 0 ? themes : categories.slice(0, 5),
    technologicalTrends: [
      `${topAssignees[0]?.[0] ?? "Leading players"} dominate${topAssignees[0] ? ` with ${topAssignees[0][1]} patents (${Math.round((topAssignees[0][1] / patents.length) * 100)}%)` : ""}`,
      `Peak activity in ${peakYear ? `${peakYear[0]} (${peakYear[1]} patents)` : "recent years"}`,
      `Average of ${avgCitations} citations per patent across the cluster`,
      categories.length > 1 ? `Cross-domain innovation spanning ${categories.slice(0, 3).join(", ")}` : `Focused innovation within ${categories[0]}`,
    ],
    keyPlayers: topAssignees.slice(0, 6).map(([name, count]) => `${name} (${count})`),
    innovationInsights: `This cluster of ${patents.length} patents shows ${yearRange[1] - yearRange[0] > 10 ? "sustained" : "concentrated"} innovation activity. The top ${Math.min(3, topAssignees.length)} assignees (${topAssignees.slice(0, 3).map(([n]) => n).join(", ")}) account for ${Math.round(topAssignees.slice(0, 3).reduce((s, [, c]) => s + c, 0) / patents.length * 100)}% of patents. ${avgCitations > 30 ? "High citation counts suggest foundational, widely-referenced work." : "Citation patterns suggest an actively growing area of research."}`,
    temporalAnalysis: `Patents span ${yearRange[1] - yearRange[0] + 1} years from ${yearRange[0]} to ${yearRange[1]}. ${peakYear ? `Peak activity occurred in ${peakYear[0]} with ${peakYear[1]} patents.` : ""} ${yearRange[1] >= 2022 ? "Recent filings indicate ongoing active research." : "Activity appears to have matured."}`,
  };

  if (!isAnthropicConfigured()) return fallback;

  const patentList = patents.slice(0, 40)
    .map(p => `- ${p.id}: ${p.title} (${p.year}, ${p.category}${p.assignee ? `, ${p.assignee}` : ""})\n  Abstract: ${(p.abstract ?? "").slice(0, 120)}`)
    .join("\n");

  const prompt = `You are a senior patent landscape analyst. A user has drawn a selection circle on a patent map and selected ${patents.length} patents. Provide a comprehensive analysis of this cluster.

Respond with valid JSON only (no markdown fences):
{
  "summary": "<4-5 sentence executive summary: what this cluster is fundamentally about, the core technical problem space it addresses, and its significance in the IP landscape>",
  "themes": ["<specific technical theme 1>", "<theme 2>", "<theme 3>", "<theme 4>", "<theme 5>"],
  "technologicalTrends": ["<observed trend 1 — be specific and analytical>", "<trend 2>", "<trend 3>", "<trend 4>"],
  "keyPlayers": ["<assignee or player 1>", "<player 2>", "<player 3>"],
  "innovationInsights": "<2-3 sentence paragraph about what the innovation patterns reveal: are patents incremental or breakthrough? Are there convergent approaches? What does the citation density or topic overlap suggest about the maturity of this technology area?>",
  "temporalAnalysis": "<2 sentence analysis of the time distribution: when was activity highest, what does the temporal spread suggest about technology lifecycle, are there acceleration or slowdown patterns?>"
}

Patents selected:
${patentList}${patents.length > 40 ? `\n...and ${patents.length - 40} more patents in this cluster` : ""}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      count: patents.length,
      categories,
      yearRange,
      summary: (p.summary as string) ?? fallback.summary,
      themes: (p.themes as string[]) ?? fallback.themes,
      technologicalTrends: (p.technologicalTrends as string[]) ?? fallback.technologicalTrends,
      keyPlayers: (p.keyPlayers as string[]) ?? fallback.keyPlayers,
      innovationInsights: (p.innovationInsights as string) ?? fallback.innovationInsights,
      temporalAnalysis: (p.temporalAnalysis as string) ?? fallback.temporalAnalysis,
    };
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH QUERY INTERPRETATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function interpretSearch(
  query: string,
  availableCategories: string[],
): Promise<{ correctedQuery: string; explanation: string; suggestedCategories: string[]; keywords: string[] }> {
  const keywords = extractKeywords(query);
  // Find matching categories by keyword overlap
  const suggestedCategories = availableCategories.filter(cat => {
    const catLower = cat.toLowerCase();
    return keywords.some(kw => catLower.includes(kw)) || query.toLowerCase().split(/\s+/).some(w => catLower.includes(w));
  }).slice(0, 4);

  const fallback = {
    correctedQuery: query,
    explanation: `Searching for patents related to: ${query}`,
    suggestedCategories,
    keywords: keywords.length > 0 ? keywords : query.split(/\s+/).filter(w => w.length > 2),
  };

  if (!isAnthropicConfigured()) return fallback;

  const prompt = `You are a patent search assistant. A user has typed a search query — it may contain typos, abbreviations, or informal language. Interpret what they are looking for and respond with valid JSON only (no markdown fences):
{
  "correctedQuery": "<normalised, properly spelled version of the query — same as input if already correct>",
  "explanation": "<1 sentence: what kinds of patents the user will find>",
  "suggestedCategories": ["<1-4 most relevant category names from the list below>"],
  "keywords": ["<6-10 specific technical keywords to match in patent titles and abstracts>"]
}

User query: "${query}"

Available categories:
${availableCategories.map(c => `- ${c}`).join("\n")}`;

  const message = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      correctedQuery: (p.correctedQuery as string) ?? query,
      explanation: (p.explanation as string) ?? fallback.explanation,
      suggestedCategories: (p.suggestedCategories as string[]) ?? [],
      keywords: (p.keywords as string[]) ?? fallback.keywords,
    };
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONCEPT SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

export async function conceptSearch(
  concept: string,
  availableCategories: string[],
): Promise<{ suggestedCategories: string[]; keywords: string[]; explanation: string }> {
  const keywords = extractKeywords(concept);
  const conceptWords = concept.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const allLocalKeywords = [...new Set([...keywords, ...conceptWords])];

  const suggestedCategories = availableCategories.filter(cat => {
    const catLower = cat.toLowerCase();
    return allLocalKeywords.some(kw => catLower.includes(kw));
  }).slice(0, 6);

  const fallback = {
    suggestedCategories,
    keywords: allLocalKeywords.length > 0 ? allLocalKeywords : concept.split(/\s+/).filter(w => w.length > 3),
    explanation: `Searching for patents related to: ${concept}`,
  };

  if (!isAnthropicConfigured()) return fallback;

  const prompt = `You are a patent landscape analyst. A user wants to find semantically similar patents to this concept:

"${concept}"

Available technology categories in our database:
${availableCategories.map(c => `- ${c}`).join("\n")}

Generate a COMPREHENSIVE set of search terms that would find ALL semantically related patents — not just exact keyword matches but also synonyms, related techniques, adjacent technologies, component technologies, and alternative approaches to the same problem.

Respond with valid JSON only (no markdown fences):
{
  "suggestedCategories": ["<1-6 most relevant category names from the list above>"],
  "keywords": ["<12-20 specific technical keywords, synonyms, and related terms to search in patent titles and abstracts — include both specific technical terms AND broader conceptual terms>"],
  "explanation": "<1 sentence explaining the semantic cluster of patents the user will find>"
}`;

  const message = await getClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      suggestedCategories: (p.suggestedCategories as string[]) ?? [],
      keywords: (p.keywords as string[]) ?? fallback.keywords,
      explanation: (p.explanation as string) ?? fallback.explanation,
    };
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FTO ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export async function analyzeFTO(
  brief: string,
  content: string,
  patentCount: number,
  allPatents: Patent[],
): Promise<FTOReport> {
  if (!isAnthropicConfigured()) {
    return buildLocalFTOReport(brief, content, allPatents, patentCount);
  }

  // Semantic expansion: use Haiku to generate comprehensive search terms before matching
  const availableCategories = [...new Set(allPatents.map(p => p.category))];
  const { primary, secondary, suggestedCategories } = await expandIdeaTerms(
    `${brief} ${content}`,
    availableCategories,
  );

  // Weighted matching: primary keywords (from user's text) rank higher than expanded terms
  const relevantPatents = findMatchingPatentsWeighted(
    primary,
    secondary,
    allPatents,
    Math.min(patentCount * 3, 120),
  );

  // Pad with patents from the best-fit category if not enough matches
  const category = suggestedCategories[0] ?? guessCategory(`${brief} ${content}`, allPatents);
  if (relevantPatents.length < patentCount * 2) {
    const catPatents = allPatents.filter(p => p.category === category && !relevantPatents.some(r => r.id === p.id));
    relevantPatents.push(...catPatents.slice(0, patentCount * 2 - relevantPatents.length));
  }

  const patentSamples = relevantPatents
    .map(p => `${p.id}: ${p.title} (${p.year}, ${p.category}, ${p.assignee ?? "Unknown"})\nAbstract: ${(p.abstract ?? "").slice(0, 200)}`)
    .join("\n\n");

  const prompt = `You are a senior patent landscape analyst performing a thorough Freedom-to-Operate style analysis. The user has submitted an innovation idea and you must analyze it against existing patents.

IMPORTANT: Think deeply about every aspect. This is a critical analysis that could inform patent filing decisions.

User's brief description: "${brief}"

Detailed description:
${content.slice(0, 8000)}

Here are patents from our database to analyze against (select the ${patentCount} most relevant):
${patentSamples}

Respond with valid JSON only (no markdown fences). Be thorough and specific:
{
  "whiteSpace": {
    "summary": "<3-4 sentences. Identify SPECIFIC technical aspects of the user's idea that are NOT covered by existing patents. Name concrete features, methods, or combinations that create potential white space. Do not simply restate the idea or count patents — explain WHERE the novelty lies.>",
    "gaps": [
      "<Each gap must be a specific, actionable finding. Compare the user's idea to the closest patents and explain what technical element is missing from existing art. Example: 'No existing patent combines X mechanism with Y application — closest is US12345 which uses X but only for Z purpose.' Provide 4 gaps.>"
    ],
    "suggestedAngles": [
      "<Each angle must be a specific patent filing strategy based on the identified gaps. Reference the technical differentiator and suggest claim language direction. Example: 'File a method claim on the process of using X to achieve Y, which sidesteps the apparatus claims in US12345.' Provide 3 angles.>"
    ]
  },
  "features": [
    { "type": "Technical Domain", "description": "<specific domain>", "keywords": ["<kw1>", "<kw2>", "<kw3>"] },
    { "type": "Core Innovation", "description": "<Describe what makes this idea DIFFERENT from the closest existing patents. Do NOT just restate the user's description. Instead, identify the novel element — the specific technical feature, method, or combination that distinguishes it from prior art. Reference at least one existing patent to contrast against.>", "keywords": ["<kw1>", "<kw2>", "<kw3>"] }
  ],
  "landscape": {
    "totalAnalyzed": <number>,
    "highRelevance": <number>,
    "mediumRelevance": <number>,
    "lowRelevance": <number>,
    "topAssignees": [{ "name": "<company>", "count": <number> }]
  },
  "claims": [
    {
      "claimNumber": <number>,
      "patentId": "<actual patent ID from the list>",
      "patentTitle": "<title>",
      "patentStatus": "<active|pending|abandoned>",
      "claimText": "<the relevant claim text — write a realistic claim>",
      "overlapLevel": "<high|moderate|low>",
      "explanation": "<why this claim matters to the user's idea>"
    }
  ],
  "patents": [
    {
      "patentId": "<ID>",
      "title": "<title>",
      "status": "<active|pending|abandoned>",
      "assignee": "<company>",
      "relevance": "<high|medium|low>",
      "year": <year>
    }
  ]
}

Sort claims by relevance (highest overlap first). Include up to 10 claims and up to ${patentCount} patents.`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      brief,
      timestamp: new Date().toISOString(),
      whiteSpace: (p.whiteSpace as FTOReport["whiteSpace"]) ?? { summary: "", gaps: [], suggestedAngles: [] },
      features: (p.features as FTOReport["features"]) ?? [],
      landscape: (p.landscape as FTOReport["landscape"]) ?? { totalAnalyzed: 0, highRelevance: 0, mediumRelevance: 0, lowRelevance: 0, topAssignees: [] },
      claims: (p.claims as FTOReport["claims"]) ?? [],
      patents: (p.patents as FTOReport["patents"]) ?? [],
    };
  }

  return buildLocalFTOReport(brief, content, allPatents, patentCount);
}

function analyzeKeywordCoOccurrence(keywords: string[], allPatents: Patent[]): { rare: string[][]; common: string[][]; uniqueRatio: number } {
  const topKws = keywords.slice(0, 6);
  const rare: string[][] = [];
  const common: string[][] = [];

  // For each keyword pair, count how many patents contain BOTH
  for (let i = 0; i < topKws.length; i++) {
    for (let j = i + 1; j < topKws.length; j++) {
      const kwA = topKws[i];
      const kwB = topKws[j];
      let both = 0;
      let eitherCount = 0;
      for (const p of allPatents) {
        const haystack = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
        const hasA = haystack.includes(kwA);
        const hasB = haystack.includes(kwB);
        if (hasA || hasB) eitherCount++;
        if (hasA && hasB) both++;
      }
      if (both <= 2) {
        rare.push([kwA, kwB, String(both)]);
      } else {
        common.push([kwA, kwB, String(both)]);
      }
    }
  }

  const totalPairs = rare.length + common.length;
  const uniqueRatio = totalPairs > 0 ? rare.length / totalPairs : 0;
  return { rare, common, uniqueRatio };
}

function buildLocalFTOReport(brief: string, content: string, allPatents: Patent[], count: number): FTOReport {
  const keywords = extractKeywords(`${brief} ${content}`);
  const matched = findMatchingPatents(keywords, allPatents, count);
  const category = guessCategory(`${brief} ${content}`, allPatents);

  // Score relevance
  const scoredMatches = matched.map(p => {
    const haystack = `${p.title} ${p.abstract ?? ""}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score++;
      if (p.title.toLowerCase().includes(kw)) score++;
    }
    const relevance: "high" | "medium" | "low" = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
    return { patent: p, score, relevance };
  });

  const highCount = scoredMatches.filter(m => m.relevance === "high").length;
  const medCount = scoredMatches.filter(m => m.relevance === "medium").length;
  const lowCount = scoredMatches.filter(m => m.relevance === "low").length;

  // Top assignees from matches
  const assigneeCounts: Record<string, number> = {};
  for (const m of scoredMatches) {
    const a = m.patent.assignee ?? "Unknown";
    assigneeCounts[a] = (assigneeCounts[a] ?? 0) + 1;
  }
  const topAssignees = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, c]) => ({ name, count: c }));

  const catCount = allPatents.filter(p => p.category === category).length;

  // ── Real comparative analysis ──

  // 1. Find keywords unique to user's idea (not in any matched patent)
  const ideaText = `${brief} ${content}`.toLowerCase();
  const uniqueToIdea: string[] = [];
  const sharedWithPrior: string[] = [];
  for (const kw of keywords) {
    const inMatchedCount = matched.filter(p => `${p.title} ${p.abstract ?? ""}`.toLowerCase().includes(kw)).length;
    if (inMatchedCount === 0) {
      uniqueToIdea.push(kw);
    } else {
      sharedWithPrior.push(kw);
    }
  }

  // 2. Analyze what the closest patent covers vs what it doesn't
  const closestPatent = scoredMatches[0]?.patent;
  const closestTitle = closestPatent?.title ?? "N/A";
  const closestId = closestPatent?.id ?? "N/A";
  const closestAbstract = (closestPatent?.abstract ?? "").toLowerCase();
  const closestMissing = keywords.filter(kw => !closestAbstract.includes(kw) && !(closestPatent?.title ?? "").toLowerCase().includes(kw));

  // 3. Keyword co-occurrence analysis
  const coOccurrence = analyzeKeywordCoOccurrence(keywords, allPatents);

  // 4. Cross-domain categories found in matches
  const matchCategories = [...new Set(matched.map(p => p.category))];
  const crossDomainCats = matchCategories.filter(c => c !== category);

  // 5. Year distribution — is the space getting crowded recently?
  const recentMatches = matched.filter(p => p.year >= 2020).length;
  const olderMatches = matched.length - recentMatches;

  // ── Build White Space summary with real findings ──
  const summaryParts: string[] = [];
  if (uniqueToIdea.length > 0) {
    summaryParts.push(`Your idea introduces concepts (${uniqueToIdea.slice(0, 3).join(", ")}) not found in the ${matched.length} closest existing patents in ${category}.`);
  } else {
    summaryParts.push(`The core concepts in your idea are all present across the ${matched.length} closest patents in ${category}, so novelty will need to come from your specific combination or implementation.`);
  }
  if (closestPatent) {
    summaryParts.push(`The closest prior art is "${closestTitle}" (${closestId})${closestMissing.length > 0 ? `, which does not address: ${closestMissing.slice(0, 3).join(", ")}` : ", which covers similar ground"}.`);
  }
  if (topAssignees.length > 0) {
    summaryParts.push(`Key players include ${topAssignees.slice(0, 3).map(a => a.name).join(", ")}.`);
  }

  // ── Build specific gaps ──
  const gaps: string[] = [];
  if (closestPatent && closestMissing.length > 0) {
    gaps.push(`Closest patent "${closestTitle}" (${closestId}) does not address: ${closestMissing.join(", ")} — these represent potential differentiators for your claims`);
  } else if (closestPatent) {
    gaps.push(`Closest patent "${closestTitle}" (${closestId}) covers similar keywords — you'll need to differentiate on implementation specifics or a novel method`);
  }

  if (coOccurrence.rare.length > 0 && coOccurrence.uniqueRatio > 0.5) {
    const examples = coOccurrence.rare.slice(0, 3).map(r => `"${r[0]}" + "${r[1]}" (${r[2]} patents)`).join(", ");
    gaps.push(`Rare keyword combinations in the corpus: ${examples} — suggesting a novel intersection not well-explored in prior art`);
  } else if (coOccurrence.rare.length > 0) {
    const examples = coOccurrence.rare.slice(0, 2).map(r => `"${r[0]}" + "${r[1]}" (${r[2]} patents)`).join(", ");
    gaps.push(`Some keyword pairs appear together rarely: ${examples} — potential angles for differentiation`);
  } else {
    gaps.push(`Your keyword combinations already appear frequently in existing patents — novelty should come from implementation details, not the high-level concept`);
  }

  if (crossDomainCats.length > 0) {
    gaps.push(`Your idea spans across ${category} and ${crossDomainCats.slice(0, 2).join(", ")} — cross-domain applications may offer less-contested filing ground`);
  } else {
    gaps.push(`All matched patents are concentrated in ${category} (${catCount} total in this category) — ${catCount > 500 ? "a crowded field where strong, narrow claims are essential" : "a moderately sized field with room for well-positioned claims"}`);
  }

  if (recentMatches > olderMatches && matched.length > 3) {
    gaps.push(`${recentMatches} of ${matched.length} matched patents are from 2020 onwards — this is an actively developing area, so timing of filing matters`);
  } else if (uniqueToIdea.length >= 3) {
    gaps.push(`${uniqueToIdea.length} of your key concepts (${uniqueToIdea.slice(0, 3).join(", ")}) have no matches in existing patents — strong basis for novelty claims`);
  }

  // ── Build suggested angles from real analysis ──
  const suggestedAngles: string[] = [];
  if (uniqueToIdea.length >= 2) {
    suggestedAngles.push(`File claims specifically around the combination of ${uniqueToIdea.slice(0, 3).join(" + ")}, which are absent from existing patents in this space`);
  } else if (closestMissing.length > 0) {
    suggestedAngles.push(`Differentiate from ${closestId} by focusing claims on ${closestMissing.slice(0, 2).join(" and ")}, which the closest prior art does not cover`);
  }
  if (crossDomainCats.length > 0) {
    suggestedAngles.push(`Target the cross-domain angle between ${category} and ${crossDomainCats[0]} — fewer existing patents operate at this intersection`);
  }
  suggestedAngles.push(`Consider a method claim focused on the specific process or technique rather than the apparatus, as most existing patents in this space are apparatus-focused`);
  if (suggestedAngles.length < 3 && closestPatent) {
    suggestedAngles.push(`Design around ${closestId} by varying the implementation approach while preserving your core concept`);
  }

  // ── Build Core Innovation by contrasting with prior art ──
  let coreInnovation: string;
  if (uniqueToIdea.length > 0 && closestPatent) {
    coreInnovation = `Unlike "${closestTitle}" and similar patents, this idea introduces ${uniqueToIdea.slice(0, 3).join(", ")} — concepts not present in the ${matched.length} closest prior art results`;
  } else if (closestPatent && closestMissing.length > 0) {
    coreInnovation = `While similar to "${closestTitle}", this idea differentiates by addressing ${closestMissing.slice(0, 3).join(", ")}, which the closest prior art does not cover`;
  } else {
    coreInnovation = `The idea shares terminology with existing ${category} patents but may differentiate through its specific implementation approach or novel method of combining known elements`;
  }

  return {
    brief,
    timestamp: new Date().toISOString(),
    whiteSpace: {
      summary: summaryParts.join(" "),
      gaps,
      suggestedAngles: suggestedAngles.slice(0, 3),
    },
    features: [
      { type: "Technical Domain", description: category, keywords: keywords.slice(0, 4) },
      { type: "Core Innovation", description: coreInnovation, keywords: uniqueToIdea.length > 0 ? uniqueToIdea.slice(0, 4) : keywords.slice(0, 4) },
    ],
    landscape: {
      totalAnalyzed: matched.length,
      highRelevance: highCount,
      mediumRelevance: medCount,
      lowRelevance: lowCount,
      topAssignees,
    },
    claims: scoredMatches.filter(m => m.relevance !== "low").slice(0, 10).map((m, i) => ({
      claimNumber: i + 1,
      patentId: m.patent.id,
      patentTitle: m.patent.title,
      patentStatus: "active" as const,
      claimText: (m.patent.abstract ?? "").slice(0, 200),
      overlapLevel: m.relevance === "high" ? "high" as const : "moderate" as const,
      explanation: `This patent from ${m.patent.assignee ?? "unknown"} (${m.patent.year}) shares ${m.score} keyword matches with your idea in the ${m.patent.category} domain.`,
    })),
    patents: scoredMatches.map(m => ({
      patentId: m.patent.id,
      title: m.patent.title,
      status: "active" as const,
      assignee: m.patent.assignee ?? "Unknown",
      relevance: m.relevance,
      year: m.patent.year,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUG & CREATE
// ═══════════════════════════════════════════════════════════════════════════════

export async function plugAndCreate(patents: Patent[]): Promise<PlugCreateResult> {
  if (!isAnthropicConfigured()) {
    return buildLocalPlugCreate(patents);
  }

  const patentList = patents
    .map((p, i) => `[${i + 1}] ${p.id}: ${p.title} (${p.year}, ${p.category})\nAssignee: ${p.assignee ?? "Unknown"}\nAbstract: ${p.abstract ?? "N/A"}`)
    .join("\n\n");

  const prompt = `You are a brilliant innovation architect and patent strategist. You have been given ${patents.length} patents and your task is to deeply analyze the intersection of their technologies, identify non-obvious synergies, and generate a genuinely novel invention that combines elements from each.

IMPORTANT: Think DEEPLY. Do not produce a shallow merge or trivial combination. Consider:
- What technical principles from each patent could be combined in an unexpected way?
- What problem does this combination solve that neither patent addresses alone?
- What would make this combination truly patentable — what is the inventive step?

Patents to combine:
${patentList}

Respond with valid JSON only (no markdown fences):
{
  "title": "<creative, specific title for the novel invention>",
  "description": "<3-5 detailed paragraphs describing the invention.>",
  "sourceElements": [
    { "patentId": "<ID>", "patentTitle": "<title>", "feature": "<specific feature borrowed from this patent>" }
  ],
  "noveltyAssessment": "<2-3 paragraph assessment of why this combination is potentially novel.>",
  "suggestedClaims": ["<formal patent claim 1 starting with 'A method/system/apparatus for...'>", "<claim 2>", "<claim 3>"]
}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = parseJSON(text, null);

  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    return {
      title: (p.title as string) ?? "Novel Combination",
      description: (p.description as string) ?? "",
      sourceElements: (p.sourceElements as PlugCreateResult["sourceElements"]) ?? [],
      noveltyAssessment: (p.noveltyAssessment as string) ?? "",
      suggestedClaims: (p.suggestedClaims as string[]) ?? [],
    };
  }

  return buildLocalPlugCreate(patents);
}

function buildLocalPlugCreate(patents: Patent[]): PlugCreateResult {
  const categories = [...new Set(patents.map(p => p.category))];
  const allKeywords = patents.flatMap(p => extractKeywords(`${p.title} ${p.abstract ?? ""}`));
  const uniqueKeywords = [...new Set(allKeywords)].slice(0, 8);

  // Generate a combined title
  const titleParts = patents.map(p => {
    const words = p.title.split(/\s+/).slice(0, 3).join(" ");
    return words;
  });
  const title = `Integrated ${categories.join("-")} System: Combining ${titleParts.join(" with ")}`;

  // Build a description from the patents' abstracts
  const description = `This novel invention combines technologies from ${patents.length} existing patents across ${categories.join(" and ")} domains.\n\n` +
    patents.map((p, i) => `From patent ${i + 1} (${p.id}, "${p.title}"), the invention incorporates ${p.category.toLowerCase()} technology ${p.assignee ? `originally developed by ${p.assignee}` : ""} (${p.year}).`).join(" ") +
    `\n\nThe combination of these ${patents.length} technologies creates a synergy that addresses limitations each patent faces individually. Key technical areas involved include: ${uniqueKeywords.join(", ")}.` +
    `\n\nThe integrated system leverages the strengths of each component technology while mitigating their individual weaknesses, resulting in a solution that is greater than the sum of its parts.`;

  const sourceElements = patents.map(p => ({
    patentId: p.id,
    patentTitle: p.title,
    feature: `${p.category} technology: ${(p.abstract ?? p.title).slice(0, 100)}`,
  }));

  const noveltyAssessment = `This combination is potentially novel because it bridges ${categories.length} distinct technology domains (${categories.join(", ")}), which are typically developed in isolation. ` +
    `The ${patents.length} source patents come from ${[...new Set(patents.map(p => p.assignee).filter(Boolean))].length} different assignees, suggesting these approaches have not been combined before. ` +
    `With a combined citation count of ${patents.reduce((s, p) => s + (p.citationCount ?? 0), 0)}, the source patents represent well-established technologies whose integration could yield breakthrough results.`;

  return {
    title,
    description,
    sourceElements,
    noveltyAssessment,
    suggestedClaims: [],
  };
}

export type { UploadAnalysisResult };
