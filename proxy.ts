import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  return PUBLIC_PATHS.some((path) => pathname === path);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, {
    password:
      process.env.SESSION_SECRET || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    cookieName: "cv-builder-session",
  });

  if (!session.isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
