import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export function parseFloatFromSearch(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
