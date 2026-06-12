import { llmCompleteJson, parseLlmJson, type LlmChatMessage } from "../llmClient";

export interface SpecTitleMismatchInput {
  requirement_title: string;
  category: string;
  description: string;
  specification_question: string[];
  specification_answered: (string | number)[];
}

export interface SpecTitleMismatchOutput {
  enriched_title: string;
  mismatch_found: 0 | 1;
  mismatch_details: string;
}

const SYSTEM_MESSAGE = `You are an intelligent spec_title_mismatch detector agent. Your job is to analyse requirement_title, description, specification_question, specification_answered and detect whether any direct contradiction exists. If a contradiction exists, then enrich requirement_title accordingly

### DETECTION RULES
1. Definition of mismatch:

A mismatch exists when specification_answered directly contradicts the requirement_title, description or category name.

2. Modify the requirement_title ONLY when:
 - The conflicting attribute is clearly present in the title.
 - The specification_answered value is factually different after normalization.
 - The attribute affects the core product specification
(e.g., size, weight, material, capacity, power, dimensions, thickness, etc.)

3. How to modify
 - Replace only the conflicting term, not the whole requirement_title.
 - Keep the requirement_title's original structure and wording.
 - Output exactly the updated requirement_title; do not generate new text.
 - Use the contradictory specification value in the updated requirement_title.

4. Strict restrictions
 - Never enrich, append, or add new details in the requirement_title
 - Do NOT modify the requirement_title when ISQ simply introduces extra optional details not present in the title.
 - Do NOT modify the requirement_title when ISQ omits a detail that is present in the title.
 - Do NOT modify the requirement_title when values differ only by formatting, case, synonyms, or equivalent units.

5. Brand / Model / Variant Handling
 - Ignore contradictions involving brand, model, grade, variant, part number.
 - A mismatch is NOT triggered if:
         requirement_title has a brand and specification_answered does not
         specification_answered has a brand and requirement_title does not
 - Brand differences should never cause mismatch.

6. Complementary information:
Do not flag mismatch when specification_answered simply complements or specifies what the requirement_title already implies.

7. Special material correction rule:
If the material mentioned in the requirement_title contradicts the material in specification_answered, update the requirement_title accordingly.
Example: requirement_title is "wood statue" and specification_answered is "stone" then requirement_title should be "stone statue".
flag to be returned  If mismatch_found: 1  else  0`;

export async function runSpecTitleMismatch(
  apiKey: string,
  model: string,
  input: SpecTitleMismatchInput
): Promise<SpecTitleMismatchOutput> {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_MESSAGE },
    {
      role: "user",
      content: `INPUT:
requirement_title: ${input.requirement_title}
description: ${input.description}
specification_question: ${JSON.stringify(input.specification_question)}
specification_answered: ${JSON.stringify(input.specification_answered)}

Return the response strictly in this JSON format only:
{"enriched_title": "string", "mismatch_found": 0, "mismatch_details": "string"}`,
    },
  ];
  const content = await llmCompleteJson(apiKey, model, messages);
  return parseLlmJson<SpecTitleMismatchOutput>(content);
}
