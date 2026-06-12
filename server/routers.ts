import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { runLeadAudit } from "./services/leadAuditOrchestrator";
import type { BuyLeadInput } from "../shared/types";

const buyLeadSchema = z.object({
  display_id: z.union([z.string(), z.number()]).optional(),
  title: z.string().default(""),
  description: z.string().default(""),
  mcat_name: z.string().default(""),

  company_name_flag: z.union([z.literal(0), z.literal(1)]).optional(),
  gst_flag: z.union([z.literal(0), z.literal(1)]).optional(),
  company_address_flag: z.union([z.literal(0), z.literal(1)]).optional(),
  city: z.string().optional(),
  state: z.string().optional(),

  product_viewed_name: z.array(z.string()).optional(),
  product_prices: z.array(z.number()).optional(),

  quantity: z.number().optional(),
  quantity_unit: z.string().optional(),

  mcat_q1: z.number().optional(),
  mcat_median: z.number().optional(),
  mcat_q3: z.number().optional(),

  isq_asked: z.array(z.string()).optional(),
  isq_filled: z.array(z.union([z.string(), z.number()])).optional(),
});

export const appRouter = router({
  leadAudit: router({
    run: publicProcedure
      .input(
        z.object({
          lead: buyLeadSchema,
          llm_api_key: z.string(),
          llm_model: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const { lead, llm_api_key, llm_model } = input;

        if (!llm_api_key.trim()) {
          throw new Error("LLM API key is required");
        }
        if (!llm_model.trim()) {
          throw new Error("LLM model is required");
        }

        return await runLeadAudit(llm_api_key, llm_model, lead as BuyLeadInput);
      }),
  }),
});

export type AppRouter = typeof appRouter;
