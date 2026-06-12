# Lead Quality Audit Agent

An AI-powered auditor for **Buy Leads (BL)** that runs five quality checks on a single
lead and returns a structured report.

This project is a TypeScript re-implementation of the "Bl Quality Agents" n8n workflow,
following the same architecture as [HTML_Auditor_Agent](https://github.com/sayanrup/HTML_Auditor_Agent):
React + tRPC + Node, with an OpenRouter-compatible LLM client.

---

## Quality Checks

| # | Check | What it does |
|---|---|---|
| 1 | **Spec / Title Mismatch** | Detects contradictions between the requirement title, description, category and the buyer's answers to item-specific questions (ISQ), and proposes an enriched title when a core spec (size, material, capacity, etc.) conflicts with the title. |
| 2 | **One-Word Title Enrichment** | If the title is a single word (or empty), enriches it into a 6-word-max descriptive title using the buyer's ISQ answers. |
| 3 | **PII Detection** | Scans title, description and ISQ answers for phone numbers, emails, GSTIN-like patterns, credit-card-like numbers and social links; returns a cleaned title/description/ISQ with PII removed. |
| 4 | **Selling Intent** | Flags leads that are actually a *seller* offering a product rather than a genuine buy requirement. |
| 5 | **Absurd Quantity** | Flags implausible quantities/order values (e.g. price entered as quantity, OTPs, specs entered as quantity, exorbitant order values for the category). |

### Rule-based gating

To save LLM calls, each check is only invoked when a deterministic pre-check from the
original workflow passes:

- Checks **1** and **2** are mutually exclusive: a one-word (or empty) title runs check 2;
  a multi-word title runs check 1 unless the title is `<3` words and equals the category
  name, or no ISQ were asked.
- Checks **3** and **4** only run when a quick regex match finds candidate PII /
  selling-intent text.
- Check **5** only runs when `quantity * mcat_median` (the probable order value) exceeds
  a configured threshold.

Any check that's skipped is reported in the `skipped` array of the response, along with
the reason.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, tRPC, Zod |
| LLM integration | OpenAI-compatible REST (OpenRouter, or any compatible endpoint) |
| Testing | Vitest |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/sayanrup/Lead-Quality-Audit-Agent.git
cd Lead-Quality-Audit-Agent
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values you need:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `3000`, auto-picks next free port) |
| `LLM_API_KEY` | For server-side AI | Server-side API key used when the UI doesn't supply one |
| `LLM_MODEL` | Optional | Default model (e.g. `google/gemini-2.5-flash-lite`) |
| `LLM_BASE_URL` | Optional | Override endpoint (default: OpenRouter) |

> You can skip all of the above and instead enter your **OpenRouter API key**
> (`sk-or-v1-…`) directly in the app UI — it's stored in your browser's `localStorage`
> and never sent anywhere other than OpenRouter.

### Run

```bash
npm run dev
```

The app starts at `http://localhost:3000`.

---

## Usage

1. Open the app.
2. Enter your OpenRouter API key (`sk-or-v1-…`) and a model (default:
   `google/gemini-2.5-flash-lite`).
3. Paste a Buy Lead as JSON (or click **Load sample**) — see the shape below.
4. Click **Run Audit** to see the results for all five checks.

### Buy Lead input shape

```jsonc
{
  "display_id": "BL00012345",
  "title": "Cotton",
  "description": "Need raw cotton bales for our spinning unit, regular supply required.",
  "mcat_name": "Raw Cotton",
  "company_name_flag": 0,
  "gst_flag": 0,
  "company_address_flag": 0,
  "city": "Indore",
  "state": "Madhya Pradesh",
  "product_viewed_name": ["Raw Cotton Bales", "Organic Cotton"],
  "product_prices": [42000, 48000],
  "quantity": 5000,
  "quantity_unit": "Ton",
  "mcat_q1": 38000,
  "mcat_median": 45000,
  "mcat_q3": 52000,
  "isq_asked": ["Color", "Packaging Type", "Usage/Application"],
  "isq_filled": ["White", "Bales", "Spinning"]
}
```

### Response shape

```ts
{
  display_id?: string | number;
  enriched_title?: string;
  mismatch_found: 0 | 1;
  mismatch_details?: string;
  one_word_issue: 0 | 1;
  pii: 0 | 1;
  pii_details?: string;
  clean_title?: string;
  clean_description?: string;
  clean_isq_filled?: (string | number)[];
  selling_intent_issue: 0 | 1;
  absurd_qty_issue: 0 | 1;
  absurd_reason?: string;
  estimated_value?: number;
  skipped: { agent: string; reason: string }[];
}
```

---

## Project Structure

```
├── client/                       # React frontend (Vite)
│   └── src/
│       ├── pages/Home.tsx        # Lead input + results UI
│       ├── components/ResultPanel.tsx
│       └── lib/sampleLead.ts
│
├── server/                        # Node.js backend (tRPC)
│   ├── routers.ts                 # API routes (leadAudit.run)
│   └── services/
│       ├── llmClient.ts           # OpenRouter / LLM HTTP client
│       ├── ruleBasedChecks.ts      # Gating rules (word count, PII/selling regex, thresholds)
│       ├── leadAuditOrchestrator.ts # Runs gating + the 5 agents, merges results
│       └── agents/
│           ├── specTitleMismatch.ts
│           ├── oneWordIssue.ts
│           ├── piiIssue.ts
│           ├── sellingIntent.ts
│           └── absurdQuantity.ts
│
└── shared/types.ts                # BuyLeadInput / LeadAuditResult types
```

---

## OpenRouter Setup

1. Sign up at [openrouter.ai](https://openrouter.ai) and create an API key.
2. Paste your `sk-or-v1-…` key into the **OpenRouter API Key** field in the app.
3. Pick a model (default: `google/gemini-2.5-flash-lite`).

Keys starting with `sk-or-` are automatically routed to `https://openrouter.ai/api/v1`.

---

## License

MIT
