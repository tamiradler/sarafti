import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "USER" | "ADMIN";
      shadowBanned: boolean;
    };
  }

  interface User {
    role: "USER" | "ADMIN";
    shadowBanned: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    shadowBanned: boolean;
  }
}
