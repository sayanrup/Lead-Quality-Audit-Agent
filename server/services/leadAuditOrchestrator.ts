import type { BuyLeadInput, LeadAuditResult, SkippedAgent } from "../../shared/types";
import { runSpecTitleMismatch } from "./agents/specTitleMismatch";
import { runOneWordIssue } from "./agents/oneWordIssue";
import { runPiiIssue } from "./agents/piiIssue";
import { runSellingIntent } from "./agents/sellingIntent";
import { runAbsurdQuantity } from "./agents/absurdQuantity";
import {
  ORDER_VALUE_THRESHOLD,
  looksLikePii,
  looksLikeSellingIntent,
  removeIsqEntry,
  upsertIsqEntry,
  wordCount,
} from "./ruleBasedChecks";

/**
 * Runs the 5 buy-lead quality checks against a single lead, mirroring the
 * gating + agent logic of the n8n "Bl Quality Agents" workflow:
 *
 *  1. spec_title_mismatch  - title vs. specification contradictions
 *  2. one-word-title       - enrich a one-word title
 *  3. PII detection        - scrub personal info from title/description/specs
 *  4. selling intent       - flag "buy" leads that are actually selling
 *  5. absurd quantity      - flag implausible quantities / order values
 *
 * Agents 1/2 are mutually exclusive (gated by title word count + category
 * match). Agents 3/4 only run when a quick regex pre-filter finds candidate
 * text. Agent 5 only runs when the computed order value exceeds the
 * configured threshold.
 */
export async function runLeadAudit(
  apiKey: string,
  model: string,
  lead: BuyLeadInput
): Promise<LeadAuditResult> {
  const title = lead.title ?? "";
  const description = lead.description ?? "";
  const category = lead.mcat_name ?? "";
  const isqAsked = lead.isq_asked ?? [];
  const isqFilled = lead.isq_filled ?? [];
  const quantity = Number(lead.quantity) || 0;
  const mcatMedian = Number(lead.mcat_median) || 0;

  const estimatedValue = quantity * mcatMedian;
  const shouldRunOrderValueCheck = estimatedValue > ORDER_VALUE_THRESHOLD;

  const skipped: SkippedAgent[] = [];
  const result: LeadAuditResult = {
    display_id: lead.display_id,
    mismatch_found: 0,
    one_word_issue: 0,
    pii: 0,
    selling_intent_issue: 0,
    absurd_qty_issue: 0,
    estimated_value: estimatedValue,
    skipped,
  };

  // --- Agents 1 & 2: spec/title mismatch vs. one-word title (mutually exclusive) ---
  const titleWordCount = wordCount(title);
  const specQuestionEmpty = isqAsked.length === 0;

  const titleMismatchPromise: Promise<void> = (async () => {
    if (titleWordCount < 2) {
      skipped.push({ agent: "spec_title_mismatch", reason: "title is one word or empty" });

      const out = await runOneWordIssue(apiKey, model, {
        requirement_title: title,
        category,
        specification_question: isqAsked,
        specification_answered: isqFilled,
      });
      result.enriched_title = out.enriched_title;
      result.one_word_issue = out.one_word_issue ?? 1;
      return;
    }

    skipped.push({ agent: "one_word_issue", reason: "title has 2+ words" });

    const sameAsCategory =
      titleWordCount < 3 && title.trim().toLowerCase() === category.trim().toLowerCase();
    if (sameAsCategory || specQuestionEmpty) {
      skipped.push({
        agent: "spec_title_mismatch",
        reason: sameAsCategory
          ? "title is <3 words and matches the category name"
          : "no specification questions were asked",
      });
      return;
    }

    const { asked, filled } = removeIsqEntry(isqAsked, isqFilled, "Quantity");
    const out = await runSpecTitleMismatch(apiKey, model, {
      requirement_title: title,
      category,
      description,
      specification_question: asked,
      specification_answered: filled,
    });
    result.enriched_title = out.enriched_title;
    result.mismatch_found = out.mismatch_found ?? 0;
    result.mismatch_details = out.mismatch_details;
  })();

  // --- Agent 3: PII detection (regex pre-filter) ---
  const combinedText = `${title} ${description} ${isqFilled.join(" ")}`;

  const piiPromise: Promise<void> = (async () => {
    if (!looksLikePii(combinedText)) {
      skipped.push({ agent: "pii_issue", reason: "no PII patterns detected" });
      result.pii = 0;
      result.pii_details = "";
      result.clean_title = title;
      result.clean_description = description;
      result.clean_isq_filled = isqFilled;
      return;
    }

    const out = await runPiiIssue(apiKey, model, {
      requirement_title: title,
      description,
      specification_answered: isqFilled,
    });
    result.pii = out.pii ?? 0;
    result.pii_details = out.pii_details ?? "";
    result.clean_title = out.clean_title ?? title;
    result.clean_description = out.clean_description ?? description;
    result.clean_isq_filled = out.clean_isq_filled ?? isqFilled;
  })();

  // --- Agent 4: selling intent (regex pre-filter) ---
  const sellingPromise: Promise<void> = (async () => {
    if (!looksLikeSellingIntent(combinedText)) {
      skipped.push({ agent: "selling_intent", reason: "no selling-intent keywords detected" });
      result.selling_intent_issue = 0;
      return;
    }

    const out = await runSellingIntent(apiKey, model, {
      requirement_title: title,
      description,
      specification_answered: isqFilled,
    });
    result.selling_intent_issue = out.selling_intent_issue ?? 0;
  })();

  // --- Agent 5: absurd quantity (only above the order-value threshold) ---
  const absurdQtyPromise: Promise<void> = (async () => {
    if (quantity <= 0 || !shouldRunOrderValueCheck) {
      skipped.push({
        agent: "absurd_quantity",
        reason: "quantity is 0 or null or below threshold value",
      });
      result.absurd_qty_issue = 0;
      return;
    }

    const { filled } = upsertIsqEntry(isqAsked, isqFilled, "Probable order value", estimatedValue);

    const out = await runAbsurdQuantity(apiKey, model, {
      requirement_title: title,
      description,
      city: lead.city,
      state: lead.state,
      quantity,
      quantity_unit: lead.quantity_unit,
      category,
      product_viewed_name: lead.product_viewed_name,
      product_prices: lead.product_prices,
      price_Q1: lead.mcat_q1,
      price_median: lead.mcat_median,
      estimated_value: estimatedValue,
      price_Q3: lead.mcat_q3,
      specification_answered: filled,
    });
    result.absurd_qty_issue = out.absurd_qty_issue ?? 0;
    result.absurd_reason = out.absurd_reason ?? "";
  })();

  await Promise.all([titleMismatchPromise, piiPromise, sellingPromise, absurdQtyPromise]);

  return result;
}
