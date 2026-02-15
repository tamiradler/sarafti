import { ModerationInputType } from "@prisma/client";
import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { ownerClaimSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getServerAuthSession();

  const limiter = checkRateLimit(getRequestIdentifier(), "owner-claim", {
    windowMs: 24 * 60 * 60 * 1000,
    limit: 5
  });

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many claims submitted" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = ownerClaimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const moderation = await moderateText(parsed.data.message);

  if (moderation.flagged) {
    await prisma.moderationLog.create({
      data: {
        userId: session?.user?.id,
        inputType: ModerationInputType.OWNER_CLAIM,
        content: parsed.data.message,
        flagged: true,
        model: moderation.model,
        categories: moderation.categories,
        providerResponse: moderation.response as object
      }
    });

    return NextResponse.json({ error: "Claim blocked by moderation" }, { status: 422 });
  }

  const claim = await prisma.ownerClaim.create({
    data: {
      restaurantId: parsed.data.restaurantId,
      requestedById: session?.user?.id,
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      relationship: parsed.data.relationship,
      message: parsed.data.message
    },
    select: {
      id: true
    }
  });

  await prisma.moderationLog.create({
    data: {
      userId: session?.user?.id,
      ownerClaimId: claim.id,
      inputType: ModerationInputType.OWNER_CLAIM,
      content: parsed.data.message,
      flagged: false,
      model: moderation.model,
      categories: moderation.categories,
      providerResponse: moderation.response as object
    }
  });

  return NextResponse.json({ message: "Claim submitted" }, { status: 201 });
}
