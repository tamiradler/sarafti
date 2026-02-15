"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PendingSubmission = {
  id: string;
  reasons: string[];
  otherReason: string | null;
  comment: string | null;
  rating: number | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  restaurant: { id: string; name: string; city: string };
};

type FlaggedLog = {
  id: string;
  inputType: string;
  content: string;
  createdAt: string;
  user: { email: string } | null;
};

type SuspiciousUser = {
  userId: string;
  submissions: number;
  email: string;
  shadowBanned: boolean;
};

type Spike = {
  date: string;
  count: number;
};

type RestaurantAdminRow = {
  id: string;
  name: string;
  city: string;
  cuisine: string;
  softDeleted: boolean;
};

export function AdminDashboardClient({
  pending,
  flaggedLogs,
  suspiciousUsers,
  spikes,
  restaurants
}: {
  pending: PendingSubmission[];
  flaggedLogs: FlaggedLog[];
  suspiciousUsers: SuspiciousUser[];
  spikes: Spike[];
  restaurants: RestaurantAdminRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const mutate = (url: string, body?: object) => {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      setMessage(payload.message ?? payload.error ?? "Done");
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Pending submissions</h2>
        <p className="mt-1 text-sm text-muted">Approve/reject before a submission affects score calculations.</p>

        <div className="mt-4 space-y-4">
          {pending.length === 0 ? <p className="text-sm text-muted">No pending submissions.</p> : null}

          {pending.map((item) => (
            <article key={item.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {item.restaurant.name} ({item.restaurant.city})
                  </p>
                  <p className="text-xs text-muted">
                    {item.user.email} | {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => mutate(`/api/admin/submissions/${item.id}/approve`)}
                    className="rounded-md border border-accent bg-accent px-3 py-1.5 text-xs text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => mutate(`/api/admin/submissions/${item.id}/reject`)}
                    className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => mutate(`/api/admin/submissions/${item.id}/soft-delete`)}
                    className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs"
                  >
                    Soft delete
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted">Reasons: {item.reasons.join(", ")}</p>
              {item.otherReason ? <p className="mt-1 text-sm text-muted">Other: {item.otherReason}</p> : null}
              {item.comment ? <p className="mt-1 text-sm text-muted">Comment: {item.comment}</p> : null}
              {item.rating ? <p className="mt-1 text-sm text-muted">Rating: {item.rating}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Restaurant moderation</h2>
        <p className="mt-1 text-sm text-muted">Soft-delete restaurants from public browse while preserving audit data.</p>

        <div className="mt-4 space-y-3">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {restaurant.name} ({restaurant.city})
                </p>
                <p className="text-muted">{restaurant.cuisine}</p>
              </div>

              <button
                type="button"
                disabled={isPending || restaurant.softDeleted}
                onClick={() => mutate(`/api/admin/restaurants/${restaurant.id}/soft-delete`)}
                className="rounded-md border border-border bg-bg px-3 py-1.5 disabled:opacity-50"
              >
                {restaurant.softDeleted ? "Soft-deleted" : "Soft delete"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Flagged moderation logs</h2>
        <div className="mt-4 space-y-3">
          {flaggedLogs.length === 0 ? <p className="text-sm text-muted">No flagged logs.</p> : null}
          {flaggedLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{log.inputType}</p>
              <p className="mt-1 text-muted">{log.content}</p>
              <p className="mt-1 text-xs text-muted">
                {log.user?.email ?? "anonymous"} | {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Suspicious accounts</h2>
        <p className="mt-1 text-sm text-muted">Accounts with high recent submission velocity.</p>

        <div className="mt-4 space-y-3">
          {suspiciousUsers.length === 0 ? <p className="text-sm text-muted">No suspicious accounts detected.</p> : null}
          {suspiciousUsers.map((user) => (
            <div key={user.userId} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-muted">Submissions (7d): {user.submissions}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => mutate(`/api/admin/users/${user.userId}/shadow-ban`, { shadowBanned: !user.shadowBanned })}
                className="rounded-md border border-border bg-bg px-3 py-1.5"
              >
                {user.shadowBanned ? "Unban" : "Shadow ban"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Abnormal reporting spikes</h2>
        <div className="mt-4 space-y-2">
          {spikes.length === 0 ? <p className="text-sm text-muted">No spikes detected in the last 14 days.</p> : null}
          {spikes.map((spike) => (
            <p key={spike.date} className="rounded-md border border-border p-2 text-sm">
              {spike.date}: {spike.count} submissions
            </p>
          ))}
        </div>
      </section>

      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}
