"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

import { ThemeToggle } from "@/components/theme-toggle";

function NavButton({
  children,
  onClick,
  variant = "default"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        variant === "accent"
          ? "border-accent bg-accent text-white hover:opacity-90"
          : "border-border bg-surface hover:bg-[color-mix(in_srgb,var(--surface)_70%,var(--accent)_30%)]"
      }`}
    >
      {children}
    </button>
  );
}

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Sarafti
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted md:flex">
            <Link href="/" className="hover:text-text">
              Browse
            </Link>
            <Link href="/restaurants/new" className="hover:text-text">
              Add Restaurant
            </Link>
            <Link href="/owner-claim" className="hover:text-text">
              Owner Correction
            </Link>
            <Link href="/guidelines" className="hover:text-text">
              Guidelines
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user ? (
            <>
              {session.user.role === "ADMIN" ? (
                <Link href="/admin" className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm">
                  Admin
                </Link>
              ) : null}
              <NavButton onClick={() => signOut({ callbackUrl: "/" })}>Sign out</NavButton>
            </>
          ) : (
            <NavButton variant="accent" onClick={() => signIn("google")}>
              Sign in with Google
            </NavButton>
          )}
        </div>
      </div>
    </header>
  );
}
