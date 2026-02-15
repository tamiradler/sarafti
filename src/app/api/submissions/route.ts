import { SubmissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireWriteUser } from "@/lib/authz";
import { moderateText } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { getRequestIdentifier, checkRateLimit } from "@/lib/rate-limit";
import { submissionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireWriteUser();
  if (!auth.ok) {
    return auth.response;
  }

  const limiter = checkRateLimit(`${auth.user.id}:${getRequestIdentifier()}`, "submit-feedback", {
    windowMs: 60 * 60 * 1000,
    limit: 8
  });

  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later.", resetAt: limiter.resetAt },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.reasons.includes("Other") && !data.otherReason?.trim()) {
    return NextResponse.json({ error: "Provide details for Other" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: data.restaurantId, softDeleted: false },
    select: { id: true }
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const moderationInputs = [
    { type: "COMMENT" as const, content: data.comment?.trim() ?? "" },
    { type: "OTHER_REASON" as const, content: data.otherReason?.trim() ?? "" }
  ].filter((item) => item.content.length > 0);

  for (const input of moderationInputs) {
    const moderation = await moderateText(input.content);

    await prisma.moderationLog.create({
      data: {
        userId: auth.user.id,
        inputType: input.type,
        content: input.content,
        flagged: moderation.flagged,
        model: moderation.model,
        categories: moderation.categories,
        providerResponse: moderation.response as object
      }
    });

    if (moderation.flagged) {
      return NextResponse.json(
        { error: "Submission blocked by safety moderation. Please revise the text." },
        { status: 422 }
      );
    }
  }

  const payload = {
    reasons: data.reasons,
    otherReason: data.reasons.includes("Other") ? data.otherReason?.trim() ?? null : null,
    comment: data.comment?.trim() || null,
    rating: data.rating ?? null,
    status: SubmissionStatus.PENDING,
    moderationPassed: true,
    deletedAt: null,
    approvedAt: null,
    rejectedAt: null,
    reviewerId: null
  };

  const submission = await prisma.submission.upsert({
    where: {
      userId_restaurantId: {
        userId: auth.user.id,
        restaurantId: data.restaurantId
      }
    },
    create: {
      ...payload,
      userId: auth.user.id,
      restaurantId: data.restaurantId
    },
    update: payload,
    select: {
      id: true,
      status: true,
      updatedAt: true
    }
  });

  return NextResponse.json(
    {
      message: "Submission received and pending admin review",
      submission
    },
    { status: 200 }
  );
}

export async function DELETE(request: Request) {
  const auth = await requireWriteUser();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const restaurantId = typeof body.restaurantId === "string" ? body.restaurantId : "";

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  const existing = await prisma.submission.findUnique({
    where: {
      userId_restaurantId: {
        userId: auth.user.id,
        restaurantId
      }
    },
    select: {
      id: true,
      status: true
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  await prisma.submission.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      status: SubmissionStatus.REJECTED,
      rejectedAt: new Date()
    }
  });

  return NextResponse.json({ message: "Submission removed" });
}
