import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnApi = req.nextUrl.pathname.startsWith("/api");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthApi) return;

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isOnApi && !isAuthApi && !isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
