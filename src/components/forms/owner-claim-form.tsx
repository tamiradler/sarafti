"use client";

import { useState, useTransition } from "react";

type RestaurantOption = {
  id: string;
  name: string;
  city: string;
};

export function OwnerClaimForm({ restaurants }: { restaurants: RestaurantOption[] }) {
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? "");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setStatusMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/owner-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          requesterName,
          requesterEmail,
          relationship,
          message
        })
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      setStatusMessage(payload.message ?? payload.error ?? "Request completed");
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Restaurant owner correction request</h1>
      <p className="mt-1 text-sm text-muted">Owners can request aggregate corrections or context review.</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Restaurant</label>
          <select
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name} ({restaurant.city})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Your name</label>
            <input
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Business email</label>
            <input
              value={requesterEmail}
              onChange={(event) => setRequesterEmail(event.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Relationship to restaurant</label>
          <input
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Correction request details</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={500}
            className="h-28 w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={isPending || !restaurantId}
          className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Submit correction request
        </button>

        {statusMessage ? <p className="text-sm text-muted">{statusMessage}</p> : null}
      </div>
    </div>
  );
}
