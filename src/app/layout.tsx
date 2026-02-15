import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";
import { DISCLAIMER_TEXT } from "@/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sarafti | Know before you dine.",
  description:
    "Sarafti is a neutral, community-driven trend platform for aggregated negative dining experiences."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
            <footer className="mt-16 border-t border-border/70 bg-surface/30">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
                <p>{DISCLAIMER_TEXT}</p>
                <div className="flex items-center gap-4">
                  <Link href="/terms" className="hover:text-text">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:text-text">
                    Privacy
                  </Link>
                  <Link href="/guidelines" className="hover:text-text">
                    Guidelines
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
