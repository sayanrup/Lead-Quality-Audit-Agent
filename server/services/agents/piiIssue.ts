import { llmCompleteJson, parseLlmJson, type LlmChatMessage } from "../llmClient";

export interface PiiIssueInput {
  requirement_title: string;
  description: string;
  specification_answered: (string | number)[];
}

export interface PiiIssueOutput {
  pii: 0 | 1;
  pii_details: string;
  clean_title: string;
  clean_description: string;
  clean_isq_filled: (string | number)[];
}

const SYSTEM_MESSAGE = `Your task is to detect and remove PII (Personally Identifiable Information).
Scan Requirement Title, description and  specification_answered for any information that can identify, locate, or allow direct contact with the buyer.

### WHAT COUNTS AS REAL PII

PII patterns to flag:

 - Mobile numbers (10+ digit sequences, with/without country code).
 - Email addresses
 - Buyer's company name. Only when it is a unique legal/registered company name of the buyer (e.g., Sharma Transport Co., Maa Laxmi Enterprises, AVR Steel Traders Pvt Ltd).

 NOT PII: Brand or manufacturer names like Havells, Ashok Leyland, Tata Motors, Asian Paints not to be marked as PII
 - Address of the business or address of the person like House numbers, street numbers, pin codes, shop numbers etc.
 - Any link containing social media or personal identifiers (e.g., facebook.com/xyz, instagram.com/abc, justdial.com/...)
 - Credit card numbers (16-digit).
 - GSTIN (15-char alphanumeric), PAN (10-char alphanumeric).
 - Explicit contact requests ("call me at", "whatsapp me", etc.)

### DO NOT TREAT AS PII

 - Generic words: "WhatsApp", "call", "contact", "details"
 - Numbers less than 6 digits
 - Generic locality/area names without house numbers
 - SKU numbers, model numbers, part codes
 - Brand names or manufacturer names

#### Cleaning rules
Replace ONLY the PII substring with a blank (remove it), and restructure the sentence to maintain readability.

Ensure the remaining sentence is grammatically correct and meaningful.
If no PII is found → pii = 0, pii_details = ""`;

export async function runPiiIssue(
  apiKey: string,
  model: string,
  input: PiiIssueInput
): Promise<PiiIssueOutput> {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_MESSAGE },
    {
      role: "user",
      content: `Input:-
requirement_title: ${input.requirement_title}
description: ${input.description}
specification_answered: ${JSON.stringify(input.specification_answered)}

Return the response strictly in this JSON format only:
{"pii": 0, "pii_details": "string", "clean_title": "string", "clean_description": "string", "clean_isq_filled": ["string"]}`,
    },
  ];
  const content = await llmCompleteJson(apiKey, model, messages);
  return parseLlmJson<PiiIssueOutput>(content);
}
