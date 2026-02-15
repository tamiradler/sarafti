import { NextResponse } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AuthorizedUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  shadowBanned: boolean;
  emailVerified: Date | null;
};

type AuthResult =
  | { ok: true; user: AuthorizedUser }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function requireWriteUser(): Promise<AuthResult> {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 })
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      role: true,
      shadowBanned: true,
      emailVerified: true
    }
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found" }, { status: 404 })
    };
  }

  if (!user.emailVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Verified email required for write actions" },
        { status: 403 }
      )
    };
  }

  if (user.shadowBanned) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Account is restricted" }, { status: 403 })
    };
  }

  return { ok: true, user };
}

export async function requireAdminUser(): Promise<AuthResult> {
  const auth = await requireWriteUser();

  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Admin access required" }, { status: 403 })
    };
  }

  return auth;
}
