import { llmCompleteJson, parseLlmJson, type LlmChatMessage } from "../llmClient";

export interface OneWordIssueInput {
  requirement_title: string;
  category: string;
  specification_question: string[];
  specification_answered: (string | number)[];
}

export interface OneWordIssueOutput {
  enriched_title: string;
  one_word_issue: 0 | 1;
}

const SYSTEM_MESSAGE = `Your task is to enhance the given one-word buyer requirement title and convert it into a detailed and specific requirement title using available buyer-provided information.

### ENRICHMENT RULES

1.  Preserve original keywords (never delete/replace).
2.  Enrich with relevant specification_answered values:
   - For mobiles: use attribute labels (e.g. "32 GB ROM 3 GB RAM Redmi").
   - For others: add values without labels if clearly understood (e.g., "1 mm Guns").
3.  Avoid redundancy:
   - Drop duplicates/synonyms.
   - Ignore vague values like "Other Details".
4. Include only **meaningful and relevant specification_answered values**.
5.  Special cases:
   - Remove hyphens from non-chemicals.
   - Preserve hyphens in chemicals.
   - Preserve brand/model names exactly.
6. Enriched title should not be more than 6 words.`;

export async function runOneWordIssue(
  apiKey: string,
  model: string,
  input: OneWordIssueInput
): Promise<OneWordIssueOutput> {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_MESSAGE },
    {
      role: "user",
      content: `Here is the buyer's input data:

requirement_title: ${input.requirement_title}
category: ${input.category}
specification_question: ${JSON.stringify(input.specification_question)}
specification_answered: ${JSON.stringify(input.specification_answered)}
one_word_issue: 1

Return the response strictly in this JSON format only:
{"enriched_title": "string", "one_word_issue": 0}`,
    },
  ];
  const content = await llmCompleteJson(apiKey, model, messages);
  return parseLlmJson<OneWordIssueOutput>(content);
}
