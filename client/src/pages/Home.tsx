import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SAMPLE_LEAD } from "@/lib/sampleLead";
import ResultPanel from "@/components/ResultPanel";
import { Loader2, PlayCircle, Sparkles } from "lucide-react";

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export default function HomePage() {
  const [leadJson, setLeadJson] = useState(JSON.stringify(SAMPLE_LEAD, null, 2));
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("lqaa_api_key") ?? ""
  );
  const [model, setModel] = useState(
    () => localStorage.getItem("lqaa_model") ?? DEFAULT_MODEL
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const audit = trpc.leadAudit.run.useMutation();

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    localStorage.setItem("lqaa_api_key", value);
  }

  function handleModelChange(value: string) {
    setModel(value);
    localStorage.setItem("lqaa_model", value);
  }

  function loadSample() {
    setLeadJson(JSON.stringify(SAMPLE_LEAD, null, 2));
    setParseError(null);
    audit.reset();
  }

  function runAudit() {
    setParseError(null);
    let lead: unknown;
    try {
      lead = JSON.parse(leadJson);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    audit.mutate({ lead: lead as never, llm_api_key: apiKey, llm_model: model });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5">
          <h1 className="text-xl font-semibold text-slate-900">Lead Quality Audit Agent</h1>
          <p className="mt-1 text-sm text-slate-600">
            Run an AI-powered quality audit on a Buy Lead: spec/title mismatch, one-word title
            enrichment, PII detection, selling-intent detection, and absurd-quantity detection.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">OpenRouter API key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-or-v1-..."
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Stored only in your browser's localStorage.
              </span>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Model</span>
              <input
                type="text"
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                placeholder={DEFAULT_MODEL}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Buy Lead JSON</h2>
            <button
              type="button"
              onClick={loadSample}
              className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" /> Load sample
            </button>
          </div>
          <textarea
            value={leadJson}
            onChange={(e) => setLeadJson(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 focus:border-blue-500 focus:outline-none"
          />
          {parseError && <p className="mt-2 text-sm text-red-600">Invalid JSON: {parseError}</p>}

          <button
            type="button"
            onClick={runAudit}
            disabled={audit.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {audit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run Audit
          </button>

          {audit.error && (
            <p className="mt-3 text-sm text-red-600">{audit.error.message}</p>
          )}
        </section>

        {audit.data && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Audit Results</h2>
            <ResultPanel result={audit.data} />
          </section>
        )}
      </main>
    </div>
  );
}
