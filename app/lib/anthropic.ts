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
    // Strip possible markdown code fences
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function translatePatent(patent: Patent): Promise<TranslationResult> {
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

export async function comparePatents(patents: Patent[]): Promise<ComparisonResult> {
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

  return {
    patents: patents.map(p => p.id),
    summary: "Comparison could not be parsed.",
    similarities: [],
    differences: [],
    noveltyAssessment: text.slice(0, 500),
    tableRows: [
      { dimension: "Year", values: patents.map(p => String(p.year)) },
      { dimension: "Category", values: patents.map(p => p.category) },
      { dimension: "Assignee", values: patents.map(p => p.assignee ?? "Unknown") },
    ],
  };
}

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
  const patentSamples = allPatents.slice(0, 80)
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

  return {
    category: "Other",
    relatedPatentIds: [],
    summary: "Document analyzed but response could not be parsed.",
    placementCoords: computeUploadCoordinates("Other"),
    spaceSummary: "",
    mainClaims: [],
  };
}

export async function summarizeGroup(patents: Patent[]): Promise<GroupSummaryResult> {
  const categories = [...new Set(patents.map(p => p.category))];
  const years = patents.map(p => p.year);
  const yearRange: [number, number] = [Math.min(...years), Math.max(...years)];

  const assignees = [...new Set(patents.map(p => p.assignee).filter(Boolean))].slice(0, 10);

  const fallback: GroupSummaryResult = {
    count: patents.length,
    categories,
    yearRange,
    summary: `A cluster of ${patents.length} patents spanning ${categories.join(", ")} technologies from ${yearRange[0]} to ${yearRange[1]}.`,
    themes: categories,
    technologicalTrends: ["Cross-domain innovation", "Applied research", "Systems integration"],
    keyPlayers: assignees.length ? assignees as string[] : ["Various assignees"],
    innovationInsights: `This group of ${patents.length} patents represents a convergence of ${categories.join(" and ")} research, indicating active innovation in this space during the ${yearRange[0]}–${yearRange[1]} period.`,
    temporalAnalysis: `Patents span ${yearRange[1] - yearRange[0] + 1} years from ${yearRange[0]} to ${yearRange[1]}, suggesting ${yearRange[1] - yearRange[0] > 10 ? "a mature, sustained area of research" : "an emerging technology field"}.`,
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

// ─── Search query interpretation ─────────────────────────────────────────────
export async function interpretSearch(
  query: string,
  availableCategories: string[],
): Promise<{ correctedQuery: string; explanation: string; suggestedCategories: string[]; keywords: string[] }> {
  const fallback = {
    correctedQuery: query,
    explanation: `Searching for patents related to: ${query}`,
    suggestedCategories: [],
    keywords: query.split(/\s+/).filter(w => w.length > 2),
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

// ─── Concept search ───────────────────────────────────────────────────────────
export async function conceptSearch(
  concept: string,
  availableCategories: string[],
): Promise<{ suggestedCategories: string[]; keywords: string[]; explanation: string }> {
  const fallback = {
    suggestedCategories: [],
    keywords: concept.split(/\s+/).filter(w => w.length > 3),
    explanation: `Searching for patents related to: ${concept}`,
  };

  if (!isAnthropicConfigured()) return fallback;

  const prompt = `You are a patent landscape analyst. A user is looking for patents related to this concept:

"${concept}"

Available technology categories in our database:
${availableCategories.map(c => `- ${c}`).join("\n")}

Respond with valid JSON only (no markdown fences):
{
  "suggestedCategories": ["<1-4 most relevant category names from the list above>"],
  "keywords": ["<5-8 specific technical keywords to search for in patent titles and abstracts>"],
  "explanation": "<1 sentence explaining what kinds of patents the user will find>"
}`;

  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 400,
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

// ─── FTO Patent Landscape Analysis ──────────────────────────────────────────
export async function analyzeFTO(
  brief: string,
  content: string,
  patentCount: number,
  allPatents: Patent[],
): Promise<FTOReport> {
  const patentSamples = allPatents.slice(0, Math.min(patentCount * 3, 120))
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
    "summary": "<3-4 sentence analysis of where the innovation has novel space>",
    "gaps": ["<specific gap 1 in existing landscape>", "<gap 2>", "<gap 3>", "<gap 4>"],
    "suggestedAngles": ["<filing angle 1>", "<angle 2>", "<angle 3>"]
  },
  "features": [
    { "type": "Technical Domain", "description": "<specific domain>", "keywords": ["<kw1>", "<kw2>", "<kw3>"] },
    { "type": "Core Innovation", "description": "<what is new>", "keywords": ["<kw1>", "<kw2>", "<kw3>"] }
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

  if (!isAnthropicConfigured()) {
    return buildFallbackFTOReport(brief, allPatents, patentCount);
  }

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

  return buildFallbackFTOReport(brief, allPatents, patentCount);
}

function buildFallbackFTOReport(brief: string, allPatents: Patent[], count: number): FTOReport {
  const sample = allPatents.slice(0, count);
  return {
    brief,
    timestamp: new Date().toISOString(),
    whiteSpace: {
      summary: "AI analysis unavailable. Please configure ANTHROPIC_API_KEY for a full landscape report.",
      gaps: ["Unable to determine gaps without AI analysis"],
      suggestedAngles: ["Configure API key for patent filing suggestions"],
    },
    features: [
      { type: "Technical Domain", description: "Unable to determine", keywords: [] },
      { type: "Core Innovation", description: brief, keywords: [] },
    ],
    landscape: {
      totalAnalyzed: sample.length,
      highRelevance: 0,
      mediumRelevance: 0,
      lowRelevance: sample.length,
      topAssignees: [],
    },
    claims: [],
    patents: sample.map(p => ({
      patentId: p.id,
      title: p.title,
      status: "active" as const,
      assignee: p.assignee ?? "Unknown",
      relevance: "low" as const,
      year: p.year,
    })),
  };
}

// ─── Plug & Create ──────────────────────────────────────────────────────────
export async function plugAndCreate(patents: Patent[]): Promise<PlugCreateResult> {
  const patentList = patents
    .map((p, i) => `[${i + 1}] ${p.id}: ${p.title} (${p.year}, ${p.category})\nAssignee: ${p.assignee ?? "Unknown"}\nAbstract: ${p.abstract ?? "N/A"}`)
    .join("\n\n");

  const prompt = `You are a brilliant innovation architect and patent strategist. You have been given ${patents.length} patents and your task is to deeply analyze the intersection of their technologies, identify non-obvious synergies, and generate a genuinely novel invention that combines elements from each.

IMPORTANT: Think DEEPLY. Do not produce a shallow merge or trivial combination. Consider:
- What technical principles from each patent could be combined in an unexpected way?
- What problem does this combination solve that neither patent addresses alone?
- What would make this combination truly patentable — what is the inventive step?
- Consider the underlying physics, chemistry, biology, or engineering principles
- Think about how the manufacturing or implementation would actually work
- Consider market applications that don't exist yet

Patents to combine:
${patentList}

Respond with valid JSON only (no markdown fences):
{
  "title": "<creative, specific title for the novel invention>",
  "description": "<3-5 detailed paragraphs describing the invention. Include the technical mechanism, how it works, why this combination is non-obvious, what problems it solves, and potential applications. Be specific about the engineering/science.>",
  "sourceElements": [
    { "patentId": "<ID>", "patentTitle": "<title>", "feature": "<specific feature or claim borrowed from this patent and how it's adapted>" }
  ],
  "noveltyAssessment": "<2-3 paragraph assessment of why this combination is potentially novel. Reference specific claims from the source patents and explain why the combination creates something greater than the sum of its parts.>",
  "suggestedClaims": ["<formal patent claim 1 starting with 'A method/system/apparatus for...'>", "<claim 2>", "<claim 3>"]
}`;

  if (!isAnthropicConfigured()) {
    return {
      title: "Novel Combination (AI unavailable)",
      description: "Configure ANTHROPIC_API_KEY for AI-powered idea generation. The selected patents could be combined in interesting ways.",
      sourceElements: patents.map(p => ({
        patentId: p.id,
        patentTitle: p.title,
        feature: `Technology from ${p.category}`,
      })),
      noveltyAssessment: "AI analysis unavailable.",
      suggestedClaims: [],
    };
  }

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

  return {
    title: "Novel Combination",
    description: "AI response could not be parsed. Please try again.",
    sourceElements: patents.map(p => ({
      patentId: p.id,
      patentTitle: p.title,
      feature: `Technology from ${p.category}`,
    })),
    noveltyAssessment: text.slice(0, 500),
    suggestedClaims: [],
  };
}

export type { UploadAnalysisResult };
