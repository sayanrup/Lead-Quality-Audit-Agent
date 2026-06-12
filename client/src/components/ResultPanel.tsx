import type { ReactNode } from "react";
import type { LeadAuditResult } from "@shared/types";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

function IssueBadge({ flagged, children }: { flagged: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        flagged
          ? "bg-red-100 text-red-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {flagged ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

export default function ResultPanel({ result }: { result: LeadAuditResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Section title="Spec / Title Mismatch & Title Quality">
        <div className="flex flex-wrap gap-2">
          <IssueBadge flagged={result.mismatch_found === 1}>
            Spec/title mismatch: {result.mismatch_found === 1 ? "Found" : "None"}
          </IssueBadge>
          <IssueBadge flagged={result.one_word_issue === 1}>
            One-word title: {result.one_word_issue === 1 ? "Yes" : "No"}
          </IssueBadge>
        </div>
        {result.mismatch_details && (
          <p className="mt-2 text-sm text-slate-600">{result.mismatch_details}</p>
        )}
        {result.enriched_title && (
          <p className="mt-2 text-sm">
            <span className="font-medium text-slate-700">Enriched title: </span>
            <span className="text-slate-900">{result.enriched_title}</span>
          </p>
        )}
      </Section>

      <Section title="Selling Intent">
        <IssueBadge flagged={result.selling_intent_issue === 1}>
          {result.selling_intent_issue === 1
            ? "Looks like a selling post"
            : "Genuine buying requirement"}
        </IssueBadge>
      </Section>

      <Section title="PII Detection">
        <IssueBadge flagged={result.pii === 1}>
          {result.pii === 1 ? "PII found and removed" : "No PII detected"}
        </IssueBadge>
        {result.pii_details && <p className="mt-2 text-sm text-slate-600">{result.pii_details}</p>}
        {result.pii === 1 && (
          <div className="mt-3 space-y-1 text-sm">
            {result.clean_title && (
              <p>
                <span className="font-medium text-slate-700">Clean title: </span>
                {result.clean_title}
              </p>
            )}
            {result.clean_description && (
              <p>
                <span className="font-medium text-slate-700">Clean description: </span>
                {result.clean_description}
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="Absurd Quantity">
        <IssueBadge flagged={result.absurd_qty_issue === 1}>
          {result.absurd_qty_issue === 1 ? "Quantity looks absurd" : "Quantity looks plausible"}
        </IssueBadge>
        {typeof result.estimated_value === "number" && (
          <p className="mt-2 text-sm text-slate-600">
            Estimated order value: ₹{result.estimated_value.toLocaleString("en-IN")}
          </p>
        )}
        {result.absurd_reason && (
          <p className="mt-1 text-sm text-slate-600">{result.absurd_reason}</p>
        )}
      </Section>

      {result.skipped.length > 0 && (
        <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Info className="h-4 w-4" /> Agents skipped by rule-based gating
          </h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {result.skipped.map((s) => (
              <li key={s.agent}>
                <span className="font-medium text-slate-700">{s.agent}</span>: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
