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

  if (!submission || submission.deletedAt) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  await prisma.submission.update({
    where: { id: params.id },
    data: {
      status: SubmissionStatus.REJECTED,
      rejectedAt: new Date(),
      approvedAt: null,
      reviewerId: auth.user.id
    }
  });

  if (submission.status === SubmissionStatus.APPROVED) {
    await recalculateRestaurantStats(submission.restaurantId);
  }

  return NextResponse.json({ message: "Submission rejected" });
}
