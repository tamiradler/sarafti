import { NextResponse } from "next/server";

import { requireWriteUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { createRestaurantSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireWriteUser();
  if (!auth.ok) {
    return auth.response;
  }

  const limiter = checkRateLimit(`${auth.user.id}:${getRequestIdentifier()}`, "create-restaurant", {
    windowMs: 60 * 60 * 1000,
    limit: 10
  });

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = createRestaurantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.restaurant.findFirst({
    where: {
      softDeleted: false,
      name: { equals: parsed.data.name.trim(), mode: "insensitive" },
      city: { equals: parsed.data.city.trim(), mode: "insensitive" }
    },
    select: { id: true }
  });

  if (existing) {
    return NextResponse.json({ error: "Restaurant already exists", restaurantId: existing.id }, { status: 409 });
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name: parsed.data.name.trim(),
      city: parsed.data.city.trim(),
      cuisine: parsed.data.cuisine.trim(),
      address: parsed.data.address?.trim() || null,
      createdById: auth.user.id
    },
    select: {
      id: true,
      name: true,
      city: true
    }
  });

  return NextResponse.json({ message: "Restaurant created", restaurant }, { status: 201 });
}
