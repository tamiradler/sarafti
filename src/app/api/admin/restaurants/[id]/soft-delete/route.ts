import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return auth.response;
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.id },
    select: { id: true }
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  await prisma.restaurant.update({
    where: { id: params.id },
    data: {
      softDeleted: true
    }
  });

  return NextResponse.json({ message: "Restaurant soft-deleted" });
}
