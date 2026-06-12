import { llmCompleteJson, parseLlmJson, type LlmChatMessage } from "../llmClient";

export interface SellingIntentInput {
  requirement_title: string;
  description: string;
  specification_answered: (string | number)[];
}

export interface SellingIntentOutput {
  selling_intent_issue: 0 | 1;
}

const SYSTEM_MESSAGE = `Your task is to determine whether a buyer requirement reflects selling intent(user offering/supplying a product) or a genuine buying requirement.

### DECISION LOGIC
Rule 1: Selling Keywords / Phrases → Selling (1)
If the text explicitly offers to sell, provide, supply, or manufacture a product, classify as selling.

Rule 2: Contextual Inference → Selling (1)
If the text implies ownership or offer, even without direct "sell" keywords, classify as selling.

Rule 3: Buying Keywords / Phrases → Buying (0)
If the text expresses need, search, or interest in purchasing, classify as buying.

Rule 4: Ambiguity Resolution
If ambiguous selling words (like "sell", "seller", "supplier", "reseller") appear inside a buying statement, treat as buying (0).
Examples:
"Need sellers for iron scrap" → buying
"Looking for suppliers who sell" → buying
"Require vendor/seller" → buying
"For reselling" / "For resale" → buying

Rule 5: Generic Terms Alone Don't Imply Selling
Words like "supplier", "dealer", "wholesaler", "reseller", "vendor", or "trader" do not imply selling unless paired with a clear selling or offer phrase (Rule 1 or 2).

Rule 6: Product Detail Structure → Buying (0)
If the text primarily lists product names, quantities, packaging, grades, or units (e.g., "20 kg detergent powder", "10 litre engine oil", "PVC pipe 2 inch") without explicit selling language, classify as buying (0) — these are typical buyer-side requirement structures.

Rule 7: Neutral or Promotional Words
Words like "available", "best price", or "quality product" are neutral.
Only classify as selling (1) if they appear with ownership context, e.g., "We have available", "Our product available".

Rule 8: Mixed Intent Context Handling
If both selling and buying phrases appear together:
If there is any explicit buying phrase asking for a product (e.g., "want", "need", "looking for supplier", "want to buy"),
→ classify as buying (0).
Example:
"Need hand push cart to sell food."
→ buying (0), because the core requirement is to buy hand push cart, even if the user mentions selling.

Rule 9: Default Behavior
If no explicit selling evidence from Rule 1 or 2 is present, classify as buying (0).

### DEFAULT
If no selling criteria match → selling_intent_issue = 0.`;

export async function runSellingIntent(
  apiKey: string,
  model: string,
  input: SellingIntentInput
): Promise<SellingIntentOutput> {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_MESSAGE },
    {
      role: "user",
      content: `Analyze the following buyer-provided content and determine selling intent:

requirement_title: ${input.requirement_title}
description: ${input.description}
specification_answered: ${JSON.stringify(input.specification_answered)}

Return the final response strictly in this JSON format only:
{"selling_intent_issue": 0}`,
    },
  ];
  const content = await llmCompleteJson(apiKey, model, messages);
  return parseLlmJson<SellingIntentOutput>(content);
}
