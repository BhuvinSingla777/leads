"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadCsvForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!selectedFile) {
          setMessage("Pick a CSV file first.");
          return;
        }
        setBusy(true);
        setMessage(null);
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);

          const res = await fetch(`/api/tenants/${tenantId}/ingest/csv`, {
            method: "POST",
            body: formData,
          });

          const data = (await res.json()) as { ok?: boolean; error?: string; rowsInserted?: number };
          if (!res.ok || !data.ok) {
            throw new Error(data.error || "Upload failed.");
          }

          setMessage(`Upload complete. Rows inserted: ${data.rowsInserted ?? "?"}.`);
          router.refresh();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setMessage(msg);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-indigo-950">CSV file</label>
          <input
            className="mt-1 block w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setSelectedFile(f);
            }}
          />
          {selectedFile ? (
            <div className="mt-2 text-xs text-indigo-700/70">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload & Analyze"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-indigo-950 shadow-sm">
          {message}
        </div>
      ) : null}
    </form>
  );
}

