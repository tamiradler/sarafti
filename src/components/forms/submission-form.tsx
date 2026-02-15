"use client";

import { useMemo, useState, useTransition } from "react";

import { STRUCTURED_REASONS } from "@/lib/constants";

type ExistingSubmission = {
  reasons: string[];
  otherReason: string | null;
  comment: string | null;
  rating: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export function SubmissionForm({
  restaurantId,
  restaurantName,
  existing
}: {
  restaurantId: string;
  restaurantName: string;
  existing: ExistingSubmission | null;
}) {
  const [reasons, setReasons] = useState<string[]>(existing?.reasons ?? []);
  const [otherReason, setOtherReason] = useState(existing?.otherReason ?? "");
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [rating, setRating] = useState<number | "">(existing?.rating ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const includesOther = useMemo(() => reasons.includes("Other"), [reasons]);

  const onReasonToggle = (reason: string, checked: boolean) => {
    setReasons((current) => {
      if (checked) {
        return [...current, reason];
      }

      if (reason === "Other") {
        setOtherReason("");
      }
      return current.filter((item) => item !== reason);
    });
  };

  const submit = () => {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          reasons,
          otherReason: otherReason || null,
          comment: comment || null,
          rating: rating === "" ? null : Number(rating)
        })
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      setMessage(payload.message ?? payload.error ?? "Request completed");
    });
  };

  const remove = () => {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId })
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      setMessage(payload.message ?? payload.error ?? "Request completed");
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Submit feedback for {restaurantName}</h1>
      <p className="mt-1 text-sm text-muted">One active submission per restaurant. Edits are re-reviewed by admins.</p>

      {existing ? (
        <p className="mt-3 rounded-md border border-border bg-bg px-3 py-2 text-sm text-muted">
          Existing status: <strong className="text-text">{existing.status}</strong>
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Structured reasons</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {STRUCTURED_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type="checkbox"
                  checked={reasons.includes(reason)}
                  onChange={(event) => onReasonToggle(reason, event.target.checked)}
                  className="h-4 w-4"
                />
                {reason}
              </label>
            ))}
          </div>
        </div>

        {includesOther ? (
          <div>
            <label className="mb-2 block text-sm font-medium">Other details (max 120 chars)</label>
            <input
              value={otherReason}
              maxLength={120}
              onChange={(event) => setOtherReason(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium">Rating (optional)</label>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value ? Number(event.target.value) : "")}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Short comment (optional, max 200 chars)</label>
          <textarea
            value={comment}
            maxLength={200}
            onChange={(event) => setComment(event.target.value)}
            className="h-24 w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {existing ? "Update submission" : "Submit feedback"}
          </button>
          {existing ? (
            <button
              type="button"
              disabled={isPending}
              onClick={remove}
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm disabled:opacity-60"
            >
              Delete my submission
            </button>
          ) : null}
        </div>

        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
