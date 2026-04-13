# tIPe — Patent Intelligence Platform

Interactive web app for exploring, visualizing, and analyzing intellectual property data from Google Patents (2000–present). Inspired by MIT LatentLab USPTO explorer.

## Core Features

- **Patent Cluster Map** — 2D scatter visualization where similar patents cluster together (UMAP-style layout), with a toggleable force-directed citation graph view
- **Plain-Language Translation** — Click any patent to get a Claude AI explanation in plain English: summary, key innovation, practical applications
- **Upload & Find Similar** — Upload a sketch, PDF, or description; AI places it in the patent cluster and surfaces related patents
- **Side-by-Side Comparison** — Select 2–3 patents for a structured Claude AI analysis: similarities, differences, novelty assessment, comparison table
- **Google Patents Search** — Search the BigQuery public dataset (2000+) by keyword, year range, and IPC code; falls back to demo data when not configured

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, D3.js, Tailwind CSS v4
- **AI**: Claude API (`claude-opus-4-6`) via Anthropic SDK
- **Data**: Google Patents Public Data via BigQuery (`bigquery-public-data.google_patents_public_data.publications`)
- **Document processing**: pdf-parse (PDFs), Tesseract.js (OCR for images/sketches)

## Setup

1. Copy `.env.local` and fill in:
   - `ANTHROPIC_API_KEY` — from console.anthropic.com
   - `BIGQUERY_PROJECT_ID` — GCP project with BigQuery API enabled
   - `GOOGLE_APPLICATION_CREDENTIALS` — path to GCP service account JSON
2. `npm install && npm run dev`
3. App runs at http://localhost:3000

The app works fully with demo data when API keys are not configured.

---

## Changelog

### 2026-03-30 — UI improvements

- Updated color scheme to deeper blue-black palette (MIT LatentLab-inspired: `#03030d` background, `#7c6af7` accent)
- Added **year range slider** below the map — dual-handle filter for 2000–2024
- Added **category filter chips** — click to show/hide individual patent categories on the map
- Added **mini-map overview** — 120×80px inset showing full cluster with viewport rectangle
- Added **similarity radius ring** — when a patent is selected, a dashed ring shows all nearby patents; others fade to 25% opacity
- Added SVG glow filter on selected patent dot
- Added range slider thumb styling (glowing purple, consistent with accent color)
- New `MapControls` component (`app/components/MapControls.tsx`) encapsulating year + category filters

### 2026-03-30 — Initial implementation

- Scaffolded project with Next.js 14, TypeScript, Tailwind CSS v4, D3.js
- Implemented interactive patent cluster map (scatter view) with zoom/pan, hover tooltips, click-to-select
- Added force-directed citation graph view with toggle between scatter and graph modes
- Added patent search wired to `/api/patents/search` (BigQuery + mock fallback)
- Added plain-language AI translation via Claude (`/api/ai/translate`)
- Added side-by-side patent comparison via Claude (`/api/ai/compare`) with ComparePanel overlay
- Added file upload + AI analysis (`/api/ai/analyze-upload`) with pdf-parse and Tesseract.js OCR
- Created shared data layer: `app/lib/types.ts`, `mock-data.ts`, `embeddings.ts`, `bigquery.ts`, `anthropic.ts`
- All features include mock fallbacks for offline/unconfigured development
