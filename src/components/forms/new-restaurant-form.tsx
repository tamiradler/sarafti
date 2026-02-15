"use client";

import { useState, useTransition } from "react";

export function NewRestaurantForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, cuisine, address: address || null })
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        restaurant?: { id: string };
      };

      setMessage(payload.message ?? payload.error ?? "Request completed");
      if (payload.restaurant?.id) {
        window.location.href = `/restaurants/${payload.restaurant.id}`;
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Add a restaurant</h1>
      <p className="mt-1 text-sm text-muted">Visible publicly after creation. Feedback impact still requires admin-approved submissions.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Restaurant name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">City</label>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Cuisine</label>
          <input
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Address (optional)</label>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Create restaurant
        </button>
        {message ? <span className="text-sm text-muted">{message}</span> : null}
      </div>
    </div>
  );
}
