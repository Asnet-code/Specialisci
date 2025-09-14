import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 🔒 Admin guard
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!token || (token as any).role !== "ADMIN") {
      if (pathname.startsWith("/api/admin")) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      const target = req.nextUrl.pathname + req.nextUrl.search;
      loginUrl.searchParams.set("callbackUrl", target);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🚫 Zalogowany → nie może wejść na /login ani /register
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login", "/register"],
};
