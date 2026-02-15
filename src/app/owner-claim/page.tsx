import { OwnerClaimForm } from "@/components/forms/owner-claim-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OwnerClaimPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { softDeleted: false },
    select: {
      id: true,
      name: true,
      city: true
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    take: 200
  });

  return <OwnerClaimForm restaurants={restaurants} />;
}
