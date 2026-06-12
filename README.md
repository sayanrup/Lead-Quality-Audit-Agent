# Quality Audit Agent

A single-file, browser-only AI auditor for **Buy Leads** and **Product listings**.
No build step, no server, no Node.js — just open `index.html` and go.

Follows the same single-page conventions as
[HTML_Auditor_Agent](https://github.com/sayanrup/HTML_Auditor_Agent), but talks
directly to [OpenRouter](https://openrouter.ai) from the browser using your own
API key (stored only in `localStorage`).

---

## Input modes

Pick one of three tabs:

| Tab | Input | Audits |
|---|---|---|
| **Lead JSON** | Paste a Buy Lead JSON object (or click "Load sample") | 5 lead-quality checks |
| **Screenshot** | Upload a screenshot of a product/lead page | Product checks (vision) |
| **Product URL** | Paste a product page URL | Product checks (page is fetched and parsed client-side) |

---

## Lead Quality Checks (5)

| # | Check | What it does |
|---|---|---|
| 1 | **Spec / Title Mismatch** | Detects contradictions between the requirement title, description, category and the buyer's ISQ answers, and proposes an enriched title when a core spec (size, material, capacity, etc.) conflicts with the title. |
| 2 | **One-Word Title Enrichment** | If the title is a single word (or empty), enriches it into a 6-word-max descriptive title using the buyer's ISQ answers. |
| 3 | **PII Detection** | Scans title, description and ISQ answers for phone numbers, emails, GSTIN-like patterns, credit-card-like numbers and social links; returns a cleaned title/description/ISQ with PII removed. |
| 4 | **Selling Intent** | Flags leads that are actually a *seller* offering a product rather than a genuine buy requirement. |
| 5 | **Absurd Quantity** | Flags implausible quantities/order values (e.g. price entered as quantity, OTPs, specs entered as quantity, exorbitant order values for the category). |

### Rule-based gating

To save LLM calls, each check only runs when a deterministic pre-check passes:

- Checks **1** and **2** are mutually exclusive: a one-word (or empty) title runs check 2;
  a multi-word title runs check 1 unless the title is `<3` words and equals the category
  name, or no ISQ were asked.
- Checks **3** and **4** only run when a quick regex match finds candidate PII /
  selling-intent text.
- Check **5** only runs when `quantity * mcat_median` (the probable order value) exceeds
  a configured threshold.

Any check that's skipped is reported with its reason.

---

## Product Quality Checks (3)

Run as a single combined vision-capable LLM call against the product image
(uploaded screenshot or image scraped from the URL), name, price and
description/specs:

1. **Image ↔ Name Relevance** — does the product image actually match the stated product name?
2. **Price Plausibility** — is the price absurd for this kind of product (too high or too low)?
3. **Spec / Description Relevance** — do the listed specs/description match the product shown?

For **Product URL** mode, the page is fetched client-side (via a CORS proxy
fallback chain), and the product name, image, price and description are
extracted from Open Graph / Twitter Card meta tags and JSON-LD `Product`
schema where available.

---

## Getting Started

No install needed — `index.html` is fully self-contained.

1. Download or clone this repo.
2. Open `index.html` directly in a browser, **or** serve it with any static
   file server (recommended, so URL-mode CORS proxies work reliably):

   ```powershell
   # Windows / PowerShell, no Node or Python required
   ./serve.ps1
   # then open http://localhost:8765
   ```

   ```bash
   # or, if you have Python
   python3 -m http.server 8765
   ```

3. Enter your **OpenRouter API key** (`sk-or-v1-…`) — it's stored only in
   your browser's `localStorage` and sent only to OpenRouter.
4. Pick a vision-capable model (default: `google/gemini-2.5-flash-lite`).
5. Choose a tab, provide input, and click **Run Audit**.

---

## Buy Lead input shape

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

### Lead audit response shape

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

## OpenRouter Setup

1. Sign up at [openrouter.ai](https://openrouter.ai) and create an API key.
2. Paste your `sk-or-v1-…` key into the **OpenRouter API Key** field in the app.
3. Pick a vision-capable model (default: `google/gemini-2.5-flash-lite`).

---

## Project Structure

```
├── index.html    # Entire app — UI, styling, audit logic, OpenRouter client
├── serve.ps1     # Optional local static file server (PowerShell, no deps)
└── .claude/launch.json  # Preview launch config for serve.ps1
```

---

## License

MIT
