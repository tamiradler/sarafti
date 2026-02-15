import { PrismaClient, SubmissionStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

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

function submissionNegativity(submission: { reasons: string[]; rating: number | null }) {
  const reasonWeight =
    submission.reasons.length > 0
      ? submission.reasons.reduce((sum, reason) => sum + (NEGATIVE_REASON_WEIGHTS[reason] ?? 0.5), 0) /
        submission.reasons.length
      : 0.6;
  const ratingWeight = submission.rating ? (6 - submission.rating) / 5 : 0.75;
  return Math.max(0, Math.min(1, Math.max(reasonWeight, ratingWeight)));
}

function computeMetrics(submissions: { userId: string; reasons: string[]; rating: number | null }[]) {
  if (submissions.length === 0) {
    return {
      saraftiScore: 0,
      communityNegativeRate: 0,
      totalSubmissions: 0,
      averageRating: null as number | null,
      topIssues: [] as { reason: string; count: number; percentage: number }[]
    };
  }

  const totalReports = submissions.length;
  const negativeReports = submissions.reduce((sum, submission) => sum + submissionNegativity(submission), 0);
  const adjustedRate = (negativeReports + PRIOR_NEGATIVE_RATE * PRIOR_WEIGHT) / (totalReports + PRIOR_WEIGHT);
  const uniqueUsers = new Set(submissions.map((submission) => submission.userId)).size;
  const confidenceFactor = 1 - Math.exp(-uniqueUsers / 12);
  const communityNegativeRate = adjustedRate * confidenceFactor;

  const ratingValues = submissions.map((submission) => submission.rating).filter((value): value is number => value !== null);
  const averageRating =
    ratingValues.length > 0
      ? Number((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(2))
      : null;

  const reasonCounts = new Map<string, number>();
  let reasonTotal = 0;
  for (const submission of submissions) {
    for (const reason of submission.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
      reasonTotal += 1;
    }
  }

  const topIssues = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: reasonTotal > 0 ? Math.round((count / reasonTotal) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    saraftiScore: Number((communityNegativeRate * 100).toFixed(2)),
    communityNegativeRate,
    totalSubmissions: totalReports,
    averageRating,
    topIssues
  };
}

async function recalculateRestaurantStats(restaurantId: string) {
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

  const metrics = computeMetrics(submissions);

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
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sarafti.dev";

  const [admin, user1, user2, user3] = await Promise.all([
    prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: UserRole.ADMIN, emailVerified: new Date() },
      create: {
        email: adminEmail,
        name: "Sarafti Admin",
        role: UserRole.ADMIN,
        emailVerified: new Date()
      }
    }),
    prisma.user.upsert({
      where: { email: "dana@example.com" },
      update: { emailVerified: new Date() },
      create: {
        email: "dana@example.com",
        name: "Dana",
        emailVerified: new Date()
      }
    }),
    prisma.user.upsert({
      where: { email: "yossi@example.com" },
      update: { emailVerified: new Date() },
      create: {
        email: "yossi@example.com",
        name: "Yossi",
        emailVerified: new Date()
      }
    }),
    prisma.user.upsert({
      where: { email: "maya@example.com" },
      update: { emailVerified: new Date() },
      create: {
        email: "maya@example.com",
        name: "Maya",
        emailVerified: new Date()
      }
    })
  ]);

  const restaurants = await Promise.all([
    prisma.restaurant.upsert({
      where: { name_city: { name: "Orchid Bistro", city: "Tel Aviv" } },
      update: { cuisine: "Mediterranean", softDeleted: false },
      create: {
        name: "Orchid Bistro",
        city: "Tel Aviv",
        cuisine: "Mediterranean",
        address: "41 Allenby St",
        createdById: admin.id
      }
    }),
    prisma.restaurant.upsert({
      where: { name_city: { name: "North Fork Grill", city: "Haifa" } },
      update: { cuisine: "Steakhouse", softDeleted: false },
      create: {
        name: "North Fork Grill",
        city: "Haifa",
        cuisine: "Steakhouse",
        address: "9 Carmel Road",
        createdById: admin.id
      }
    }),
    prisma.restaurant.upsert({
      where: { name_city: { name: "Luna Noodles", city: "Jerusalem" } },
      update: { cuisine: "Asian", softDeleted: false },
      create: {
        name: "Luna Noodles",
        city: "Jerusalem",
        cuisine: "Asian",
        address: "118 Jaffa Road",
        createdById: admin.id
      }
    })
  ]);

  await prisma.submission.upsert({
    where: {
      userId_restaurantId: {
        userId: user1.id,
        restaurantId: restaurants[0].id
      }
    },
    update: {
      reasons: ["Bad service", "Long waiting time"],
      comment: "Very slow seating and inattentive staff.",
      rating: 2,
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id,
      deletedAt: null
    },
    create: {
      userId: user1.id,
      restaurantId: restaurants[0].id,
      reasons: ["Bad service", "Long waiting time"],
      comment: "Very slow seating and inattentive staff.",
      rating: 2,
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id
    }
  });

  await prisma.submission.upsert({
    where: {
      userId_restaurantId: {
        userId: user2.id,
        restaurantId: restaurants[0].id
      }
    },
    update: {
      reasons: ["Overpriced", "Poor food quality"],
      rating: 2,
      comment: "Price-quality mismatch for the main dishes.",
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id,
      deletedAt: null
    },
    create: {
      userId: user2.id,
      restaurantId: restaurants[0].id,
      reasons: ["Overpriced", "Poor food quality"],
      rating: 2,
      comment: "Price-quality mismatch for the main dishes.",
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id
    }
  });

  await prisma.submission.upsert({
    where: {
      userId_restaurantId: {
        userId: user3.id,
        restaurantId: restaurants[1].id
      }
    },
    update: {
      reasons: ["Hygiene concerns"],
      rating: 1,
      comment: "Dining area was not clean.",
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id,
      deletedAt: null
    },
    create: {
      userId: user3.id,
      restaurantId: restaurants[1].id,
      reasons: ["Hygiene concerns"],
      rating: 1,
      comment: "Dining area was not clean.",
      status: SubmissionStatus.APPROVED,
      moderationPassed: true,
      approvedAt: new Date(),
      reviewerId: admin.id
    }
  });

  await prisma.submission.upsert({
    where: {
      userId_restaurantId: {
        userId: user1.id,
        restaurantId: restaurants[2].id
      }
    },
    update: {
      reasons: ["Poor food quality"],
      rating: 3,
      comment: "Noodles arrived overcooked.",
      status: SubmissionStatus.PENDING,
      moderationPassed: true,
      deletedAt: null,
      approvedAt: null,
      rejectedAt: null,
      reviewerId: null
    },
    create: {
      userId: user1.id,
      restaurantId: restaurants[2].id,
      reasons: ["Poor food quality"],
      rating: 3,
      comment: "Noodles arrived overcooked.",
      status: SubmissionStatus.PENDING,
      moderationPassed: true
    }
  });

  for (const restaurant of restaurants) {
    await recalculateRestaurantStats(restaurant.id);
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
