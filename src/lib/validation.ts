import { z } from "zod";

import { STRUCTURED_REASONS } from "@/lib/constants";

const reasonEnum = z.enum(STRUCTURED_REASONS);

export const submissionSchema = z.object({
  restaurantId: z.string().cuid(),
  reasons: z.array(reasonEnum).min(1, "Select at least one reason").max(6),
  otherReason: z.string().trim().max(120).optional().nullable(),
  comment: z.string().trim().max(200).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable()
});

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  cuisine: z.string().trim().min(2).max(60),
  address: z.string().trim().max(140).optional().nullable()
});

export const reportSchema = z.object({
  restaurantId: z.string().cuid().optional().nullable(),
  submissionId: z.string().cuid().optional().nullable(),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(200).optional().nullable()
});

export const ownerClaimSchema = z.object({
  restaurantId: z.string().cuid(),
  requesterName: z.string().trim().min(2).max(120),
  requesterEmail: z.string().trim().email(),
  relationship: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(500)
});

export const shadowBanSchema = z.object({
  shadowBanned: z.boolean()
});
