import { redirect } from "next/navigation";

import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function stdDev(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export default async function AdminPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [pending, flaggedLogs, groupedCounts, users, recentSubmissions, restaurants] = await Promise.all([
    prisma.submission.findMany({
      where: { status: "PENDING", deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        restaurant: { select: { id: true, name: true, city: true } }
      },
      orderBy: { createdAt: "asc" },
      take: 100
    }),
    prisma.moderationLog.findMany({
      where: { flagged: true },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.submission.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        deletedAt: null
      },
      _count: { _all: true }
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        shadowBanned: true
      }
    }),
    prisma.submission.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        deletedAt: null
      },
      select: { createdAt: true }
    }),
    prisma.restaurant.findMany({
      where: {},
      select: {
        id: true,
        name: true,
        city: true,
        cuisine: true,
        softDeleted: true
      },
      orderBy: [{ softDeleted: "asc" }, { updatedAt: "desc" }],
      take: 60
    })
  ]);

  const suspiciousBase = groupedCounts.filter((item) => item._count._all >= 5);
  const suspiciousUsers = suspiciousBase
    .map((item) => {
      const matched = users.find((userItem) => userItem.id === item.userId);
      if (!matched) {
        return null;
      }

      return {
        userId: item.userId,
        submissions: item._count._all,
        email: matched.email,
        shadowBanned: matched.shadowBanned
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.submissions - a.submissions);

  const dayMap = new Map<string, number>();
  for (const submission of recentSubmissions) {
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

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted">Moderate submissions, investigate risk signals, and manage platform safety.</p>
      </header>

      <AdminDashboardClient
        pending={pending.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString()
        }))}
        flaggedLogs={flaggedLogs.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString()
        }))}
        suspiciousUsers={suspiciousUsers}
        spikes={spikes}
        restaurants={restaurants}
      />
    </div>
  );
}
