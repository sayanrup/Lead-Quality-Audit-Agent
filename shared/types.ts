/** A single Buy Lead as submitted for quality audit. */
export interface BuyLeadInput {
  display_id?: string | number;
  title: string;
  description: string;
  /** Category / MCAT name the lead was posted under. */
  mcat_name: string;

  company_name_flag?: 0 | 1;
  gst_flag?: 0 | 1;
  company_address_flag?: 0 | 1;
  city?: string;
  state?: string;

  /** Names of products the buyer viewed in the same session. */
  product_viewed_name?: string[];
  /** Prices of the products the buyer viewed in the same session. */
  product_prices?: number[];

  quantity?: number;
  quantity_unit?: string;

  /** Category-level per-unit price percentiles (INR). */
  mcat_q1?: number;
  mcat_median?: number;
  mcat_q3?: number;

  /** Item-specific-questions asked of the buyer. */
  isq_asked?: string[];
  /** Buyer-provided answers, same order as isq_asked. */
  isq_filled?: (string | number)[];
}

export interface SkippedAgent {
  agent: string;
  reason: string;
}

/** Combined output of all 5 quality checks for one Buy Lead. */
export interface LeadAuditResult {
  display_id?: string | number;

  /** From spec/title-mismatch or one-word-title enrichment (mutually exclusive). */
  enriched_title?: string;

  /** spec_title_mismatch agent */
  mismatch_found: 0 | 1;
  mismatch_details?: string;

  /** one-word title agent */
  one_word_issue: 0 | 1;

  /** PII agent */
  pii: 0 | 1;
  pii_details?: string;
  clean_title?: string;
  clean_description?: string;
  clean_isq_filled?: (string | number)[];

  /** selling intent agent */
  selling_intent_issue: 0 | 1;

  /** absurd quantity agent */
  absurd_qty_issue: 0 | 1;
  absurd_reason?: string;

  /** Computed probable order value (quantity * category median price). */
  estimated_value?: number;

  /** Which LLM agents were skipped by the rule-based gates, and why. */
  skipped: SkippedAgent[];
}
