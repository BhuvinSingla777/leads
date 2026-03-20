"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateInsightsButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Generate AI-style insights</div>
          <div className="mt-1 text-xs text-indigo-700/70">
            Uses heuristics by default; if `OPENAI_API_KEY` is set, it can call OpenAI for richer narrative.
          </div>
        </div>
        <button
          onClick={async () => {
            setBusy(true);
            setMessage(null);
            try {
              const res = await fetch(`/api/tenants/${tenantId}/insights/generate`, { method: "POST" });
              const data = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !data.ok) throw new Error(data.error || "Failed to generate insights.");
              setMessage("Insights generated.");
              router.refresh();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              setMessage(msg);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Generating..." : "Generate Insights"}
        </button>
      </div>
      {message ? (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-indigo-950 shadow-sm">
          {message}
        </div>
      ) : null}
    </div>
  );
}

