import Link from "next/link";
import { Prisma } from "@prisma/client";

import { DISCLAIMER_TEXT } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseFloatFromSearch } from "@/lib/utils";

type SearchParamValue = string | string[] | undefined;

export const dynamic = "force-dynamic";

function getValue(value: SearchParamValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Home({
  searchParams
}: {
  searchParams: Record<string, SearchParamValue>;
}) {
  const q = getValue(searchParams.q).trim();
  const city = getValue(searchParams.city).trim();
  const cuisine = getValue(searchParams.cuisine).trim();
  const sort = getValue(searchParams.sort).trim() || "most_reported";
  const minRating = parseFloatFromSearch(getValue(searchParams.minRating) || null, 0);
  const maxRating = parseFloatFromSearch(getValue(searchParams.maxRating) || null, 5);

  const where: Prisma.RestaurantWhereInput = {
    softDeleted: false,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(cuisine && cuisine !== "all" ? { cuisine: { equals: cuisine, mode: "insensitive" } } : {}),
    ...(minRating > 0 || maxRating < 5
      ? {
          averageRating: {
            gte: minRating,
            lte: maxRating
          }
        }
      : {})
  };

  const orderBy: Prisma.RestaurantOrderByWithRelationInput[] =
    sort === "highest_score"
      ? [{ saraftiScore: "desc" }, { totalSubmissions: "desc" }]
      : sort === "rating"
        ? [{ averageRating: "desc" }, { totalSubmissions: "desc" }]
        : [{ totalSubmissions: "desc" }, { updatedAt: "desc" }];

  const [restaurants, cuisines] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      orderBy,
      take: 60,
      select: {
        id: true,
        name: true,
        city: true,
        cuisine: true,
        saraftiScore: true,
        communityNegativeRate: true,
        totalSubmissions: true,
        averageRating: true,
        topIssues: true
      }
    }),
    prisma.restaurant.findMany({
      where: { softDeleted: false },
      distinct: ["cuisine"],
      select: { cuisine: true },
      orderBy: { cuisine: "asc" }
    })
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-muted">Community Dining Trend Signals</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Know before you dine.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Sarafti aggregates structured community experiences into transparent, statistical trends for restaurants.
        </p>
        <p className="mt-3 text-sm text-muted">{DISCLAIMER_TEXT}</p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <form className="grid gap-3 md:grid-cols-6" action="/" method="GET">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search restaurant or city"
            className="md:col-span-2 rounded-md border border-border bg-bg px-3 py-2"
          />
          <input
            name="city"
            defaultValue={city}
            placeholder="Filter city"
            className="rounded-md border border-border bg-bg px-3 py-2"
          />
          <select name="cuisine" defaultValue={cuisine || "all"} className="rounded-md border border-border bg-bg px-3 py-2">
            <option value="all">All cuisines</option>
            {cuisines.map((item) => (
              <option key={item.cuisine} value={item.cuisine}>
                {item.cuisine}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} className="rounded-md border border-border bg-bg px-3 py-2">
            <option value="most_reported">Most reported</option>
            <option value="highest_score">Highest Sarafti Score</option>
            <option value="rating">Highest rating average</option>
          </select>
          <button type="submit" className="rounded-md border border-accent bg-accent px-3 py-2 text-sm font-medium text-white">
            Apply
          </button>

          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <input
              name="minRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              defaultValue={minRating || ""}
              placeholder="Min rating"
              className="rounded-md border border-border bg-bg px-3 py-2"
            />
            <input
              name="maxRating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              defaultValue={maxRating !== 5 ? maxRating : ""}
              placeholder="Max rating"
              className="rounded-md border border-border bg-bg px-3 py-2"
            />
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {restaurants.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">No restaurants match your filters.</div>
        ) : null}

        {restaurants.map((restaurant) => {
          const topIssues = Array.isArray(restaurant.topIssues)
            ? (restaurant.topIssues as { reason: string; percentage: number }[])
            : [];

          return (
            <article key={restaurant.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{restaurant.name}</h2>
                  <p className="text-sm text-muted">
                    {restaurant.city} | {restaurant.cuisine}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-bg px-3 py-1 text-xs">Score {Math.round(restaurant.saraftiScore)}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted">Community Negative Rate</p>
                  <p className="mt-1 text-lg font-semibold">{Math.round(restaurant.communityNegativeRate * 100)}%</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-muted">Submissions</p>
                  <p className="mt-1 text-lg font-semibold">{restaurant.totalSubmissions}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium">Top structured issues</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {topIssues.length === 0 ? <li>No approved issue distribution yet.</li> : null}
                  {topIssues.map((issue) => (
                    <li key={issue.reason}>
                      {issue.reason}: {issue.percentage}%
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex gap-2">
                <Link href={`/restaurants/${restaurant.id}`} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm">
                  View details
                </Link>
                <Link
                  href={`/submit/${restaurant.id}`}
                  className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm text-white"
                >
                  Submit feedback
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
