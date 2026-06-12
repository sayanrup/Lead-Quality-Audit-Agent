import { llmCompleteJson, parseLlmJson, type LlmChatMessage } from "../llmClient";

export interface AbsurdQuantityInput {
  requirement_title: string;
  description: string;
  city?: string;
  state?: string;
  quantity: number;
  quantity_unit?: string;
  category: string;
  product_viewed_name?: string[];
  product_prices?: number[];
  price_Q1?: number;
  price_median?: number;
  estimated_value: number;
  price_Q3?: number;
  specification_answered: (string | number)[];
}

export interface AbsurdQuantityOutput {
  absurd_qty_issue: 0 | 1;
  absurd_reason: string;
}

const SYSTEM_MESSAGE = `Your job is to decide whether the buyer-entered quantity is absurd (1) or not absurd (0) based strictly on the rules below.

### RULES FOR ABSURD QUANTITY
1. Buyer enters non-standard, non-round or scribbled value via keypad, which may not be an actual requirement, like 43869, 782323, are to be marked as absurd quantity.
2. Buyer enters an exorbitantly high quantity or Value that is highly improbable for a genuine business buyer.
To determine this, follow these rules:

A. Mandatory estimated value calculation
always consider estimated values in Indian Rupees.
you must display the estimated values in your reasoning.

B. Interpretation of category pricing
category Median, Q1, Q3 represent per-unit price on IndiaMART.
Use whichever of these is provided.

C. When to mark as "absurd (1)"
Mark the requirement as absurd (1) if the estimated order value or quantity is extremely unrealistic for a single buyer, considering:
        Standard, Non-Consumable, Non-Commodity Products
        (Machinery, furniture, electronics, industrial equipment, complex items)
        These are not purchased in extremely high volumes.
        → Mark absurd (1) when quantity or calculated value is exorbitantly high and commercially implausible.
        Examples:
        10,000,000 pieces of iPhones
        2,500 sofa sets
        These quantities are impossible for a typical Indian business buyer.

D. High-volume consumables & commodities
(Rice, sugar, cement, steel, grains, chemicals, etc).
Even for these, the quantity should be evaluated against:
The highest plausible industry-level order sizes
Typical procurement standards in India.
If the quantity is far beyond even large commercial usage, or the computed value is abnormally high → mark absurd (1).

E. Core Principle
Regardless of product type, if the calculated order value is massively beyond realistic procurement capability for a single buyer in India, it must be marked Absurd (1).

3. Specifications entered as quantity, for example. Syntex Water Tank,quantity is filled 1000 Piece, which is actually capacity 1000 litres, wrongly entered by the buyer as 1000 piece. So, if the quantity is huge & it matches with some specification details then it is absurd. Another example is Power Audio Amplifier of 7000 W has quantity wrongly entered as 7000 piece, which 1 buyer can never have as requirement. Similarly Model numbers entered as quantities should be marked absurd.
4. Many buyers enter the price at which they need the product or total order value of their requirement. This usually happens typically on Indiamart with specific categories like smartphones of 5000 rupees are entered as 5000 pieces. Similarly, LED TV of 8000 rupees is entered as 8000 pieces. These are absurd.

5. In addition, at times, the quantity entered is a value close (e.g., within 20-30% up or down) to the prices of the product, including the category unit price Data in rupees (Q1, Median, Q3). This also indicates putting Price as quantity and should be marked absurd.

6. Many times, buyers enter OTP( 4 digits) as a quantity, which usually happens due to auto-fill from mobile phones, which is also absurd.

7. Price of products viewed to be referenced to understand the products viewed by the buyer in the same session & accordingly decide whether quantity is very high as Buyer might want to enter Price at which he wants.

8. If quantity is highly improbable for a single buyer, and without GST, business details, lower tier city, it is likely that the buyer has wrongly entered quantity.
9. Contextual improbability (lack of verification): If Quantity is highly improbable for a single buyer and lacks essential business details (GST, company name, address flags are 0). Mark as absurd (1).
- Absurd_qty_issue with 1 if absurd.
- Replace absurd_reason with a short text if absurd.`;

export async function runAbsurdQuantity(
  apiKey: string,
  model: string,
  input: AbsurdQuantityInput
): Promise<AbsurdQuantityOutput> {
  const messages: LlmChatMessage[] = [
    { role: "system", content: SYSTEM_MESSAGE },
    {
      role: "user",
      content: `Analyze the following buyer-provided data and determine if the entered quantity is absurd based on the defined rules:

requirement_title: ${input.requirement_title}
description: ${input.description}
city: ${input.city ?? ""}
state: ${input.state ?? ""}
quantity: ${input.quantity}
quantity_unit: ${input.quantity_unit ?? ""}
category: ${input.category}
product_viewed_name: ${JSON.stringify(input.product_viewed_name ?? [])}
product_prices: ${JSON.stringify(input.product_prices ?? [])}
price_Q1: ${input.price_Q1 ?? ""}
price_median: ${input.price_median ?? ""}
estimated_value: ${input.estimated_value}
price_Q3: ${input.price_Q3 ?? ""}
specification_answered: ${JSON.stringify(input.specification_answered)}

Return the response strictly in this JSON format only. Do not add explanation or reasoning:
{"absurd_qty_issue": 0, "absurd_reason": ""}`,
    },
  ];
  const content = await llmCompleteJson(apiKey, model, messages);
  return parseLlmJson<AbsurdQuantityOutput>(content);
}
