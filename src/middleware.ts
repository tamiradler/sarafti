export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/submit/:path*", "/restaurants/new", "/admin/:path*", "/report"]
};
