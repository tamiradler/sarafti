import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/api/auth/signin"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      const googleProfile = profile as { email_verified?: boolean } | undefined;
      return googleProfile?.email_verified !== false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shadowBanned = user.shadowBanned;
      }

      if (!token.id && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, shadowBanned: true }
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.shadowBanned = dbUser.shadowBanned;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.shadowBanned = token.shadowBanned;
      }

      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (user.email) {
        await prisma.user.update({
          where: { email: user.email },
          data: { emailVerified: new Date() }
        });
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
