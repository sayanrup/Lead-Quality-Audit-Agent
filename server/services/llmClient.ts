import { ENV } from "../_core/env";

export interface LlmChatMessage {
  role: "system" | "user";
  content: string;
}

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigError";
  }
}

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

/** Hard per-call timeout. Guards against requests that never come back. */
const LLM_REQUEST_TIMEOUT_MS = 120_000;

/** HTTP statuses that justify a retry (model overloads, gateway timeouts, rate limits). */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Backoff between retries (ms); also controls retry count via array length. */
const RETRY_BACKOFF_MS = [1000, 3000, 7000];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls an OpenAI-compatible chat completions endpoint and returns the raw
 * JSON string content of the assistant's response. Retries on transient
 * gateway/network errors.
 */
export async function llmCompleteJson(
  llmApiKey: string,
  llmModel: string,
  messages: LlmChatMessage[]
): Promise<string> {
  const key = llmApiKey.trim();
  const hasUserKey = key.length > 0;
  const hasServerKey = ENV.llm.apiKey.trim().length > 0;

  if (!hasUserKey && !hasServerKey) {
    throw new LlmConfigError(
      "LLM not configured. Add your OpenRouter API key (sk-or-...) and model in the app, " +
        "or set LLM_API_KEY (and optionally LLM_MODEL / LLM_BASE_URL) on the server."
    );
  }

  const effectiveKey = hasUserKey ? key : ENV.llm.apiKey.trim();
  const url = effectiveKey.startsWith("sk-or-")
    ? OPENROUTER_BASE
    : (ENV.llm.baseUrl || "").trim() || OPENROUTER_BASE;
  const model = llmModel.trim() || ENV.llm.model || "google/gemini-2.5-flash-lite";

  const body = JSON.stringify({
    model,
    messages,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      if (!res.ok) {
        const transient = RETRYABLE_STATUS.has(res.status);
        if (transient && attempt < RETRY_BACKOFF_MS.length) {
          const wait = RETRY_BACKOFF_MS[attempt]!;
          lastError = new Error(`LLM gateway ${res.status}: ${text.slice(0, 300)}`);
          await delay(wait);
          continue;
        }
        throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 500)}`);
      }

      const data = JSON.parse(text) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("LLM returned empty content");
      }
      return content;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork =
        err instanceof Error &&
        /fetch|network|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(err.message);
      if ((isAbort || isNetwork) && attempt < RETRY_BACKOFF_MS.length) {
        const wait = RETRY_BACKOFF_MS[attempt]!;
        lastError = err as Error;
        await delay(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("LLM request failed after retries");
}

/** Parses the LLM's JSON content, tolerating ```json fences if the model adds them. */
export function parseLlmJson<T>(content: string): T {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1]!.trim() : trimmed;
  return JSON.parse(jsonText) as T;
}
