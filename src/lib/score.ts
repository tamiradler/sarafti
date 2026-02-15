import { SubmissionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const PRIOR_NEGATIVE_RATE = 0.5;
const PRIOR_WEIGHT = 8;

const NEGATIVE_REASON_WEIGHTS: Record<string, number> = {
  "Hygiene concerns": 1,
  "Poor food quality": 0.9,
  "Bad service": 0.8,
  "Long waiting time": 0.65,
  Overpriced: 0.55,
  Other: 0.6
};

type ScorableSubmission = {
  userId: string;
  reasons: string[];
  rating: number | null;
};

function submissionNegativity(submission: ScorableSubmission): number {
  const reasonWeight =
    submission.reasons.length > 0
      ? submission.reasons.reduce((sum, reason) => sum + (NEGATIVE_REASON_WEIGHTS[reason] ?? 0.5), 0) /
        submission.reasons.length
      : 0.6;

  const ratingWeight = submission.rating ? (6 - submission.rating) / 5 : 0.75;
  return Math.max(0, Math.min(1, Math.max(reasonWeight, ratingWeight)));
}

export function computeTopIssues(submissions: Pick<ScorableSubmission, "reasons">[]) {
  const counts = new Map<string, number>();
  let totalReasons = 0;

  for (const submission of submissions) {
    for (const reason of submission.reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
      totalReasons += 1;
    }
  }

  if (totalReasons === 0) {
    return [];
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / totalReasons) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export function computeScoreMetrics(submissions: ScorableSubmission[]) {
  const totalReports = submissions.length;
  if (totalReports === 0) {
    return {
      saraftiScore: 0,
      communityNegativeRate: 0,
      totalSubmissions: 0,
      averageRating: null as number | null,
      topIssues: [] as ReturnType<typeof computeTopIssues>
    };
  }

  const negativeReports = submissions.reduce((sum, submission) => sum + submissionNegativity(submission), 0);
  const rawRate = negativeReports / totalReports;
  const adjustedRate = (negativeReports + PRIOR_NEGATIVE_RATE * PRIOR_WEIGHT) / (totalReports + PRIOR_WEIGHT);

  const uniqueUsers = new Set(submissions.map((submission) => submission.userId)).size;
  const confidenceFactor = 1 - Math.exp(-uniqueUsers / 12);

  const communityNegativeRate = adjustedRate * confidenceFactor;
  const averageRatingValues = submissions.map((submission) => submission.rating).filter((rating): rating is number => rating !== null);
  const averageRating =
    averageRatingValues.length > 0
      ? Number((averageRatingValues.reduce((sum, rating) => sum + rating, 0) / averageRatingValues.length).toFixed(2))
      : null;

  return {
    saraftiScore: Number((communityNegativeRate * 100).toFixed(2)),
    communityNegativeRate,
    totalSubmissions: totalReports,
    averageRating,
    rawRate,
    confidenceFactor,
    topIssues: computeTopIssues(submissions)
  };
}

export async function recalculateRestaurantStats(restaurantId: string) {
  const submissions = await prisma.submission.findMany({
    where: {
      restaurantId,
      status: SubmissionStatus.APPROVED,
      deletedAt: null
    },
    select: {
      userId: true,
      reasons: true,
      rating: true
    }
  });

  const metrics = computeScoreMetrics(submissions);

  await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      saraftiScore: metrics.saraftiScore,
      communityNegativeRate: metrics.communityNegativeRate,
      totalSubmissions: metrics.totalSubmissions,
      averageRating: metrics.averageRating,
      topIssues: metrics.topIssues
    }
  });

  return metrics;
}

export function buildTrendSeries(
  submissions: { createdAt: Date; reasons: string[]; rating: number | null; userId: string }[]
) {
  const buckets = new Map<string, ScorableSubmission[]>();

  for (const submission of submissions) {
    const key = submission.createdAt.toISOString().slice(0, 10);
    const list = buckets.get(key) ?? [];
    list.push(submission);
    buckets.set(key, list);
  }

  return Array.from(buckets.entries())
    .map(([date, items]) => {
      const metrics = computeScoreMetrics(items);
      return {
        date,
        rate: Number((metrics.communityNegativeRate * 100).toFixed(2)),
        submissions: items.length
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
