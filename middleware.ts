import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Chroń sekcję admina
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Brak tokena lub brak roli ADMIN -> przekieruj na /login
    if (!token || (token as any).role !== "ADMIN") {
      // API: zwróć 401 zamiast redirectu
      if (pathname.startsWith("/api/admin")) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      const target = req.nextUrl.pathname + req.nextUrl.search;
      loginUrl.searchParams.set("callbackUrl", target);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
