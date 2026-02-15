import { ModerationInputType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireWriteUser } from "@/lib/authz";
import { moderateText } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireWriteUser();
  if (!auth.ok) {
    return auth.response;
  }

  const limiter = checkRateLimit(`${auth.user.id}:${getRequestIdentifier()}`, "report-content", {
    windowMs: 60 * 60 * 1000,
    limit: 12
  });

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = reportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.restaurantId && !parsed.data.submissionId) {
    return NextResponse.json({ error: "restaurantId or submissionId is required" }, { status: 400 });
  }

  const textToModerate = [parsed.data.reason, parsed.data.details ?? ""].join("\n").trim();
  const moderation = await moderateText(textToModerate);

  if (moderation.flagged) {
    await prisma.moderationLog.create({
      data: {
        userId: auth.user.id,
        inputType: ModerationInputType.REPORT,
        content: textToModerate,
        flagged: true,
        model: moderation.model,
        categories: moderation.categories,
        providerResponse: moderation.response as object
      }
    });

    return NextResponse.json({ error: "Report blocked by moderation" }, { status: 422 });
  }

  const report = await prisma.report.create({
    data: {
      userId: auth.user.id,
      restaurantId: parsed.data.restaurantId ?? null,
      submissionId: parsed.data.submissionId ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null
    },
    select: { id: true }
  });

  await prisma.moderationLog.create({
    data: {
      userId: auth.user.id,
      reportId: report.id,
      inputType: ModerationInputType.REPORT,
      content: textToModerate,
      flagged: false,
      model: moderation.model,
      categories: moderation.categories,
      providerResponse: moderation.response as object
    }
  });

  return NextResponse.json({ message: "Report submitted" }, { status: 201 });
}
