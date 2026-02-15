import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { shadowBanSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminUser();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const parsed = shadowBanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { shadowBanned: parsed.data.shadowBanned }
  });

  return NextResponse.json({ message: "User updated" });
}
