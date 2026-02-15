import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function stdDev(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return auth.response;
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const submissions = await prisma.submission.findMany({
    where: {
      createdAt: { gte: since },
      deletedAt: null
    },
    select: {
      createdAt: true
    }
  });

  const dayMap = new Map<string, number>();
  for (const submission of submissions) {
    const key = submission.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }

  const series = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const counts = series.map((item) => item.count);
  const mean = counts.length ? counts.reduce((sum, value) => sum + value, 0) / counts.length : 0;
  const spread = stdDev(counts);
  const threshold = mean + spread * 2;

  const spikes = series.filter((item) => item.count > threshold);

  return NextResponse.json({ series, threshold, spikes });
}
