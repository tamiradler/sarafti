"use client";

import { useState, useTransition } from "react";

export function ReportForm({ restaurantId, submissionId }: { restaurantId?: string; submissionId?: string }) {
  const [reason, setReason] = useState("Incorrect aggregate");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurantId ?? null,
          submissionId: submissionId ?? null,
          reason,
          details: details || null
        })
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      setMessage(payload.message ?? payload.error ?? "Request completed");
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Report incorrect info</h1>
      <p className="mt-1 text-sm text-muted">This action is authenticated and reviewed by admins.</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Reason</label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Details (optional, max 200 chars)</label>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={200}
            className="h-24 w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Submit report
        </button>

        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
