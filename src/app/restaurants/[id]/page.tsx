import Link from "next/link";
import { SubmissionStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { ReasonDistributionChart, TrendChart } from "@/components/charts/restaurant-charts";
import { DISCLAIMER_TEXT } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildTrendSeries, computeScoreMetrics, computeTopIssues } from "@/lib/score";

export const dynamic = "force-dynamic";

export default async function RestaurantDetailPage({ params }: { params: { id: string } }) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: params.id, softDeleted: false },
    select: {
      id: true,
      name: true,
      city: true,
      cuisine: true,
      address: true,
      totalSubmissions: true,
      averageRating: true,
      submissions: {
        where: {
          status: SubmissionStatus.APPROVED,
          deletedAt: null
        },
        select: {
          reasons: true,
          rating: true,
          createdAt: true,
          userId: true
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!restaurant) {
    notFound();
  }

  const metrics = computeScoreMetrics(restaurant.submissions);
  const reasonDistribution = computeTopIssues(restaurant.submissions);
  const trend = buildTrendSeries(restaurant.submissions);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{restaurant.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {restaurant.city} | {restaurant.cuisine}
              {restaurant.address ? ` | ${restaurant.address}` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-bg px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Sarafti Score</p>
            <p className="text-2xl font-semibold">{Math.round(metrics.saraftiScore)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">Community Negative Rate</p>
            <p className="mt-1 text-xl font-semibold">{Math.round(metrics.communityNegativeRate * 100)}%</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">Based on submissions</p>
            <p className="mt-1 text-xl font-semibold">{metrics.totalSubmissions}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted">Average rating</p>
            <p className="mt-1 text-xl font-semibold">{metrics.averageRating?.toFixed(1) ?? "N/A"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/submit/${restaurant.id}`} className="rounded-md border border-accent bg-accent px-3 py-1.5 text-sm text-white">
            Submit feedback
          </Link>
          <Link href={`/report?restaurantId=${restaurant.id}`} className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm">
            Report incorrect info
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted">{DISCLAIMER_TEXT}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">Reason distribution</h2>
          <p className="mt-1 text-sm text-muted">Percentage split by structured issue categories.</p>
          <div className="mt-4">
            <ReasonDistributionChart data={reasonDistribution} />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold">Trend over time</h2>
          <p className="mt-1 text-sm text-muted">Daily trend of adjusted negative rate and approved volume.</p>
          <div className="mt-4">
            <TrendChart data={trend} />
          </div>
        </article>
      </section>
    </div>
  );
}
