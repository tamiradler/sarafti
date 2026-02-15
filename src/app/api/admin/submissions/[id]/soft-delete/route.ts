import { SubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { recalculateRestaurantStats } from "@/lib/score";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return auth.response;
  }

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      restaurantId: true,
      status: true,
      deletedAt: true
    }
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  await prisma.submission.update({
    where: { id: params.id },
    data: {
      deletedAt: new Date(),
      status: SubmissionStatus.REJECTED,
      reviewerId: auth.user.id,
      rejectedAt: new Date(),
      approvedAt: null
    }
  });

  if (submission.status === SubmissionStatus.APPROVED && !submission.deletedAt) {
    await recalculateRestaurantStats(submission.restaurantId);
  }

  return NextResponse.json({ message: "Submission soft-deleted" });
}
