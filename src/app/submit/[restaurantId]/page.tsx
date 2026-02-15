import { redirect } from "next/navigation";

import { SubmissionForm } from "@/components/forms/submission-form";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubmitPage({ params }: { params: { restaurantId: string } }) {
  const session = await getServerAuthSession();
  if (!session?.user?.email) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/submit/${params.restaurantId}`)}`);
  }

  const [restaurant, user] = await Promise.all([
    prisma.restaurant.findFirst({
      where: { id: params.restaurantId, softDeleted: false },
      select: { id: true, name: true }
    }),
    prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, emailVerified: true }
    })
  ]);

  if (!restaurant) {
    redirect("/");
  }

  if (!user?.emailVerified) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
        Verified email is required before writing to Sarafti.
      </div>
    );
  }

  const existing = await prisma.submission.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId: params.restaurantId
      }
    },
    select: {
      reasons: true,
      otherReason: true,
      comment: true,
      rating: true,
      status: true
    }
  });

  return (
    <SubmissionForm
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      existing={
        existing
          ? {
              reasons: existing.reasons,
              otherReason: existing.otherReason,
              comment: existing.comment,
              rating: existing.rating,
              status: existing.status
            }
          : null
      }
    />
  );
}
