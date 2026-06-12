import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  // Forward the original error message to the client so the UI can show the
  // exact LLM provider response instead of a generic INTERNAL_SERVER_ERROR.
  errorFormatter({ shape, error }) {
    const msg = error.cause instanceof Error ? error.cause.message : error.message;
    return { ...shape, message: msg };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
